"use client";
import { useEffect, useState } from "react";
import { Button } from "@xr/ui";
import { api, TENANT } from "../lib/api";
export function LeadForm() {
  const [dealers, setDealers] = useState<
      { id: string; name: string; city: string }[]
    >([]),
    [type, setType] = useState("QUOTATION"),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<typeof dealers>("/public/" + TENANT + "/dealers")
      .then(setDealers)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const date = f.get("date") as string;
          const result = await api<{ id: string }>(
            "/public/" + TENANT + "/leads",
            {
              method: "POST",
              body: JSON.stringify({
                name: f.get("name"),
                email: f.get("email"),
                dealerId: f.get("dealer"),
                type,
                consent: f.get("consent") === "on",
                ...(date
                  ? {
                      preferredDate: new Date(date + "T12:00:00").toISOString(),
                    }
                  : {}),
              }),
            },
          );
          setSuccess("Your enquiry has been received. Reference " + result.id);
          form.reset();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        <label className="field">
          Your name
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            placeholder="Alex Morgan"
          />
        </label>
        <label className="field">
          Email address
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="alex@example.com"
          />
        </label>
      </div>
      <label className="field">
        How can we help?
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="QUOTATION">Request a quotation</option>
          <option value="TEST_DRIVE">Arrange a test drive</option>
        </select>
      </label>
      <div className="form-grid">
        <label className="field">
          Your studio
          <select name="dealer" required>
            <option value="">Choose a studio</option>
            {dealers.map((d) => (
              <option value={d.id} key={d.id}>
                {d.name} · {d.city}
              </option>
            ))}
          </select>
        </label>
        {type === "TEST_DRIVE" && (
          <label className="field">
            Preferred date
            <input
              type="date"
              name="date"
              required
              min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
            />
          </label>
        )}
      </div>
      <label
        className="small"
        style={{
          display: "flex",
          gap: 12,
          alignItems: "start",
          margin: "20px 0",
        }}
      >
        <input type="checkbox" name="consent" required />I agree to be contacted
        by the selected studio about this enquiry. This does not subscribe me to
        marketing.
      </label>
      <p className="small muted">
        We collect only your name, email, studio and enquiry preference. Contact
        the studio to request removal. Appointment availability will be
        confirmed by the studio.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success" role="status">
          {success}
        </p>
      )}
      <div className="actions">
        <Button disabled={busy || !dealers.length}>
          {busy ? "Sending…" : "Send your enquiry →"}
        </Button>
      </div>
    </form>
  );
}
