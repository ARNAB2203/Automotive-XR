import { api, TENANT } from "../../../lib/api";
import type { Vehicle } from "@xr/types";
import { Car } from "../../../components/car";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let v: Vehicle;
  try {
    v = await api<Vehicle>(
      "/public/" + TENANT + "/vehicles/" + encodeURIComponent(slug),
    );
  } catch {
    return (
      <main className="wrap">
        <h1>Vehicle unavailable</h1>
        <p className="error">
          We could not load this vehicle. Please return to the collection and
          try again.
        </p>
        <Link href="/vehicles">Back to collection →</Link>
      </main>
    );
  }
  return (
    <main className="wrap">
      <div className="hero">
        <div>
          <div className="eyebrow">The grand touring collection</div>
          <h1 style={{ margin: "24px 0" }}>{v.name}</h1>
          <p className="muted">{v.description}</p>
          <div className="actions">
            <Link className="pill" href={"/configure/" + v.id}>
              Create your configuration →
            </Link>
            <Link href="/contact" className="small">
              Speak to a studio →
            </Link>
          </div>
        </div>
        <div className="scene-card">
          <Car />
          <span className="scene-note">
            Schematic concept · not Unreal rendering
          </span>
        </div>
      </div>
    </main>
  );
}
