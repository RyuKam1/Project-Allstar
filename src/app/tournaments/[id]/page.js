"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import BracketPanel from "@/components/Tournament/BracketPanel";
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
import TournamentLeaderboard from "@/components/Tournament/TournamentLeaderboard";
import CustomTeamsPanel from "@/components/Tournament/CustomTeamsPanel";
import { getTournamentChampion } from "@/lib/tournamentLeaderboard";
import { tournamentHasStarted } from "@/lib/tournamentBracket";
import { getBracketModeLabel, isShortBracketMode } from "@/lib/tournamentModes";
import { getConsolationMatches, getThirdPlaceFinisher } from "@/lib/tournamentConsolation";
import { mergeTournamentWithLocalData } from "@/lib/localCustomTeamsStorage";
import styles from './tournaments.module.css';

function getSportInitial(sport) {
  return (sport || 'T').charAt(0).toUpperCase();
}

function getTeamInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function TeamAvatar({ team, size = 'sm' }) {
  const cls = size === 'lg' ? styles.championAvatar : styles.teamAvatar;
  const fallbackCls = size === 'lg' ? styles.championAvatarFallback : styles.teamAvatarFallback;

  if (team?.logo) {
    return <img src={team.logo} alt="" className={cls} />;
  }
  return (
    <span className={fallbackCls} aria-hidden="true">
      {getTeamInitial(team?.name)}
    </span>
  );
}

function SkeletonTournamentDetail() {
  return (
    <>
      <div className={`container ${styles.skeletonHero}`}>
        <Skeleton width="40%" height={14} style={{ marginBottom: '1rem' }} />
        <Skeleton width="70%" height={48} style={{ marginBottom: '0.75rem', maxWidth: '480px' }} />
        <Skeleton width="50%" height={18} style={{ maxWidth: '320px' }} />
      </div>
      <div className={`container ${styles.skeletonLayout}`}>
        <div className={`glass-panel ticket-card ${styles.bracketPanel}`}>
          <div className={styles.skeletonBracketInner}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonRound}>
                <Skeleton width={80} height={14} style={{ marginBottom: '1rem' }} />
                <Skeleton height={96} style={{ marginBottom: '1rem', borderRadius: '12px' }} />
                <Skeleton height={96} style={{ borderRadius: '12px' }} />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.skeletonSidebar}>
          <Skeleton height={140} style={{ borderRadius: '12px' }} />
          <Skeleton height={220} style={{ borderRadius: '12px' }} />
        </div>
      </div>
    </>
  );
}

export default function TournamentDetails() {
  const params = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coverFailed, setCoverFailed] = useState(false);

  async function loadTour() {
    setLoading(true);
    setCoverFailed(false);
    try {
      const data = await tournamentService.getTournamentById(params.id);
      setTournament(mergeTournamentWithLocalData(data || null));
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
    const updated = await tournamentService.getTournamentById(params.id);
    setTournament(mergeTournamentWithLocalData(updated));
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

  const isFree = (tournament.tournament_type || 'free') === 'free';
  const isAdmin = user && user.id === tournament.creator_id;
  const teamCount = tournament.teams?.length ?? 0;
  const champion = getTournamentChampion(tournament.matches);
  const thirdPlace = getThirdPlaceFinisher(getConsolationMatches(tournament.matches));
  const shortMode = isShortBracketMode(tournament);
  const matchCount = tournament.matches?.length ?? 0;
  const decidedCount = tournament.matches?.filter((m) => m.winner_id)?.length ?? 0;
  const tournamentStarted = tournamentHasStarted(tournament.matches);

  const canManageCustomTeams = isAdmin && isFree && !tournamentStarted;
  const bracketOutdated = (tournament.bracket_status || "synced") === "changed";

  const breadcrumbRoot = isFree
    ? { label: 'My tournaments', href: '/profile/tournaments' }
    : { label: 'Tournaments', href: '/tournaments' };

  return (
    <main className={styles.main}>
      <Navbar />

      <div className={styles.hero}>
        {tournament.cover_image_url && !coverFailed ? (
          <img
            src={tournament.cover_image_url}
            alt=""
            className={styles.heroImage}
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className={styles.heroFallback} aria-hidden="true">
            {getSportInitial(tournament.sport)}
          </div>
        )}
        <div className={styles.heroOverlay} aria-hidden="true" />

        <div className={`container ${styles.heroContent}`}>
          <Breadcrumbs
            items={[
              breadcrumbRoot,
              { label: tournament.name },
            ]}
          />
          <div className={styles.tagRow}>
            <Tag>{tournament.sport}</Tag>
            {isFree ? <Tag>Friendly</Tag> : <Tag>Official</Tag>}
            <Tag>{getBracketModeLabel(tournament)}</Tag>
            <Tag>{tournament.status || 'Active'}</Tag>
            {bracketOutdated && isFree && <Tag>Bracket changed</Tag>}
          </div>
          <h1 className={styles.heroTitle}>{tournament.name}</h1>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}>
              <Icon name="users" size={16} className="icon-inline" aria-hidden="true" />
              {teamCount} {teamCount === 1 ? 'team' : 'teams'}
            </span>
            <span className={styles.metaItem}>
              <Icon name="trophy" size={16} className="icon-inline" aria-hidden="true" />
              {decidedCount}/{matchCount} matches decided
            </span>
          </div>
        </div>
      </div>

      <div className={`container ${styles.contentLayout}`}>
        <BracketPanel
          tournament={tournament}
          isAdmin={isAdmin}
          onUpdateResult={handleUpdate}
          onTournamentUpdated={setTournament}
          canReset={isAdmin && isFree && tournamentStarted}
          bracketOutdated={bracketOutdated}
          hint={
            isAdmin && !champion
              ? shortMode
                ? 'Tap Win on a match to advance teams. One loss and you are out.'
                : 'Tap Win on a match to advance teams. Semifinal losers drop into the 3rd-place match.'
              : champion
                ? 'Tournament complete.'
                : 'Follow each round to see who advances.'
          }
        />

        <aside className={styles.sidebar}>
          {champion && (
            <div className={`glass-panel ticket-card ${styles.statCard}`}>
              <h3 className={styles.cardTitle}>Champion</h3>
              <div className={styles.championBlock}>
                <TeamAvatar team={champion} size="lg" />
                <div className={styles.championInfo}>
                  <span className={styles.championLabel}>Winner</span>
                  <span className={styles.championName}>{champion.name}</span>
                </div>
              </div>
            </div>
          )}

          {thirdPlace && (
            <div className={`glass-panel ticket-card ${styles.statCard}`}>
              <h3 className={styles.cardTitle}>3rd place</h3>
              <div className={styles.championBlock}>
                <TeamAvatar team={thirdPlace} size="lg" />
                <div className={styles.championInfo}>
                  <span className={styles.championLabel}>Bronze</span>
                  <span className={styles.championName}>{thirdPlace.name}</span>
                </div>
              </div>
            </div>
          )}

          <div className={`glass-panel ticket-card ${styles.statCard}`}>
            <h3 className={styles.cardTitle}>Overview</h3>
            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Teams</span>
                <span className={styles.statValue}>{teamCount}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Status</span>
                <span className={styles.statValue}>{tournament.status || 'Active'}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Type</span>
                <span className={styles.statValue}>{isFree ? 'Friendly' : 'Official'}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Format</span>
                <span className={styles.statValue}>{getBracketModeLabel(tournament)}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Progress</span>
                <span className={styles.statValue}>
                  {matchCount ? `${decidedCount}/${matchCount}` : '—'}
                </span>
              </div>
            </div>
          </div>

          <TournamentLeaderboard
            teams={tournament.teams}
            matches={tournament.matches}
            champion={champion}
          />

          {isFree && (
            <CustomTeamsPanel
              tournament={tournament}
              isAdmin={isAdmin}
              canManageTeams={canManageCustomTeams}
              tournamentStarted={tournamentStarted}
              onUpdated={setTournament}
            />
          )}

          {isAdmin && !champion && (
            <div className={`glass-panel ticket-card ${styles.adminCard}`}>
              <h3 className={styles.cardTitle}>Bracket admin</h3>
              {shortMode ? (
                <p>
                  <strong>Short tournament.</strong> Strict single elimination — every
                  round is head-to-head, losers are out, winners advance. Record results
                  with Win on each match. The final decides the champion.
                </p>
              ) : (
                <p>
                  <strong>Full tournament.</strong> Single elimination with a 3rd-place
                  match. Semifinal losers drop into the bronze game after you record
                  those results. Record Win on each match to advance teams.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
