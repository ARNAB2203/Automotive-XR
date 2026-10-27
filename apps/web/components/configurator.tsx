"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, accessToken, signIn } from "@xr/ui";
import { money, type Vehicle, type Price } from "@xr/types";
import { api, TENANT } from "../lib/api";
import { VehicleViewer } from "./viewer";
export function Configurator({ vehicleId }: { vehicleId: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]),
    [selected, setSelected] = useState<Record<string, string>>({}),
    [price, setPrice] = useState<Price>(),
    [error, setError] = useState(""),
    [saveError, setSaveError] = useState(""),
    [share, setShare] = useState(""),
    [busy, setBusy] = useState(false),
    [environment, setEnvironment] = useState<"day" | "night" | "studio">(
      "studio",
    ),
    [camera, setCamera] = useState<"exterior" | "interior">("exterior");
  const [live, setLive] = useState(false);
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  useEffect(() => {
    Promise.all([
      api<Vehicle[]>("/public/" + TENANT + "/vehicles"),
      api<Record<string, string>>(
        "/public/" + TENANT + "/defaults/" + vehicleId,
      ),
    ])
      .then(([items, defaults]) => {
        setVehicles(items);
        let draft: Record<string, string> | undefined;
        try {
          const value = JSON.parse(
            sessionStorage.getItem("xr-draft:" + vehicleId) ?? "null",
          );
          const v = items.find((v) => v.id === vehicleId);
          if (
            value &&
            v &&
            ["paint", "wheels", "interior", "trim"].every(
              (category) =>
                typeof value[category] === "string" &&
                v.options.some(
                  (o) => o.category === category && o.code === value[category],
                ),
            )
          )
            draft = value;
        } catch {}
        setSelected(draft ?? defaults);
      })
      .catch((e) => setError(e.message));
  }, [vehicleId]);
  useEffect(() => {
    if (!vehicle) return;
    let cancelled = false;
    setPrice(undefined);
    setError("");
    setShare("");
    const timer = setTimeout(() => {
      api<Price>("/public/" + TENANT + "/pricing", {
        method: "POST",
        body: JSON.stringify({ vehicleId, options: Object.values(selected) }),
      })
        .then((p) => {
          if (!cancelled) setPrice(p);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [vehicle, vehicleId, selected]);
  useEffect(() => {
    if (Object.keys(selected).length === 4)
      sessionStorage.setItem("xr-draft:" + vehicleId, JSON.stringify(selected));
  }, [vehicleId, selected]);
  async function save() {
    setBusy(true);
    setSaveError("");
    try {
      const token = await accessToken();
      if (!token) {
        await signIn();
        return;
      }
      const result = await api<{ shareId: string }>("/configurations", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: JSON.stringify({ vehicleId, options: Object.values(selected) }),
      });
      setShare(window.location.origin + "/configuration/" + result.shareId);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!vehicle)
    return (
      <main className="wrap">
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : (
          <p className="loading">Preparing your configurator…</p>
        )}
      </main>
    );
  const paint =
    vehicle.options.find((o) => o.code === selected.paint)?.swatch ?? "#52635a";
  return (
    <main className="wrap">
      <div className="section-top">
        <div>
          <Link className="small muted" href="/vehicles">
            ← The collection
          </Link>
          <h2 style={{ marginTop: 16 }}>Make it unmistakably yours.</h2>
        </div>
        <span className="chip">Configuration studio</span>
      </div>
      <div className="config-layout">
        <div>
          <VehicleViewer
            adapter={live ? "pixel-streaming" : "fallback"}
            paintCode={selected.paint}
            paint={paint}
            wheels={selected.wheels ?? ""}
            interior={selected.interior ?? ""}
            environment={environment}
            camera={camera}
            onEnvironment={setEnvironment}
            onCamera={setCamera}
          />
          <div className="actions" style={{ marginTop: 15 }}>
            {process.env.NEXT_PUBLIC_STREAMING_ENABLED === "true" && (
              <button className="option" onClick={() => setLive((v) => !v)}>
                {live
                  ? "Use schematic preview"
                  : "Request live Unreal session →"}
              </button>
            )}
          </div>
          <p className="small muted" style={{ marginTop: 18 }}>
            Development demonstrator. Colours and materials are schematic; no
            licensed production vehicle asset is included.
          </p>
          <div className="feature-strip" style={{ marginTop: 25, padding: 28 }}>
            <h3>
              A closer connection.
              <br />A personal conversation.
            </h3>
            <div>
              <p>Let our studio help you find the right details.</p>
              <Link href="/contact" className="small">
                Request a quotation or test drive →
              </Link>
            </div>
          </div>
        </div>
        <aside className="side-panel">
          <div className="eyebrow">Your configuration</div>
          <h2 style={{ marginTop: 15 }}>{vehicle.name}</h2>
          <label className="field">
            Model
            <select
              value={vehicleId}
              onChange={(e) =>
                window.location.assign("/configure/" + e.target.value)
              }
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          {["paint", "wheels", "interior", "trim"].map((category, i) => (
            <section className="option-group" key={category}>
              <h3>
                <span>
                  0{i + 1} / {category.toUpperCase()}
                </span>
                <span className="muted">
                  {
                    vehicle.options.find((o) => o.code === selected[category])
                      ?.name
                  }
                </span>
              </h3>
              <div className="option-grid">
                {vehicle.options
                  .filter((o) => o.category === category)
                  .map((o) => (
                    <button
                      className="option"
                      aria-pressed={selected[category] === o.code}
                      key={o.code}
                      onClick={() =>
                        setSelected((s) => ({ ...s, [category]: o.code }))
                      }
                    >
                      {o.swatch && (
                        <span
                          className="swatch"
                          style={{ background: o.swatch }}
                        />
                      )}
                      {o.name}
                    </button>
                  ))}
              </div>
            </section>
          ))}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="price-row">
            <span className="small muted">
              Configured price
              <br />
              USD · indicative
            </span>
            <strong className="price" aria-live="polite">
              {price ? money(price.total, price.currency) : "—"}
            </strong>
          </div>
          <Button
            style={{ width: "100%" }}
            onClick={save}
            disabled={!price || busy}
          >
            {busy ? "Saving…" : "Save & share configuration →"}
          </Button>
          {saveError && (
            <p className="error" role="alert">
              {saveError}
            </p>
          )}
          {share && (
            <div className="success" role="status">
              Configuration saved.
              <br />
              <Link href={share}>Open shared configuration →</Link>
              <button
                className="option"
                style={{ marginTop: 10 }}
                onClick={() =>
                  navigator.clipboard
                    .writeText(share)
                    .catch(() =>
                      setSaveError(
                        "Could not copy. Open the share link and copy its address.",
                      ),
                    )
                }
              >
                Copy share link
              </button>
            </div>
          )}
          <p className="small muted" style={{ marginTop: 18 }}>
            Pricing and compatibility are checked by the server. Sign in to save
            your build.
          </p>
        </aside>
      </div>
    </main>
  );
}
