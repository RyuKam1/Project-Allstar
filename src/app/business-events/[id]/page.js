"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Layout/Navbar";
import Icon from "@/components/UI/Icon";
import { businessEventService } from "@/services/businessEventService";
import EventReportButton from "@/components/Events/EventReportButton";
import { Modal, Tag } from "@/components/UI/primitives";

function formatPrice(cents) {
  if (cents == null) return "Free";
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function BusinessEventDetailPage() {
  const params = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmUrl, setConfirmUrl] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setEvent(await businessEventService.getById(params.id));
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh" }}>
        <Navbar />
        <div className="container" style={{ paddingTop: "120px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
      </main>
    );
  }

  if (!event || event.status !== "published") {
    return (
      <main style={{ minHeight: "100dvh" }}>
        <Navbar />
        <div className="container" style={{ paddingTop: "120px", textAlign: "center" }}>
          <h1>Event unavailable</h1>
          <p style={{ color: "var(--text-muted)" }}>This event is not published or no longer exists.</p>
        </div>
      </main>
    );
  }

  const isExternal = event.registration_url && /^https?:\/\//i.test(event.registration_url);

  return (
    <main style={{ minHeight: "100dvh" }}>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "60px", maxWidth: "760px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
          <Tag accent>{event.sport || "Event"}</Tag>
          <Tag>Verified Host</Tag>
          {event.event_type && <Tag>{event.event_type}</Tag>}
        </div>

        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, marginBottom: "8px" }}>{event.title}</h1>

        <div style={{ color: "var(--text-muted)", display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
          <span><Icon name="location" size={15} className="icon-inline" /> {event.venueName || "Venue"}</span>
          {event.starts_at && <span><Icon name="calendar" size={15} className="icon-inline" /> {new Date(event.starts_at).toLocaleString()}</span>}
          <span>{formatPrice(event.price_cents)}</span>
          {event.capacity != null && <span>{event.capacity} spots</span>}
        </div>

        {event.description && (
          <div className="glass-panel" style={{ padding: "24px", marginBottom: "24px", lineHeight: 1.7 }}>
            {event.description}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {event.registration_url && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => (isExternal ? setConfirmUrl(event.registration_url) : (window.location.href = event.registration_url))}
            >
              Register
            </button>
          )}
          <EventReportButton eventKind="business" eventId={event.id} />
        </div>
      </div>

      <Modal open={!!confirmUrl} title="Leaving Project AllStar" onClose={() => setConfirmUrl(null)}>
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          This registration link goes to an external site we don&apos;t control:
        </p>
        <p style={{ wordBreak: "break-all", fontWeight: 600 }}>{confirmUrl}</p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Only continue if you trust this destination. Never enter payment details unless you&apos;re sure it&apos;s legitimate.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
          <button type="button" className="btn-secondary" onClick={() => setConfirmUrl(null)}>Cancel</button>
          <a className="btn-primary" href={confirmUrl} target="_blank" rel="noopener noreferrer nofollow" onClick={() => setConfirmUrl(null)}>
            Continue
          </a>
        </div>
      </Modal>
    </main>
  );
}
