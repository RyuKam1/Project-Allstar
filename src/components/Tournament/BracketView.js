"use client";
import React from 'react';
import { useNotificationCenter } from '@/components/UI/NotificationCenter';
import styles from './bracketView.module.css';

export default function BracketView({ tournament, onUpdateResult, isAdmin }) {
  const rounds = [];
  const matches = tournament.matches;

  matches.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });

  return (
    <div className={styles.bracket}>
      {rounds.map((roundMatches, rIdx) => {
        if (!roundMatches) return null;
        return (
          <div key={rIdx} className={styles.round}>
            <h3 className={styles.roundTitle}>
              {rIdx === rounds.length - 1 ? 'Final' : `Round ${rIdx + 1}`}
            </h3>
            {roundMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                isAdmin={isAdmin}
                onUpdate={(result) => onUpdateResult(match.id, result)}
              />
            ))}
          </div>
        );
      })}
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
        <span className={`${styles.teamName} ${!team ? styles.teamTbd : ''}`}>
          {team ? team.name : 'TBD'}
        </span>
        {isAdmin && !match.winner_id && t1 && t2 && team && (
          <button type="button" onClick={() => handleWin(team)} className={styles.winButton}>
            Win
          </button>
        )}
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
