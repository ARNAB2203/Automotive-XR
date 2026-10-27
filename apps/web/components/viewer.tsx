"use client";
import { useState, useEffect, useRef } from "react";
import { accessToken } from "@xr/ui";
import { StreamingClient } from "@xr/streaming-client";
import { api } from "../lib/api";
import { Car } from "./car";
export interface ViewerProps {
  paint: string;
  paintCode?: string;
  wheels: string;
  interior: string;
  environment: "day" | "night" | "studio";
  camera: "exterior" | "interior";
  onEnvironment: (e: "day" | "night" | "studio") => void;
  onCamera: (c: "exterior" | "interior") => void;
}
export function FallbackViewer(props: ViewerProps) {
  const [angle, setAngle] = useState(0);
  const [zoom, setZoom] = useState(1);
  return (
    <div
      className={
        "viewer " +
        props.environment +
        (props.camera === "interior" ? " inter" : "")
      }
    >
      <div className="viewer-top">
        <span>SCHEMATIC PREVIEW</span>
        <span>PLACEHOLDER · NOT UNREAL RENDERING</span>
      </div>
      <div className="viewer-stage">
        {props.camera === "interior" ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <svg
              width="240"
              height="160"
              viewBox="0 0 240 160"
              role="img"
              aria-label="Schematic cabin placeholder"
            >
              <path
                d="M15 120L30 30Q120 0 210 30L225 120Z"
                fill={props.interior.includes("tan") ? "#a6774a" : "#39483b"}
              />
              <path d="M30 40Q120 15 210 40L190 68H50Z" fill="#a9b8ac" />
              <circle
                cx="78"
                cy="98"
                r="28"
                stroke="#17251c"
                strokeWidth="9"
                fill="none"
              />
              <path d="M113 72H166V101H113Z" fill="#17251c" />
            </svg>
            <p className="small">
              {props.interior.includes("tan")
                ? "Saddle leather"
                : "Charcoal textile"}{" "}
              · schematic cabin
            </p>
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              transform: `scale(${zoom}) rotateY(${angle}deg)`,
              transition: "transform .4s",
            }}
          >
            <Car paint={props.paint} sport={props.wheels.includes("sport")} />
          </div>
        )}
      </div>
      <div className="viewer-controls">
        <button
          onClick={() => setAngle((a) => (a + 45) % 360)}
          aria-label="Rotate schematic preview"
        >
          Rotate ↻
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
          aria-label="Zoom in"
        >
          ＋
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
          aria-label="Zoom out"
        >
          −
        </button>
        {(["exterior", "interior"] as const).map((c) => (
          <button
            key={c}
            aria-pressed={props.camera === c}
            onClick={() => props.onCamera(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="viewer-controls" style={{ paddingTop: 0 }}>
        {(["day", "night", "studio"] as const).map((e) => (
          <button
            key={e}
            aria-pressed={props.environment === e}
            onClick={() => props.onEnvironment(e)}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
export function PixelStreamingViewer(props: ViewerProps) {
  const parent = useRef<HTMLDivElement>(null),
    client = useRef<StreamingClient | undefined>(undefined);
  const [status, setStatus] = useState("Requesting a secure session…"),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false,
      sessionId: string | undefined,
      heartbeat: ReturnType<typeof setInterval> | undefined,
      timeout: ReturnType<typeof setTimeout> | undefined;
    let bearer: string | undefined;
    async function start() {
      try {
        bearer = await accessToken();
        if (!bearer)
          throw new Error("Sign in before requesting a live viewer.");
        const session = await api<{
          id: string;
          signalingUrl: string;
          token: string;
        }>("/streaming/sessions", {
          method: "POST",
          headers: { Authorization: "Bearer " + bearer },
          body: "{}",
        });
        sessionId = session.id;
        if (cancelled) {
          await api("/streaming/sessions/" + sessionId, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + bearer },
          });
          return;
        }
        client.current = new StreamingClient(setStatus, (event) => {
          if (event.type === "VIEWER_READY") {
            setReady(true);
            setStatus("Live Unreal session");
            clearTimeout(timeout);
          }
          if (event.type === "VIEWER_ERROR")
            setError(event.payload.message ?? "Unreal error");
        });
        await client.current.connect(
          parent.current!,
          session.signalingUrl,
          session.token,
        );
        timeout = setTimeout(
          () =>
            setError(
              "The Unreal scene did not become ready. Reconnect or use the schematic preview.",
            ),
          30000,
        );
        heartbeat = setInterval(() => {
          api("/streaming/sessions/" + sessionId + "/heartbeat", {
            method: "POST",
            headers: { Authorization: "Bearer " + bearer },
            body: "{}",
          }).catch((e) => {
            setError(e.message);
            client.current?.disconnect();
            clearInterval(heartbeat);
          });
        }, 20000);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    void start();
    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      clearTimeout(timeout);
      client.current?.disconnect();
      if (sessionId && bearer)
        void api("/streaming/sessions/" + sessionId, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + bearer },
        }).catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const stream = client.current;
    if (!stream) return;
    void Promise.all([
      stream.send({
        type: "SET_PAINT",
        payload: { code: props.paintCode ?? "" },
      }),
      stream.send({ type: "SET_WHEELS", payload: { code: props.wheels } }),
      stream.send({ type: "SET_INTERIOR", payload: { code: props.interior } }),
      stream.send({ type: "SET_CAMERA", payload: { preset: props.camera } }),
      stream.send({
        type: "SET_ENVIRONMENT",
        payload: { preset: props.environment },
      }),
    ]).catch((e) => setError(e.message));
  }, [
    ready,
    props.paintCode,
    props.wheels,
    props.interior,
    props.camera,
    props.environment,
  ]);
  return (
    <div className="viewer">
      <div className="viewer-top" role="status">
        {status}
      </div>
      <div
        ref={parent}
        style={{ height: 400, width: "100%", position: "relative" }}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function VehicleViewer({
  adapter = "fallback",
  ...props
}: ViewerProps & { adapter?: "fallback" | "pixel-streaming" }) {
  return adapter === "pixel-streaming" ? (
    <PixelStreamingViewer {...props} />
  ) : (
    <FallbackViewer {...props} />
  );
}
