"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { notificationService } from "@/services/notificationService";

function timeAgo(iso) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    try {
      setItems(await notificationService.list());
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?redirect=/notifications");
      return;
    }
    load();
  }, [user, loading, router]);

  const markAll = async () => {
    await notificationService.markAllRead();
    load();
  };

  const open = async (n) => {
    if (!n.is_read) await notificationService.markRead(n.id);
    if (n.link) router.push(n.link);
    else load();
  };

  return (
    <main style={{ minHeight: "100dvh" }}>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "60px", maxWidth: "720px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, margin: 0 }}>Notifications</h1>
          <button type="button" className="btn-secondary" onClick={markAll}>Mark all read</button>
        </div>

        {busy ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : items.length === 0 ? (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            You&apos;re all caught up.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => open(n)}
                className="glass-panel"
                style={{
                  padding: "16px 18px",
                  textAlign: "left",
                  border: n.is_read ? "1px solid var(--border-glass)" : "1px solid var(--color-primary)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <strong>{n.title}</strong>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: "0.92rem" }}>{n.body}</p>}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: "24px" }}>
          <Link href="/" className="btn-secondary">← Home</Link>
        </div>
      </div>
    </main>
  );
}
