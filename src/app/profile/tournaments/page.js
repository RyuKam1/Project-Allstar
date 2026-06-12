"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { tournamentService } from "@/services/tournamentService";
import { clearLocalCustomTeams } from "@/lib/localCustomTeamsStorage";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import Icon from "@/components/UI/Icon";
import styles from "../profile.module.css";

export default function MyOfflineTournamentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { notify, confirm } = useNotificationCenter();
  const [tournaments, setTournaments] = useState([]);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    try {
      setTournaments(await tournamentService.listOfflineMine());
    } catch (e) {
      notify(`Could not load tournaments: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?redirect=/profile/tournaments");
      return;
    }
    load();
  }, [user, loading, router]);

  const remove = async (id) => {
    const ok = await confirm("Delete this offline tournament permanently?", {
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    try {
      await tournamentService.deleteTournament(id);
      clearLocalCustomTeams(id);
      notify("Tournament deleted.", "success");
      load();
    } catch (e) {
      notify(`Error: ${e.message}`, "error");
    }
  };

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={`container ${styles.container}`} style={{ paddingTop: "100px", paddingBottom: "60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, margin: 0 }}>
              My Offline Tournaments
            </h1>
            <p style={{ color: "var(--text-muted)", margin: "6px 0 0" }}>
              Friendly brackets you created — private to you, not listed on the public events page.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/profile" className="btn-secondary">← Profile</Link>
            <Link href="/events" className="btn-primary">+ Create offline tournament</Link>
          </div>
        </div>

        {busy ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : tournaments.length === 0 ? (
          <div className={`glass-panel ${styles.glassPanel}`} style={{ padding: "40px", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>
              No offline tournaments yet. Spin one up for friends or pickup groups.
            </p>
            <Link href="/events" className="btn-primary">Create offline tournament</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {tournaments.map((t) => (
              <div key={t.id} className={`glass-panel ${styles.glassPanel}`} style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                    }}
                  >
                    {t.cover_image_url ? (
                      <img src={t.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      (t.sport || "T").charAt(0)
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", marginBottom: 4 }}>{t.name}</strong>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                      <Icon name="trophy" size={13} className="icon-inline" /> {t.sport} · {t.status || "Active"}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#f5a623", fontWeight: 700, textTransform: "uppercase" }}>
                      Offline / Friendly
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Link href={`/tournaments/${t.id}`} className="btn-primary" style={{ flex: 1, textAlign: "center" }}>
                    Open bracket
                  </Link>
                  <button type="button" className="btn-secondary" onClick={() => remove(t.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
