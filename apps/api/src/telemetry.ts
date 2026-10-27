import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import * as Sentry from "@sentry/node";
let sdk: NodeSDK | undefined;
if (process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
  sdk = new NodeSDK({
    serviceName: "automotive-xr-api",
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    }),
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) => !!req.url?.includes("/shared/"),
        ignoreOutgoingRequestHook: (req) => !!req.path?.includes("token="),
      }),
    ],
  });
  sdk.start();
  process.once("SIGTERM", () => {
    void sdk?.shutdown();
  });
}
if (process.env.SENTRY_DSN)
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    beforeSend(event) {
      delete event.request;
      delete event.user;
      delete event.breadcrumbs;
      return event;
    },
  });
export function captureError(error: unknown) {
  if (process.env.SENTRY_DSN)
    Sentry.captureException(
      error instanceof Error
        ? new Error(error.name)
        : new Error("Internal request failure"),
    );
}
