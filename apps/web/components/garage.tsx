"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { accessToken, signIn, Button } from "@xr/ui";
import { money } from "@xr/types";
import { api } from "../lib/api";
import { Car } from "./car";
export function Garage() {
  const [items, setItems] = useState<any[]>(),
    [error, setError] = useState(""),
    [needsLogin, setNeedsLogin] = useState(false);
  useEffect(() => {
    accessToken()
      .then(async (token) => {
        if (!token) {
          setNeedsLogin(true);
          return;
        }
        setItems(
          await api<any[]>("/configurations", {
            headers: { Authorization: "Bearer " + token },
          }),
        );
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      {needsLogin ? (
        <div className="empty">
          <h3>A home for your ideas.</h3>
          <p>Sign in to retrieve your saved configurations.</p>
          <div className="actions">
            <Button onClick={() => signIn().catch((e) => setError(e.message))}>
              Sign in →
            </Button>
          </div>
        </div>
      ) : !items && !error ? (
        <p className="loading">Opening your garage…</p>
      ) : items?.length === 0 ? (
        <p className="empty">
          Your garage is ready for your first configuration.{" "}
          <Link href="/vehicles">Explore the collection →</Link>
        </p>
      ) : (
        <div className="cards">
          {items?.map((c) => (
            <article className="card" key={c.id}>
              <Car />
              <div className="card-body">
                <h3>{c.vehicle.name}</h3>
                <p>
                  {money(c.total, c.currency)} · saved{" "}
                  {new Date(c.createdAt).toLocaleDateString()}
                </p>
                <Link className="pill" href={"/configuration/" + c.shareId}>
                  View configuration →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
