import { viewerMessageSchema, type ViewerMessage } from "@xr/types";
import { z } from "zod";
import type { PixelStreaming } from "@epicgames-ps/lib-pixelstreamingfrontend-ue5.5";
export const viewerEventSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    type: z.enum([
      "ACK",
      "VIEWER_READY",
      "VIEWER_ERROR",
      "CONFIGURATION_UPDATED",
    ]),
    payload: z.object({
      message: z.string().optional(),
      state: z.record(z.string()).optional(),
    }),
  })
  .strict();
export class StreamingClient {
  private stream?: PixelStreaming;
  private pending = new Map<
    string,
    {
      resolve: () => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  constructor(
    private onStatus: (status: string) => void,
    private onEvent: (event: z.infer<typeof viewerEventSchema>) => void,
  ) {}
  async connect(parent: HTMLElement, url: string, token: string) {
    const { Config, PixelStreaming } =
      await import("@epicgames-ps/lib-pixelstreamingfrontend-ue5.5");
    const endpoint = new URL(url);
    endpoint.searchParams.set("token", token);
    this.stream = new PixelStreaming(
      new Config({
        useUrlParams: false,
        initialSettings: {
          ss: endpoint.toString(),
          AutoConnect: false,
          AutoPlayVideo: true,
          StartVideoMuted: true,
        },
      }),
      { videoElementParent: parent },
    );
    this.stream.addEventListener("webRtcConnected", () =>
      this.onStatus("Connected; waiting for Unreal scene"),
    );
    this.stream.addEventListener("webRtcDisconnected", () =>
      this.onStatus("Disconnected. Reconnect to request a new session."),
    );
    this.stream.addEventListener("playStreamError", () =>
      this.onStatus("Video playback failed"),
    );
    this.stream.addResponseEventListener("automotive-xr", (raw) => {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        return this.onStatus("Invalid Unreal response");
      }
      const result = viewerEventSchema.safeParse(value);
      if (!result.success) return this.onStatus("Unsupported Unreal response");
      const event = result.data;
      const pending = this.pending.get(event.id);
      if (pending && (event.type === "ACK" || event.type === "VIEWER_ERROR")) {
        clearTimeout(pending.timer);
        this.pending.delete(event.id);
        if (event.type === "ACK") pending.resolve();
        else
          pending.reject(
            new Error(event.payload.message ?? "Unreal rejected command"),
          );
      }
      this.onEvent(event);
    });
    this.stream.connect();
    this.onStatus("Connecting to Unreal…");
  }
  send(command: ViewerMessage["command"]) {
    const message = viewerMessageSchema.parse({
      version: 1,
      id: crypto.randomUUID(),
      command,
    });
    return new Promise<void>((resolve, reject) => {
      if (!this.stream) return reject(new Error("Viewer is not connected"));
      const timer = setTimeout(() => {
        this.pending.delete(message.id);
        reject(new Error("Unreal acknowledgement timed out"));
      }, 5000);
      this.pending.set(message.id, { resolve, reject, timer });
      this.stream.emitUIInteraction(message);
    });
  }
  disconnect() {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Viewer disconnected"));
    }
    this.pending.clear();
    this.stream?.removeResponseEventListener("automotive-xr");
    this.stream?.disconnect();
    this.stream = undefined;
  }
}
