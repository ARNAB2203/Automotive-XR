terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}
provider "aws" { region = var.region }
variable "region" { type = string }
variable "asset_bucket_name" { type = string }
variable "tags" { type = map(string) }
resource "aws_s3_bucket" "assets" {
  bucket = var.asset_bucket_name
  tags   = var.tags
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration { status = "Enabled" }
}
data "aws_iam_policy_document" "tls_only" {
  statement {
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.assets.arn, "${aws_s3_bucket.assets.arn}/*"]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}
resource "aws_s3_bucket_policy" "tls_only" {
  bucket = aws_s3_bucket.assets.id
  policy = data.aws_iam_policy_document.tls_only.json
}
resource "aws_ecr_repository" "application" {
  for_each             = toset(["api", "web", "admin"])
  name                 = "automotive-xr/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  tags = var.tags
}
resource "aws_cloudwatch_log_group" "application" {
  for_each          = toset(["api", "web", "admin", "streaming"])
  name              = "/automotive-xr/${each.key}"
  retention_in_days = 30
  tags              = var.tags
}
output "asset_bucket" { value = aws_s3_bucket.assets.id }
output "image_repositories" { value = { for key, repository in aws_ecr_repository.application : key => repository.repository_url } }
