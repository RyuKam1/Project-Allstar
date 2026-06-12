"use client";
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNotificationCenter } from '@/components/UI/NotificationCenter';
import {
  getConsolationMatches,
  getMainBracketMatches,
} from '@/lib/tournamentConsolation';
import styles from './bracketView.module.css';

function getRoundLabel(roundNum, maxRound) {
  if (roundNum === maxRound) return 'Final';
  if (roundNum === maxRound - 1 && maxRound >= 2) return 'Semifinals';
  if (roundNum === maxRound - 2 && maxRound >= 3) return 'Quarterfinals';
  return `Round ${roundNum}`;
}

function getTeamInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function TeamMark({ team }) {
  if (!team) {
    return <span className={styles.teamMarkFallback} aria-hidden="true">?</span>;
  }
  if (team.logo) {
    return <img src={team.logo} alt="" className={styles.teamMark} />;
  }
  return (
    <span className={styles.teamMarkFallback} aria-hidden="true">
      {getTeamInitial(team.name)}
    </span>
  );
}

function compareMatchIdentifiers(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function buildRoundsFromMatches(matches = []) {
  const byRound = new Map();
  matches.forEach((match) => {
    const roundNum = Number(match.round);
    if (!Number.isFinite(roundNum)) return;
    if (!byRound.has(roundNum)) byRound.set(roundNum, []);
    byRound.get(roundNum).push(match);
  });

  return [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([roundNum, roundMatches]) => ({
      roundNum,
      matches: [...roundMatches].sort((a, b) =>
        compareMatchIdentifiers(a.match_identifier, b.match_identifier),
      ),
    }));
}

function BracketTrack({
  rounds,
  overviewMode,
  activeRound,
  onActiveRoundChange,
  roundLabelPrefix = '',
  isAdmin,
  onUpdateResult,
  hideRoundNav = false,
}) {
  if (rounds.length === 0) return null;

  const maxRound = Math.max(...rounds.map((r) => r.roundNum));
  const showAllRounds = overviewMode;

  return (
    <>
      {!showAllRounds && !hideRoundNav && (
        <div className={styles.roundNav} role="tablist" aria-label="Bracket rounds">
          {rounds.map(({ roundNum }) => (
            <button
              key={roundNum}
              type="button"
              role="tab"
              aria-selected={activeRound === roundNum}
              className={`${styles.roundTab} ${activeRound === roundNum ? styles.roundTabActive : ''}`}
              onClick={() => onActiveRoundChange(roundNum)}
            >
              {roundLabelPrefix}
              {getRoundLabel(roundNum, maxRound)}
            </button>
          ))}
        </div>
      )}

      <div
        className={`${styles.bracket} ${showAllRounds ? styles.bracketOverview : ''}`}
      >
        {rounds.map(({ roundNum, matches }) => (
          <div
            key={roundNum}
            className={`${styles.round} ${!showAllRounds && activeRound !== roundNum ? styles.roundHidden : ''}`}
            role="tabpanel"
            aria-label={`${roundLabelPrefix}${getRoundLabel(roundNum, maxRound)}`}
          >
            <h3 className={styles.roundTitle}>
              {roundLabelPrefix}
              {getRoundLabel(roundNum, maxRound)}
            </h3>
            <div className={styles.matchList}>
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  isAdmin={isAdmin}
                  onUpdate={(result) => onUpdateResult(match.id, result)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function BracketView({ tournament, onUpdateResult, isAdmin, overviewMode = false }) {
  const mainMatches = useMemo(
    () => getMainBracketMatches(tournament.matches),
    [tournament.matches],
  );
  const consolationMatches = useMemo(
    () => getConsolationMatches(tournament.matches),
    [tournament.matches],
  );

  const mainRounds = useMemo(() => buildRoundsFromMatches(mainMatches), [mainMatches]);
  const consolationRounds = useMemo(
    () => buildRoundsFromMatches(consolationMatches),
    [consolationMatches],
  );

  const [activeRound, setActiveRound] = useState(() => mainRounds[0]?.roundNum ?? 1);
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);

  useLayoutEffect(() => {
    if (!overviewMode) {
      setFitScale(1);
      return undefined;
    }

    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return undefined;

    const recalc = () => {
      const padding = 32;
      const availableWidth = viewport.clientWidth - padding;
      const availableHeight = viewport.clientHeight - padding;
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;

      if (!contentWidth || !contentHeight) {
        setFitScale(1);
        return;
      }

      const scale = Math.min(
        availableWidth / contentWidth,
        availableHeight / contentHeight,
        1
      );
      setFitScale(Number.isFinite(scale) && scale > 0 ? scale : 1);
    };

    recalc();

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(recalc)
      : null;

    observer?.observe(viewport);
    observer?.observe(content);
    window.addEventListener('resize', recalc);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [overviewMode, mainRounds, consolationRounds]);

  if (mainRounds.length === 0 && consolationRounds.length === 0) {
    return <p className={styles.emptyBracket}>No matches in this bracket yet.</p>;
  }

  const bracketContent = (
    <>
      <BracketTrack
        rounds={mainRounds}
        overviewMode={overviewMode}
        activeRound={activeRound}
        onActiveRoundChange={setActiveRound}
        isAdmin={isAdmin}
        onUpdateResult={onUpdateResult}
      />

      {consolationRounds.length > 0 && (
        <section className={styles.consolationSection} aria-label="Third place match">
          <h3 className={styles.consolationTitle}>3rd place match</h3>
          <p className={styles.consolationHint}>
            Semifinal losers meet here for bronze.
          </p>
          <BracketTrack
            rounds={consolationRounds}
            overviewMode={overviewMode}
            activeRound={consolationRounds[0]?.roundNum ?? 1}
            onActiveRoundChange={() => {}}
            roundLabelPrefix="Bronze · "
            isAdmin={isAdmin}
            onUpdateResult={onUpdateResult}
            hideRoundNav
          />
        </section>
      )}
    </>
  );

  return (
    <div className={`${styles.bracketShell} ${overviewMode ? styles.bracketShellOverview : ''}`}>
      {overviewMode ? (
        <div ref={viewportRef} className={styles.overviewViewport}>
          <div
            ref={contentRef}
            className={styles.overviewContent}
            style={{ transform: `scale(${fitScale})` }}
          >
            {bracketContent}
          </div>
        </div>
      ) : (
        bracketContent
      )}
    </div>
  );
}

function MatchCard({ match, isAdmin, onUpdate }) {
  const t1 = match.team1;
  const t2 = match.team2;
  const { confirm } = useNotificationCenter();

  const handleWin = async (team) => {
    if (!isAdmin || match.winner_id) return;
    const confirmWin = await confirm(`Declare ${team.name} as winner?`, {
      confirmLabel: "Declare winner",
      cancelLabel: "Cancel",
    });
    if (confirmWin) {
      onUpdate({ winnerId: team.id, score1: 0, score2: 0 });
    }
  };

  const renderSlot = (team, isWinner) => (
    <div className={`${styles.slot} ${isWinner ? styles.slotWinner : ''}`}>
      <div className={styles.slotRow}>
        <TeamMark team={team} />
        <div className={styles.slotMain}>
          <span className={`${styles.teamName} ${!team ? styles.teamTbd : ''}`}>
            {team ? team.name : 'TBD'}
          </span>
          {isWinner && <span className={styles.winnerBadge}>W</span>}
          {isAdmin && !match.winner_id && t1 && t2 && team && (
            <button type="button" onClick={() => handleWin(team)} className={styles.winButton}>
              Win
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`glass-panel ticket-card ${styles.matchCard}`}>
      {renderSlot(t1, match.winner_id === t1?.id)}
      <hr className={styles.slotDivider} />
      {renderSlot(t2, match.winner_id === t2?.id)}
    </div>
  );
}
