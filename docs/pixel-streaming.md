# Pixel Streaming

## Implemented boundary

`VehicleViewer` selects fallback or live adapters. The fallback is a labelled schematic, including a schematic cabin. It is not a 3D automotive asset or photorealistic Unreal rendering.

The live adapter uses Epic's `@epicgames-ps/lib-pixelstreamingfrontend-ue5.5` 1.3.0. It requests an authenticated session, connects to the returned signaling gateway with a short-lived token, waits for `VIEWER_READY`, sends validated commands and waits for acknowledgements. Heartbeats run every 20 seconds. Unmount releases the allocation. A disconnected viewer can be switched back to fallback, then requested again to reconnect.

The API reserves a capacity slot under a PostgreSQL advisory lock, enforcing a configured fixed GPU capacity across API processes. Idle expiry is 60 seconds; failed cleanup keeps capacity occupied rather than silently double-allocating a worker. Cleanup retries every 15 seconds. Bearer access tokens and session ownership are checked on API operations. HS256 gateway tokens expire after two minutes and contain tenant, subject and session claims.

`infrastructure/streaming/gateway.mjs` implements a fixed worker pool using Redis atomic allocation. It validates gateway tokens, session IDs and live leases before proxying signaling WebSockets to preconfigured Epic signaling servers. Lease renewal is independent of access token lifetime after a socket connects. The allocator API binds to loopback and requires a service bearer token. Public gateway port 7001 must be behind HTTPS/WSS ingress; never expose internal worker signaling ports. Requests and URLs containing session tokens must not be logged by proxies.

## Operator setup

1. Build the UE 5.5 scene described in [Unreal setup](unreal-setup.md), run a compatible Epic signaling server for each dedicated GPU worker, and verify a local session manually.
2. Export `GPU_WORKERS_JSON` as an object mapping stable worker names to private signaling URLs, `REDIS_URL`, `PUBLIC_GATEWAY_URL` (WSS ingress), and strong independently generated `ALLOCATOR_SERVICE_TOKEN` and `STREAM_SIGNING_KEY`. These are operator-provided values; none are committed.
3. Run `pnpm --filter @xr/streaming-gateway start` on the allocator/gateway machine. Set the API's `ALLOCATOR_URL`, matching service/signing keys, and `GPU_CAPACITY` no higher than healthy dedicated workers.
4. Enable `NEXT_PUBLIC_STREAMING_ENABLED=true` before building the customer app. Set CORS/ingress origins to the intended deployment.
5. Configure ICE servers in the Epic signaling service using the example shape. Use your own STUN/TURN hosts and short-lived TURN credentials. Open only necessary UDP/TCP media routes; validate from outside the worker network.
6. Bind the UE data channel as documented, reset visual state on new viewer attachment, and send `VIEWER_READY` only after scene and response bindings are ready.
7. Test token denial, no-capacity behavior, disconnect/reconnect, idle expiry, cleanup after process failures, TURN-only connectivity and two-tenant isolation with actual GPUs.

## Protocol v1

Commands use `{version:1,id:<UUID>,command:{type,payload}}`. Supported commands: `SET_PAINT`, `SET_WHEELS`, `SET_INTERIOR` (payload `{code}`), `SET_CAMERA` (`{preset: exterior|interior|front|rear}`), `SET_ENVIRONMENT` (`{preset: day|night|studio}`), and `RESET_CONFIGURATION` (`{}`). Events use `{version:1,id,type,payload}` where type is `ACK`, `CONFIGURATION_UPDATED`, `VIEWER_READY` or `VIEWER_ERROR`. Payload can contain a string state map and a message. ACK IDs match command IDs. Events are visual state only; the renderer cannot authorize a price.

## Limits

No real Unreal runtime, GPU, TURN or WebRTC media test has been performed. The tested Redis/WebSocket fixture verifies control-plane behavior only. There is no GPU autoscaling, worker health discovery, S3 asset ingestion or production session admission queue. Operators must remove unhealthy workers and reconcile orphaned allocations before restarting failed workloads. The current fixed pool requires exclusive dedicated signaling endpoints per worker. Session reconnect is explicit rather than transparent. A gateway lease can take up to five seconds to close an expired socket.
