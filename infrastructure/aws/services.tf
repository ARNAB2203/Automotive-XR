# HTTP workloads only. The separately operated GPU fleet is deliberately excluded.
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "certificate_arn" { type = string }
variable "domains" {
  type = object({ api = string, web = string, admin = string })
}
variable "images" {
  type = object({ api = string, web = string, admin = string })
  validation {
    condition     = alltrue([for image in values(var.images) : can(regex("@sha256:[a-f0-9]{64}$", image))])
    error_message = "Supply immutable image digests for all three applications."
  }
}
variable "database_url_secret_arn" { type = string }
variable "share_key_secret_arn" { type = string }
variable "oidc_issuer" { type = string }
variable "oidc_audience" { type = string }
variable "secrets_kms_key_arn" {
  type    = string
  default = null
}
locals {
  services = { api = 4000, web = 3000, admin = 3001 }
}
resource "aws_security_group" "load_balancer" {
  name_prefix = "automotive-xr-alb-"
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 3000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = var.tags
}
resource "aws_security_group" "tasks" {
  name_prefix = "automotive-xr-tasks-"
  vpc_id      = var.vpc_id
  dynamic "ingress" {
    for_each = local.services
    content {
      from_port       = ingress.value
      to_port         = ingress.value
      protocol        = "tcp"
      security_groups = [aws_security_group.load_balancer.id]
    }
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = var.tags
}
resource "aws_lb" "application" {
  name                       = "automotive-xr"
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.load_balancer.id]
  subnets                    = var.public_subnet_ids
  drop_invalid_header_fields = true
  enable_deletion_protection = true
  tags                       = var.tags
}
resource "aws_lb_target_group" "application" {
  for_each    = local.services
  name        = "automotive-xr-${each.key}"
  port        = each.value
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id
  health_check {
    path                = each.key == "api" ? "/ready" : "/"
    matcher             = "200"
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
  tags = var.tags
}
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.application.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      status_code  = "404"
      message_body = "Not found"
    }
  }
}
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.application.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
resource "aws_lb_listener_rule" "application" {
  for_each     = local.services
  listener_arn = aws_lb_listener.https.arn
  priority     = index(sort(keys(local.services)), each.key) + 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.application[each.key].arn
  }
  condition {
    host_header { values = [var.domains[each.key]] }
  }
}
resource "aws_ecs_cluster" "application" {
  name = "automotive-xr"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = var.tags
}
data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}
resource "aws_iam_role" "execution" {
  name_prefix        = "automotive-xr-execution-"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = var.tags
}
resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
data "aws_iam_policy_document" "secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.database_url_secret_arn, var.share_key_secret_arn]
  }
  dynamic "statement" {
    for_each = var.secrets_kms_key_arn == null ? [] : [var.secrets_kms_key_arn]
    content {
      actions   = ["kms:Decrypt"]
      resources = [statement.value]
    }
  }
}
resource "aws_iam_role_policy" "secrets" {
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.secrets.json
}
resource "aws_iam_role" "application" {
  for_each           = local.services
  name_prefix        = "automotive-xr-${each.key}-"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = var.tags
}
resource "aws_ecs_task_definition" "application" {
  for_each                 = local.services
  family                   = "automotive-xr-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.application[each.key].arn
  container_definitions = jsonencode([{
    name         = each.key
    image        = var.images[each.key]
    essential    = true
    user         = "1000"
    portMappings = [{ containerPort = each.value, protocol = "tcp" }]
    environment = concat([{ name = "NODE_ENV", value = "production" }], each.key == "api" ? [
      { name = "OIDC_ISSUER", value = var.oidc_issuer },
      { name = "OIDC_AUDIENCE", value = var.oidc_audience },
      { name = "CORS_ORIGINS", value = "https://${var.domains.web},https://${var.domains.admin}" }
    ] : [])
    secrets = each.key == "api" ? [
      { name = "DATABASE_URL", valueFrom = var.database_url_secret_arn },
      { name = "SHARE_SIGNING_KEY", valueFrom = var.share_key_secret_arn }
    ] : []
    linuxParameters = { capabilities = { drop = ["ALL"] } }
    logConfiguration = {
      logDriver = "awslogs"
      options   = { awslogs-group = aws_cloudwatch_log_group.application[each.key].name, awslogs-region = var.region, awslogs-stream-prefix = each.key }
    }
  }])
  tags = var.tags
}
resource "aws_ecs_service" "application" {
  for_each                          = local.services
  name                              = each.key
  cluster                           = aws_ecs_cluster.application.id
  task_definition                   = aws_ecs_task_definition.application[each.key].arn
  desired_count                     = 1
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = false
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.application[each.key].arn
    container_name   = each.key
    container_port   = each.value
  }
  depends_on = [aws_lb_listener_rule.application, aws_iam_role_policy_attachment.execution, aws_iam_role_policy.secrets]
  tags       = var.tags
}
output "load_balancer_dns" { value = aws_lb.application.dns_name }
output "application_security_group" { value = aws_security_group.tasks.id }
