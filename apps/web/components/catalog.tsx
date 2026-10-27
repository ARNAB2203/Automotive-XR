"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Vehicle } from "@xr/types";
import { api, TENANT } from "../lib/api";
import { Car } from "./car";
export function Catalog() {
  const [vehicles, setVehicles] = useState<Vehicle[]>();
  const [error, setError] = useState("");
  useEffect(() => {
    api<Vehicle[]>("/public/" + TENANT + "/vehicles")
      .then(setVehicles)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      {error ? (
        <p className="error" role="alert">
          {error}. Please try again shortly.
        </p>
      ) : !vehicles ? (
        <p className="loading" role="status">
          Loading the collection…
        </p>
      ) : vehicles.length === 0 ? (
        <p className="empty">The collection is being prepared.</p>
      ) : (
        <div className="cards">
          {vehicles.map((v) => (
            <article className="card" key={v.id}>
              <Link
                href={"/vehicles/" + v.slug}
                aria-label={"Explore " + v.name}
              >
                <Car />
              </Link>
              <div className="card-body">
                <div className="card-title">
                  <h3>{v.name}</h3>
                  <span className="chip">Concept</span>
                </div>
                <p>{v.description}</p>
                <div className="actions">
                  <Link className="pill" href={"/configure/" + v.id}>
                    Configure →
                  </Link>
                  <Link className="small" href={"/vehicles/" + v.slug}>
                    Discover more →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
