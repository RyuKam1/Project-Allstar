"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/UI/Icon";
import BracketView from "@/components/Tournament/BracketView";
import { useAuth } from "@/context/AuthContext";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import { tournamentService } from "@/services/tournamentService";
import {
  loadLocalCustomTeams,
  mergeTournamentWithLocalData,
} from "@/lib/localCustomTeamsStorage";
import styles from "@/app/tournaments/[id]/tournaments.module.css";

function isPanelFullscreen(panel) {
  if (!panel) return false;
  return document.fullscreenElement === panel;
}

export default function BracketPanel({
  tournament,
  isAdmin,
  onUpdateResult,
  onTournamentUpdated,
  hint,
  bracketOutdated = false,
  canReset = false,
}) {
  const { user } = useAuth();
  const { notify, confirm } = useNotificationCenter();
  const panelRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const activeFullscreen = isFullscreen || fallbackFullscreen;

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
    setFallbackFullscreen(false);
    setIsFullscreen(false);
  }, []);

  const enterFullscreen = useCallback(async () => {
    const panel = panelRef.current;
    if (!panel) return;

    if (panel.requestFullscreen) {
      try {
        await panel.requestFullscreen();
        return;
      } catch {
        /* fall through to overlay mode */
      }
    }

    setFallbackFullscreen(true);
    setIsFullscreen(true);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (activeFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [activeFullscreen, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const syncFullscreen = () => {
      const panel = panelRef.current;
      const native = isPanelFullscreen(panel);
      setIsFullscreen(native);
      if (!native) setFallbackFullscreen(false);
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (!activeFullscreen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        exitFullscreen();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    if (fallbackFullscreen) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeFullscreen, fallbackFullscreen, exitFullscreen]);

  const handleReset = async () => {
    if (!user || !canReset || resetBusy) return;

    const ok = await confirm(
      "Reset the entire bracket? All match results will be cleared, teams will be shuffled again, and you can edit the roster afterward.",
      {
        confirmLabel: "Reset bracket",
        cancelLabel: "Cancel",
      },
    );
    if (!ok) return;

    setResetBusy(true);
    try {
      const updated = await tournamentService.resetBracket(tournament.id, user, {
        localCustomTeams: loadLocalCustomTeams(tournament.id),
      });
      notify("Bracket reset. Record results again when you're ready.", "success");
      onTournamentUpdated?.(mergeTournamentWithLocalData(updated));
    } catch (err) {
      notify(err.message || "Could not reset bracket.", "error");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <section
      ref={panelRef}
      className={`glass-panel ${styles.bracketPanel} ${activeFullscreen ? styles.bracketPanelFullscreen : ""} ${fallbackFullscreen ? styles.bracketPanelOverlay : ""}`}
      aria-labelledby="bracket-heading"
    >
      <div className={styles.bracketHeader}>
        <div className={styles.bracketHeaderMain}>
          <h2 id="bracket-heading" className={styles.bracketTitle}>
            Bracket
          </h2>
          {!activeFullscreen && (
            <p className={styles.bracketHint}>
              {bracketOutdated
                ? "Team list changed — apply changes in the sidebar to refresh this bracket."
                : hint}
            </p>
          )}
          {activeFullscreen && (
            <p className={styles.bracketHint}>{tournament.name}</p>
          )}
        </div>
      </div>

      <div className={`${styles.bracketBody} ${activeFullscreen ? styles.bracketBodyFullscreen : ""}`}>
        <div className={styles.bracketToolbar}>
          {canReset ? (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={handleReset}
              disabled={resetBusy || bracketOutdated}
            >
              Reset bracket
            </button>
          ) : (
            <span className={styles.bracketToolbarSpacer} aria-hidden="true" />
          )}
          <button
            type="button"
            className={styles.fullscreenBtn}
            onClick={toggleFullscreen}
            aria-pressed={activeFullscreen}
            aria-label={activeFullscreen ? "Exit fullscreen bracket view" : "View bracket in fullscreen"}
          >
            <Icon
              name={activeFullscreen ? "minimize" : "expand"}
              size={16}
              className="icon-inline"
              aria-hidden="true"
            />
            {activeFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
        </div>
        <div className={styles.bracketBodyInner}>
          {bracketOutdated && !activeFullscreen && (
            <div className={styles.bracketStaleOverlay} aria-hidden="true" />
          )}
          <BracketView
            tournament={tournament}
            isAdmin={isAdmin && !bracketOutdated}
            onUpdateResult={onUpdateResult}
            overviewMode={activeFullscreen}
          />
        </div>
      </div>
    </section>
  );
}
