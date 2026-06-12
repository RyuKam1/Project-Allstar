"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { businessEventService } from "@/services/businessEventService";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import Icon from "@/components/UI/Icon";

function StatusPill({ status }) {
  const color =
    status === "published" ? "#34c759" : status === "cancelled" || status === "removed" ? "#e5484d" : "#f5a623";
  return (
    <span style={{ color, fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase" }}>{status}</span>
  );
}

export default function BusinessEventsManagerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { notify, confirm } = useNotificationCenter();
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    try {
      setEvents(await businessEventService.listMine());
    } catch (e) {
      notify(`Could not load events: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?redirect=/business/dashboard/events");
      return;
    }
    load();
  }, [user, loading, router]);

  const setStatus = async (id, status) => {
    try {
      await businessEventService.setStatus(id, status);
      notify(`Event ${status}.`, "success");
      load();
    } catch (e) {
      notify(`Error: ${e.message}`, "error");
    }
  };

  const remove = async (id) => {
    const ok = await confirm("Delete this event permanently?", { confirmLabel: "Delete", cancelLabel: "Cancel" });
    if (!ok) return;
    try {
      await businessEventService.remove(id);
      notify("Event deleted.", "success");
      load();
    } catch (e) {
      notify(`Error: ${e.message}`, "error");
    }
  };

  return (
    <main style={{ minHeight: "100dvh" }}>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, margin: 0 }}>Manage Events</h1>
            <p style={{ color: "var(--text-muted)", margin: "6px 0 0" }}>
              Create and publish events at venues you own and have verified.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/business/dashboard" className="btn-secondary">← Dashboard</Link>
            <Link href="/business/dashboard/events/new" className="btn-primary">+ New event</Link>
          </div>
        </div>

        {busy ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : events.length === 0 ? (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>No events yet.</p>
            <Link href="/business/dashboard/events/new" className="btn-primary">Create your first event</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {events.map((ev) => (
              <div key={ev.id} className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <strong>{ev.title}</strong>
                    <StatusPill status={ev.status} />
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "4px" }}>
                    <Icon name="location" size={13} className="icon-inline" /> {ev.venueName || "Venue"} · {ev.sport || "—"}
                    {ev.starts_at ? ` · ${new Date(ev.starts_at).toLocaleString()}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Link href={`/business/dashboard/events/${ev.id}/edit`} className="btn-secondary">Edit</Link>
                  {ev.status !== "published" && ev.status !== "removed" && (
                    <button type="button" className="btn-primary" onClick={() => setStatus(ev.id, "published")}>Publish</button>
                  )}
                  {ev.status === "published" && (
                    <button type="button" className="btn-secondary" onClick={() => setStatus(ev.id, "draft")}>Unpublish</button>
                  )}
                  {ev.status !== "cancelled" && ev.status !== "removed" && (
                    <button type="button" className="btn-secondary" onClick={() => setStatus(ev.id, "cancelled")}>Cancel</button>
                  )}
                  <button type="button" className="btn-secondary" onClick={() => remove(ev.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
