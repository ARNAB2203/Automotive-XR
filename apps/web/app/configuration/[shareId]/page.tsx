import { api } from "../../../lib/api";
import { money } from "@xr/types";
import { Car } from "../../../components/car";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  let c: any;
  try {
    c = await api(
      "/configurations/shared/" + encodeURIComponent((await params).shareId),
    );
  } catch {
    return (
      <main className="wrap">
        <h1>Configuration unavailable.</h1>
        <p className="error">
          This link is invalid or the configuration is no longer available.
        </p>
        <Link href="/vehicles">Explore the collection →</Link>
      </main>
    );
  }
  return (
    <main className="wrap">
      <div className="hero">
        <div>
          <div className="eyebrow">A personal configuration</div>
          <h1 style={{ margin: "20px 0" }}>{c.vehicle.name}</h1>
          <p>{c.options.join(" · ")}</p>
          <p className="price" style={{ marginTop: 25 }}>
            {money(c.total, c.currency)}
          </p>
          <p className="small muted">
            Saved price snapshot. Reconfigure for current pricing.
          </p>
          <div className="actions">
            <Link className="pill" href={"/vehicles/" + c.vehicle.slug}>
              Explore this vehicle →
            </Link>
            <Link href="/contact">Contact a studio →</Link>
          </div>
        </div>
        <div className="scene-card">
          <Car
            paint={
              c.options.includes("paint-copper")
                ? "#b46f46"
                : c.options.includes("paint-ivory")
                  ? "#e2ddd0"
                  : "#414946"
            }
            sport={c.options.includes("wheel-sport")}
          />
          <span className="scene-note">
            Schematic placeholder · not Unreal rendering
          </span>
        </div>
      </div>
    </main>
  );
}
