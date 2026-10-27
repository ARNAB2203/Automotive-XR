"use client";
import { useEffect, useState } from "react";
import { Button, accessToken, signIn, signOut } from "@xr/ui";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type Field = { name: string; label: string; type?: string; options?: string[] };
type Screen = {
  name: string;
  endpoint: string;
  fields?: Field[];
  method?: string;
  writeEndpoint?: string;
  editEndpoint?: string;
  deleteEndpoint?: string;
  description: string;
};
const screens: Screen[] = [
  {
    name: "Overview",
    endpoint: "analytics",
    description:
      "Live counts from your tenant. Visitor-to-lead conversion tracking is not yet enabled.",
  },
  {
    name: "Vehicles",
    editEndpoint: "vehicles/{id}",
    deleteEndpoint: "vehicles/{id}",
    endpoint: "vehicles",
    description: "Create, update or archive your vehicle catalog.",
    fields: [
      { name: "slug", label: "URL slug" },
      { name: "name", label: "Vehicle name" },
      { name: "description", label: "Description" },
    ],
  },
  {
    name: "Options",
    editEndpoint: "options/{id}",
    deleteEndpoint: "options/{id}",
    endpoint: "vehicles",
    writeEndpoint: "vehicles/{vehicleId}/options",
    description: "Upsert an option by its vehicle-specific code.",
    fields: [
      { name: "vehicleId", label: "Vehicle ID" },
      { name: "code", label: "Option code" },
      { name: "name", label: "Option name" },
      {
        name: "category",
        label: "Category",
        options: ["paint", "wheels", "interior", "trim"],
      },
      { name: "swatch", label: "Colour hex (optional)" },
    ],
  },
  {
    name: "Variants",
    editEndpoint: "variants/{id}",
    deleteEndpoint: "variants/{id}",
    endpoint: "vehicles",
    writeEndpoint: "vehicles/{vehicleId}/variants",
    description:
      "Create a named variant. Variant-specific pricing is not yet modeled.",
    fields: [
      { name: "vehicleId", label: "Vehicle ID" },
      { name: "name", label: "Variant name" },
    ],
  },
  {
    name: "Compatibility",
    editEndpoint: "rules/{id}",
    deleteEndpoint: "rules/{id}",
    endpoint: "vehicles",
    writeEndpoint: "vehicles/{vehicleId}/rules",
    description: "Exclude incompatible pairs of option codes.",
    fields: [
      { name: "vehicleId", label: "Vehicle ID" },
      { name: "optionCode", label: "First option code" },
      { name: "excludesCode", label: "Excluded option code" },
      { name: "message", label: "Customer-facing explanation" },
    ],
  },
  {
    name: "Price books",
    endpoint: "price-books",
    editEndpoint: "price-books/{id}",
    deleteEndpoint: "price-books/{id}",
    description:
      "Populate a book before activating it. Activation deactivates the previous book.",
    fields: [
      { name: "currency", label: "Currency", options: ["USD", "EUR", "INR"] },
      {
        name: "active",
        label: "Active",
        type: "boolean",
        options: ["false", "true"],
      },
    ],
  },
  {
    name: "Pricing",
    endpoint: "price-books",
    writeEndpoint: "price-books/{priceBookId}/entries",
    method: "PUT",
    description:
      "Amounts are integer minor units: 180000 means USD 1,800. The initial book is supplied by seed.",
    fields: [
      { name: "priceBookId", label: "Price book ID" },
      { name: "code", label: "Vehicle UUID or option code" },
      { name: "amount", label: "Amount in minor units", type: "number" },
    ],
  },
  {
    name: "Dealers",
    editEndpoint: "dealers/{id}",
    deleteEndpoint: "dealers/{id}",
    endpoint: "dealers",
    description: "Create studios that receive enquiries.",
    fields: [
      { name: "name", label: "Studio name" },
      { name: "city", label: "City" },
    ],
  },
  {
    name: "Leads",
    endpoint: "leads",
    description:
      "Consented customer enquiries. Access is restricted to sales and administrative roles.",
  },
  {
    name: "Configurations",
    endpoint: "configurations",
    description: "Saved configurations and their price snapshots.",
  },
  {
    name: "Sessions",
    endpoint: "sessions",
    description:
      "Streaming session records. No GPU connection is implied by a database record.",
  },
  {
    name: "Users & roles",
    endpoint: "users",
    method: "PUT",
    description: "Provision an existing OIDC subject and assign tenant roles.",
    fields: [
      { name: "subject", label: "OIDC subject" },
      { name: "email", label: "Email", type: "email" },
      {
        name: "roles",
        label: "Role",
        options: [
          "CUSTOMER",
          "SALES_REPRESENTATIVE",
          "DEALER_MANAGER",
          "TENANT_ADMIN",
          "PLATFORM_ADMIN",
        ],
      },
    ],
  },
  {
    name: "Audit log",
    endpoint: "audit",
    description:
      "Append-only application audit events. Production log retention and immutable export require deployment configuration.",
  },
  {
    name: "Tenants",
    editEndpoint: "tenants/{id}",
    deleteEndpoint: "tenants/{id}",
    endpoint: "tenants",
    description: "Platform administrators only.",
    fields: [
      { name: "slug", label: "Tenant slug" },
      { name: "name", label: "Tenant name" },
    ],
  },
];
function display(value: any) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
export default function Admin() {
  const [screen, setScreen] = useState(screens[0]),
    [data, setData] = useState<any>(),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [identity, setIdentity] = useState<any>(),
    [loading, setLoading] = useState(true),
    [edit, setEdit] = useState<any>(),
    [busy, setBusy] = useState(false);
  async function request(path: string, method = "GET", body?: unknown) {
    const token = await accessToken();
    if (!token) throw new Error("Sign in to your studio account to continue.");
    const r = await fetch(API + "/" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error?.message ?? "Request failed");
    return result;
  }
  async function load() {
    setLoading(true);
    setError("");
    try {
      setIdentity(await request("me"));
      setData(await request("admin/" + screen.endpoint));
    } catch (e) {
      setData(undefined);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setEdit(undefined);
    setNotice("");
    void load();
  }, [screen]);
  const rows = Array.isArray(data)
    ? ["Options", "Variants", "Compatibility"].includes(screen.name)
      ? data.flatMap(
          (v) =>
            v[
              screen.name === "Options"
                ? "options"
                : screen.name === "Variants"
                  ? "variants"
                  : "rules"
            ] ?? [],
        )
      : data
    : [];
  const columns = rows.length
    ? Object.keys(rows[0]).filter((k) => !["tenantId"].includes(k))
    : [];
  return (
    <>
      <header className="nav">
        <a className="brand" href="/">
          3KNOT<span>STUDIO / ADMIN</span>
        </a>
        <div className="navlinks">
          <span className="small muted">
            {identity ? identity.roles.join(" · ") : "Secure workspace"}
          </span>
          {identity ? (
            <button className="pill outline" onClick={() => signOut()}>
              Sign out →
            </button>
          ) : (
            <button
              className="pill"
              onClick={() => signIn().catch((e) => setError(e.message))}
            >
              Sign in →
            </button>
          )}
        </div>
      </header>
      <div className="admin-layout">
        <nav className="sidebar" aria-label="Administration">
          {screens.map((s) => (
            <button
              key={s.name}
              className={screen.name === s.name ? "active" : ""}
              onClick={() => setScreen(s)}
            >
              {s.name}
            </button>
          ))}
        </nav>
        <main className="admin-content">
          <div className="eyebrow">Studio workspace</div>
          <div className="section-top" style={{ marginTop: 20 }}>
            <div>
              <h1>{screen.name}</h1>
              <p
                className="muted small"
                style={{ marginTop: 16, maxWidth: 700 }}
              >
                {screen.description}
              </p>
            </div>
            <Button variant="outline" onClick={load}>
              Refresh ↻
            </Button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="success" role="status">
              {notice}
            </p>
          )}
          {loading ? (
            <p className="loading">Loading studio data…</p>
          ) : screen.name === "Overview" && data ? (
            <div className="stats">
              {Object.entries(data).map(([key, value]) => (
                <div key={key}>
                  <strong>{display(value)}</strong>
                  <small>{key}</small>
                </div>
              ))}
            </div>
          ) : (
            data && (
              <div className="table-wrap">
                {rows.length ? (
                  <table>
                    <thead>
                      <tr>
                        {columns.map((k) => (
                          <th key={k}>{k}</th>
                        ))}
                        {screen.editEndpoint && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.id ?? i}>
                          {columns.map((k) => (
                            <td key={k}>{display(row[k])}</td>
                          ))}
                          {screen.editEndpoint && (
                            <td>
                              <button
                                className="option"
                                onClick={() => setEdit(row)}
                              >
                                Edit
                              </button>
                              <button
                                className="option"
                                style={{ marginTop: 8 }}
                                onClick={async () => {
                                  setError("");
                                  try {
                                    await request(
                                      "admin/" +
                                        screen.deleteEndpoint!.replace(
                                          "{id}",
                                          row.id,
                                        ),
                                      "DELETE",
                                    );
                                    setNotice(
                                      screen.name === "Vehicles"
                                        ? "Vehicle archived."
                                        : "Record deleted.",
                                    );
                                    await load();
                                  } catch (e) {
                                    setError((e as Error).message);
                                  }
                                }}
                              >
                                {screen.name === "Vehicles"
                                  ? "Archive"
                                  : "Delete"}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="empty">No records yet.</p>
                )}
              </div>
            )
          )}
          {screen.fields && identity && (
            <form
              className="inline-form"
              key={screen.name + (edit?.id ?? "new")}
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                setNotice("");
                const f = new FormData(e.currentTarget);
                const body: Record<string, unknown> = {};
                let endpoint = edit
                  ? screen.editEndpoint!.replace("{id}", edit.id)
                  : (screen.writeEndpoint ?? screen.endpoint);
                for (const field of screen.fields ?? []) {
                  const value = String(f.get(field.name) ?? "");
                  if (edit && field.name === "vehicleId") continue;
                  if (endpoint.includes("{" + field.name + "}")) {
                    endpoint = endpoint.replace(
                      "{" + field.name + "}",
                      encodeURIComponent(value),
                    );
                    continue;
                  }
                  if (field.name === "swatch" && !value) continue;
                  body[field.name] =
                    field.type === "boolean"
                      ? value === "true"
                      : field.type === "number"
                        ? Number(value)
                        : field.name === "roles"
                          ? [value]
                          : value;
                }
                if (screen.name === "Vehicles")
                  body.active = edit ? edit.active : true;
                try {
                  await request(
                    "admin/" + endpoint,
                    edit ? "PUT" : (screen.method ?? "POST"),
                    body,
                  );
                  setNotice("Changes saved.");
                  setEdit(undefined);
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h3>
                {edit
                  ? "Edit record"
                  : "Add or update " + screen.name.toLowerCase()}
              </h3>
              <div className="form-grid">
                {screen.fields.map((field) => (
                  <label className="field" key={field.name}>
                    {field.label}
                    {field.options ? (
                      <select
                        name={field.name}
                        defaultValue={edit?.[field.name]}
                      >
                        {field.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name={field.name}
                        type={field.type ?? "text"}
                        required={field.name !== "swatch"}
                        defaultValue={edit?.[field.name] ?? ""}
                        min={field.type === "number" ? 0 : undefined}
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="actions">
                <Button disabled={busy}>
                  {busy ? "Saving…" : "Save changes →"}
                </Button>
                {edit && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setEdit(undefined)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}
        </main>
      </div>
    </>
  );
}
