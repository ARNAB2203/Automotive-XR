# Low-level design

## Data

UUID identifiers; tenant UUID included in scoped lookups and composite foreign keys. Vehicle options have unique codes within a vehicle. Each price book entry uses a code for a base vehicle or option and an integer amount in currency minor units. Saved configurations retain selected codes and a price snapshot; retrieval must reprice before an actual commercial quotation. Share links are bearer capabilities and must not expose customer identity.

## Request flow

1. Parse and validate request shape; reject unknown fields.
2. Resolve public tenant slug or verify bearer token and resolve subject membership.
3. Enforce route role policy and scope all Prisma predicates.
4. Load selected vehicle, its options/rules and active price book.
5. Reject duplicate selections, unknown options and excluded pairs; require one option per category.
6. Return authoritative price or persist configuration with audit event in a transaction.

## Concurrency and failure

Database writes affecting business state and audits use transactions. Streaming capacity allocation requires a serializable transaction or distributed lease; process-local counting is insufficient. Missing GPU allocator returns unavailable rather than fake connection credentials. OIDC verification fails closed if issuer or audience is absent. Error responses use `{error:{code,message}}`; internal details and lead PII must not appear in logs.

## Protocol

Version 1 envelope: `{version:1,id,type,payload}`. IDs correlate acknowledgements. Commands and events are allowlisted and payloads validated independently of envelope parsing. Web and Unreal should use the same conformance fixtures. Connection readiness is distinct from a session allocation response.
