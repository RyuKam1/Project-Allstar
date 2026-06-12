"use client";

import React, { useEffect, useState } from "react";
import { businessService } from "@/services/businessService";
import SportSelect from "@/components/Tournament/SportSelect";
import { DEFAULT_SPORT_LABEL, resolveSportSelection } from "@/lib/sportsCatalog";

const TYPES = ["Workshop", "Match", "Tournament", "Open Play", "Clinic", "League"];

function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

// Shared create/edit form for business events.
// onSubmit(payload, intendedStatus) — caller persists and navigates.
export default function EventWizard({ initial = null, submitting = false, onSubmit }) {
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [form, setForm] = useState({
    venueId: initial?.venue_id || "",
    title: initial?.title || "",
    sport: initial?.sport || DEFAULT_SPORT_LABEL,
    eventType: initial?.event_type || "Workshop",
    startsAt: toLocalInputValue(initial?.starts_at),
    endsAt: toLocalInputValue(initial?.ends_at),
    capacity: initial?.capacity ?? "",
    price: initial?.price_cents != null ? (initial.price_cents / 100).toString() : "",
    registrationUrl: initial?.registration_url || "",
  });

  const [customSport, setCustomSport] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const owned = await businessService.getOwnedVenues();
        // Only official (business) venues can host business events.
        setVenues((owned || []).filter((v) => v.isBusiness || v.type === "business"));
      } catch {
        setVenues([]);
      } finally {
        setLoadingVenues(false);
      }
    })();
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const buildPayload = () => ({
    venueId: form.venueId,
    title: form.title,
    sport: resolveSportSelection(form.sport, customSport),
    eventType: form.eventType,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    capacity: form.capacity,
    priceCents: form.price !== "" ? Math.round(Number(form.price) * 100) : null,
    registrationUrl: form.registrationUrl,
  });

  const isExternalUrl = form.registrationUrl && /^https?:\/\//i.test(form.registrationUrl.trim());

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--border-glass)",
    color: "inherit",
  };
  const labelStyle = { display: "block", fontSize: "0.85rem", marginBottom: "6px", color: "var(--text-muted)" };
  const groupStyle = { marginBottom: "18px" };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(buildPayload(), "draft");
      }}
    >
      <div style={groupStyle}>
        <label style={labelStyle} htmlFor="ev-venue">Venue (must be one you own &amp; have verified)</label>
        {loadingVenues ? (
          <p style={{ color: "var(--text-muted)" }}>Loading your venues…</p>
        ) : venues.length === 0 ? (
          <p style={{ color: "var(--color-danger, #e5484d)" }}>
            You have no verified venues yet. Claim or propose a venue first.
          </p>
        ) : (
          <select id="ev-venue" required value={form.venueId} onChange={(e) => update("venueId", e.target.value)} style={inputStyle}>
            <option value="">Select a venue…</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        )}
      </div>

      <div style={groupStyle}>
        <label style={labelStyle} htmlFor="ev-title">Title</label>
        <input id="ev-title" required value={form.title} onChange={(e) => update("title", e.target.value)} style={inputStyle} placeholder="e.g. Friday Night 3v3" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", ...groupStyle }}>
        <div>
          <label style={labelStyle} htmlFor="ev-sport">Sport</label>
          <SportSelect
            id="ev-sport"
            value={form.sport}
            customSport={customSport}
            onChange={(value) => update("sport", value)}
            onCustomSportChange={setCustomSport}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ev-type">Type</label>
          <select id="ev-type" value={form.eventType} onChange={(e) => update("eventType", e.target.value)} style={inputStyle}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", ...groupStyle }}>
        <div>
          <label style={labelStyle} htmlFor="ev-start">Starts</label>
          <input id="ev-start" type="datetime-local" value={form.startsAt} onChange={(e) => update("startsAt", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ev-end">Ends</label>
          <input id="ev-end" type="datetime-local" value={form.endsAt} onChange={(e) => update("endsAt", e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", ...groupStyle }}>
        <div>
          <label style={labelStyle} htmlFor="ev-cap">Capacity</label>
          <input id="ev-cap" type="number" min="0" value={form.capacity} onChange={(e) => update("capacity", e.target.value)} style={inputStyle} placeholder="e.g. 24" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ev-price">Price (per person)</label>
          <input id="ev-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} style={inputStyle} placeholder="0 for free" />
        </div>
      </div>

      <div style={groupStyle}>
        <label style={labelStyle} htmlFor="ev-url">Registration link (optional)</label>
        <input id="ev-url" type="url" value={form.registrationUrl} onChange={(e) => update("registrationUrl", e.target.value)} style={inputStyle} placeholder="https://…" />
        {isExternalUrl && (
          <p style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--color-warning, #f5a623)" }}>
            ⚠ This is an external link. Attendees will see a warning before leaving Project AllStar.
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
        <button
          type="button"
          className="btn-secondary"
          disabled={submitting || venues.length === 0}
          onClick={() => onSubmit(buildPayload(), "draft")}
        >
          Save draft
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={submitting || venues.length === 0}
          onClick={() => onSubmit(buildPayload(), "published")}
        >
          {submitting ? "Saving…" : "Publish event"}
        </button>
      </div>
    </form>
  );
}
