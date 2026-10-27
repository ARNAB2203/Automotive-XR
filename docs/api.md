# API

Live OpenAPI: API `/docs` and `/docs-json`. All protected routes accept `Authorization: Bearer <OIDC access token>`. JWT issuer/audience/expiry/signature are verified against issuer discovery; subject membership and roles come from PostgreSQL. Tokens require a `tenant_id` claim. No trusted tenant can be supplied in protected route bodies.

| Route                                                         | Access                  | Purpose                                                  |
| ------------------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| GET `/health`, `/ready`                                       | Public                  | Liveness and DB readiness                                |
| GET `/public/:tenant/vehicles`, `/vehicles/:slug`, `/dealers` | Public                  | Tenant catalog and dealers                               |
| POST `/public/:tenant/pricing`, `/validate`                   | Public                  | `{vehicleId,options:[code,...]}`; rejects client totals  |
| POST `/public/:tenant/leads`                                  | Public, rate limited    | `{dealerId,type,name,email,consent:true,preferredDate?}` |
| GET `/me`                                                     | Tenant member           | Current identity and DB roles                            |
| GET/POST `/configurations`                                    | Tenant member           | Own saved configurations / validated snapshot            |
| GET `/configurations/shared/:shareId`                         | Signed capability       | Share without owner identity                             |
| GET/POST `/admin/vehicles`                                    | Tenant/platform admin   | Catalog management                                       |
| PUT/DELETE `/admin/vehicles/:id`                              | Tenant/platform admin   | Update or archive                                        |
| POST `/admin/vehicles/:id/options`, `/variants`, `/rules`     | Tenant/platform admin   | Option upsert, variant/rule creation                     |
| GET `/admin/price-books`                                      | Tenant/platform admin   | Books and entries                                        |
| PUT `/admin/price-books/:id/entries`                          | Tenant/platform admin   | `{code,amount}` in minor units                           |
| GET/POST `/admin/dealers`                                     | Sales read, admin write | Dealer management                                        |
| GET `/admin/leads`, `/configurations`, `/analytics`           | Sales or admin          | Tenant CRM and counts                                    |
| GET/PUT `/admin/users`                                        | Tenant/platform admin   | Membership and role assignment                           |
| GET `/admin/audit`, `/sessions`                               | Tenant/platform admin   | Operational records                                      |
| GET/POST `/admin/tenants`                                     | Platform admin          | Tenant administration                                    |

Errors: `{error:{code,message}}`. Validation errors 400, missing credentials 401, insufficient role 403, not found 404, conflicts 409. Price results contain `valid`, `total`, `currency`, and line-item `breakdown`. Total is a development price snapshot, not a legally binding quote.

List endpoints are currently capped at 100 where applicable. Cursor pagination, transactional tenant provisioning and full OpenAPI request schemas remain hardening tasks.

Administrative management also provides PUT/DELETE `/admin/{options|variants|rules|dealers|price-books}/:id`, POST `/admin/price-books`, and platform-only PUT/DELETE `/admin/tenants/:id`. Option codes are immutable, referenced options require rule removal first, active price books cannot be deleted, and foreign keys prevent deletion of dealers/tenants with dependent records. Price-book activation is transactional. Public GET `/public/:tenant/defaults/:vehicleId` returns a validated default selection.
