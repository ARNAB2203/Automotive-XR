export const API =
  typeof window === "undefined"
    ? (process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:4000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");
export const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "3knot";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(API + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message ?? "Service unavailable");
  return data;
}
