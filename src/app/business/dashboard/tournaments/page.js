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

function isVerifiedBusiness(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "business") return true;
  return user.business_verification_status === "verified";
}

export default function BusinessTournamentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { notify, confirm } = useNotificationCenter();
  const [tournaments, setTournaments] = useState([]);
  const [busy, setBusy] = useState(true);
  const verified = isVerifiedBusiness(user);

  const load = async () => {
    setBusy(true);
    try {
      setTournaments(await tournamentService.listOfficialMine());
    } catch (e) {
      notify(`Could not load tournaments: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?redirect=/business/dashboard/tournaments");
      return;
    }
    load();
  }, [user, loading, router]);

  const remove = async (id) => {
    const ok = await confirm("Delete this official tournament permanently?", {
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
    <main style={{ minHeight: "100dvh" }}>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, margin: 0 }}>Official Tournaments</h1>
            <p style={{ color: "var(--text-muted)", margin: "6px 0 0" }}>
              Verified businesses run official brackets with registered teams only.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/business/dashboard" className="btn-secondary">← Dashboard</Link>
            {verified ? (
              <Link href="/business/dashboard/tournaments/new" className="btn-primary">+ New tournament</Link>
            ) : (
              <Link href="/business/onboarding" className="btn-secondary">Complete verification</Link>
            )}
          </div>
        </div>

        {!verified && (
          <div className="glass-panel" style={{ padding: "24px", marginBottom: "20px", borderColor: "rgba(245, 166, 35, 0.35)" }}>
            <strong>Verification required.</strong>{" "}
            Official tournaments are limited to verified business accounts. Finish onboarding to unlock creation.
          </div>
        )}

        {busy ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : tournaments.length === 0 ? (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>
              {verified ? "No official tournaments yet." : "Verify your business to create official tournaments."}
            </p>
            {verified ? (
              <Link href="/business/dashboard/tournaments/new" className="btn-primary">Create your first tournament</Link>
            ) : (
              <Link href="/business/onboarding" className="btn-primary">Start verification</Link>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {tournaments.map((t) => (
              <div key={t.id} className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <strong>{t.name}</strong>
                    <span style={{ color: "#34c759", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase" }}>Official</span>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "4px" }}>
                    <Icon name="trophy" size={13} className="icon-inline" /> {t.sport || "—"} · {t.status || "Active"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Link href={`/tournaments/${t.id}`} className="btn-secondary">View bracket</Link>
                  <button type="button" className="btn-secondary" onClick={() => remove(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
