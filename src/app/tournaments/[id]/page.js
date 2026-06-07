"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import BracketView from "@/components/Tournament/BracketView";
import Icon from "@/components/UI/Icon";
import { tournamentService } from "@/services/tournamentService";
import { useAuth } from "@/context/AuthContext";
import { useParams } from 'next/navigation';
import {
  Breadcrumbs,
  Tag,
  EmptyState,
  Skeleton,
} from '@/components/UI/primitives';
import styles from './tournaments.module.css';

function getChampion(tournament) {
  if (!tournament?.matches?.length) return null;
  const maxRound = Math.max(...tournament.matches.map((m) => m.round));
  const finals = tournament.matches.filter((m) => m.round === maxRound);
  const decided = finals.find((m) => m.winner);
  if (decided?.winner) return decided.winner;

  const withWinnerId = finals.find((m) => m.winner_id);
  if (!withWinnerId) return null;

  return [withWinnerId.team1, withWinnerId.team2].find((t) => t?.id === withWinnerId.winner_id) || null;
}

function SkeletonTournamentDetail() {
  return (
    <div className={`container ${styles.pageContainer}`}>
      <Skeleton width="35%" height={14} style={{ marginBottom: "1.25rem" }} />
      <Skeleton width="60%" height={48} style={{ marginBottom: "0.75rem", maxWidth: "520px", margin: "0 auto 0.75rem" }} />
      <Skeleton width="30%" height={18} style={{ marginBottom: "2.5rem", maxWidth: "220px", margin: "0 auto 2.5rem" }} />
      <div className={`glass-panel ${styles.bracketContainer}`}>
        <div className={styles.skeletonBracket}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skeletonRound}>
              <Skeleton width={80} height={14} style={{ marginBottom: "1rem" }} />
              <Skeleton height={88} style={{ marginBottom: "1.5rem", borderRadius: "12px" }} />
              <Skeleton height={88} style={{ borderRadius: "12px" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TournamentDetails() {
  const params = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadTour() {
    setLoading(true);
    try {
      const data = await tournamentService.getTournament(params.id);
      setTournament(data || null);
    } catch (error) {
      console.error("Failed to load tournament", error);
      setTournament(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.id) loadTour();
  }, [params?.id]);

  const handleUpdate = async (matchId, result) => {
    await tournamentService.updateMatch(tournament.id, matchId, result);
    const updated = await tournamentService.getTournament(params.id);
    setTournament(updated);
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <Navbar />
        <SkeletonTournamentDetail />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className={styles.main}>
        <Navbar />
        <div className={`container ${styles.notFoundWrap}`}>
          <EmptyState
            icon="trophy"
            title="Tournament not found"
            description="This bracket may have been removed or the link is incorrect."
            actionLabel="Browse tournaments"
            actionHref="/tournaments"
          />
        </div>
      </main>
    );
  }

  const isAdmin = user && user.id === tournament.creator_id;
  const teamCount = tournament.teams?.length ?? 0;
  const champion = getChampion(tournament);

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={`container ${styles.pageContainer}`}>
        <header className={styles.header}>
          <Breadcrumbs
            items={[
              { label: "Tournaments", href: "/tournaments" },
              { label: tournament.name },
            ]}
          />
          <Tag className={styles.sportTag}>{tournament.sport}</Tag>
          <h1 className={styles.title}>{tournament.name}</h1>
          <p className={styles.subtitle}>
            {teamCount} {teamCount === 1 ? 'team' : 'teams'} · {tournament.status || 'Active'}
          </p>

          {champion && (
            <div className={`glass-panel ticket-card ${styles.winnerCard}`}>
              <Icon name="trophy" size={22} className="icon-inline" aria-hidden="true" />
              <span className={styles.winnerLabel}>Champion</span>
              <span className={styles.winnerName}>{champion.name}</span>
            </div>
          )}
        </header>

        <div className={`glass-panel ticket-card ${styles.bracketContainer}`}>
          <BracketView tournament={tournament} isAdmin={isAdmin} onUpdateResult={handleUpdate} />
        </div>

        {isAdmin && !champion && (
          <p className={styles.adminTip}>
            <strong>Admin:</strong> Click Win on a match to advance a team to the next round.
          </p>
        )}
      </div>
    </main>
  );
}
