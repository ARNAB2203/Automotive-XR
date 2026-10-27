"use client";
import { useEffect, useRef, useState } from "react";
import { finishSignIn } from "@xr/ui";
export default function Callback() {
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    finishSignIn().catch((e) => setError(e.message));
  }, []);
  return (
    <main className="wrap">
      <h1>{error ? "Sign-in unavailable" : "Completing sign-in…"}</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
