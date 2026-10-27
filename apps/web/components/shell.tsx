"use client";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "@xr/ui";
export function Nav() {
  const [error, setError] = useState("");
  return (
    <>
      <header className="nav">
        <Link href="/" className="brand">
          3KNOT<span>AUTOMOTIVE XR</span>
        </Link>
        <nav className="navlinks" aria-label="Main navigation">
          <Link href="/vehicles">Our vehicles</Link>
          <Link href="/showroom">Virtual showroom</Link>
          <Link href="/my-configurations">Your garage</Link>
          <button
            className="pill outline"
            onClick={() => signIn().catch((e) => setError(e.message))}
          >
            Sign in →
          </button>
        </nav>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} 3KNOT Automotive XR</span>
      <span>
        Designed around you. <Link href="/contact">Find your studio →</Link>
      </span>
    </footer>
  );
}
