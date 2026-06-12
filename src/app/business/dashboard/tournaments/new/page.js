"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { tournamentService } from "@/services/tournamentService";
import TeamPicker, { isValidBracketSize } from "@/components/Tournament/TeamPicker";
import { isOfficialBracketSize } from "@/lib/tournamentBracket";
import SportSelect from "@/components/Tournament/SportSelect";
import CoverImageField from "@/components/Tournament/CoverImageField";
import TournamentModePicker from "@/components/Tournament/TournamentModePicker";
import { BRACKET_MODES } from "@/lib/tournamentModes";
import { validateBracketRoster } from "@/lib/tournamentTeamRules";
import { uploadCompressedImage, compressImage } from "@/lib/imageOptimizer";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";

function isVerifiedBusiness(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "business") return true;
  return user.business_verification_status === "verified";
}

async function uploadTournamentCover(file) {
  if (!file) return null;
  const compressed = await compressImage(file, { maxSizeMB: 0.6, maxWidthOrHeight: 800 });
  const upload = await uploadCompressedImage(compressed, "allstar-assets", "tournament-covers");
  return upload?.publicUrl || null;
}

export default function NewOfficialTournamentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { notify } = useNotificationCenter();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("Basketball");
  const [customSport, setCustomSport] = useState("");
  const [bracket, setBracket] = useState({ teams: [], customNames: [] });
  const [bracketMode, setBracketMode] = useState(BRACKET_MODES.STANDARD);
  const [cover, setCover] = useState({ file: null, previewUrl: null });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?redirect=/business/dashboard/tournaments/new");
      return;
    }
    if (!isVerifiedBusiness(user)) {
      router.push("/business/onboarding");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      notify("Tournament name is required.", "warning");
      return;
    }

    const roster = validateBracketRoster({
      teams: bracket.teams,
      customNames: [],
      allowCustom: false,
    });

    if (!isValidBracketSize(bracket.teams.length) || !roster.ok) {
      notify(
        roster.errors[0] || "Pick 4, 8, or 16 unique registered teams for an official bracket.",
        "warning",
      );
      return;
    }

    setSubmitting(true);
    try {
      let coverImageUrl = null;
      if (cover.file) {
        coverImageUrl = await uploadTournamentCover(cover.file);
      }

      const created = await tournamentService.createOfficialTournament(
        {
          name,
          sport,
          customSport,
          teams: bracket.teams,
          coverImageUrl,
          bracketMode,
        },
        user,
      );
      notify("Official tournament created.", "success");
      router.push(`/tournaments/${created.id}`);
    } catch (err) {
      notify(`Could not create tournament: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid var(--border-glass)",
    color: "inherit",
  };
  const labelStyle = {
    display: "block",
    fontSize: "0.85rem",
    marginBottom: "6px",
    color: "var(--text-muted)",
  };

  const resolvedSport = sport === "__other__" ? customSport : sport;
  const bracketRosterCheck = validateBracketRoster({
    teams: bracket.teams,
    customNames: [],
    allowCustom: false,
  });
  const canCreateBracket =
    Boolean(name.trim()) &&
    isOfficialBracketSize(bracket.teams.length) &&
    bracketRosterCheck.ok;

  return (
    <main style={{ minHeight: "100dvh" }}>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "60px", maxWidth: "640px" }}>
        <div style={{ marginBottom: "24px" }}>
          <Link
            href="/business/dashboard/tournaments"
            className="btn-secondary"
            style={{ marginBottom: "16px", display: "inline-flex" }}
          >
            ← Back to tournaments
          </Link>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, margin: "0 0 8px" }}>
            Create Official Tournament
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Registered teams only — each name must be unique in the bracket. Published on the public events feed.
          </p>
        </div>

        <form className="glass-panel" style={{ padding: "24px" }} onSubmit={handleSubmit}>
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>Tournament name</label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Summer League Championship"
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>Cover image (optional)</label>
            <CoverImageField file={cover.file} previewUrl={cover.previewUrl} onChange={setCover} />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>Sport</label>
            <SportSelect
              value={sport}
              customSport={customSport}
              onChange={(next) => {
                setSport(next);
                setBracket({ teams: [], customNames: [] });
              }}
              onCustomSportChange={setCustomSport}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>Tournament format</label>
            <TournamentModePicker value={bracketMode} onChange={setBracketMode} />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>Registered teams</label>
            <TeamPicker
              sport={resolvedSport}
              value={bracket}
              onChange={setBracket}
              allowCustom={false}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={submitting || !canCreateBracket}>
            {submitting ? "Creating…" : "Create official bracket"}
          </button>
        </form>
      </div>
    </main>
  );
}
