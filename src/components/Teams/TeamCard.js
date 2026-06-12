import React from 'react';
import Link from 'next/link';
import styles from './team-card.module.css';

const LAYOUT_ACCENTS = [
  '',
  styles.layoutLift,
  styles.layoutDrop,
  styles.layoutCompact,
  styles.layoutEase,
  styles.layoutSet,
  styles.layoutDrift,
];

export default function TeamCard({ team, user, onJoin, layoutAccent = '' }) {
  const isMember = user && team.members.some((m) => m.id === user.id);
  const hasPendingRequest = user && team.requests?.some((r) => r.id === user.id);
  const fallbackInitial = team.name.charAt(0).toUpperCase();

  return (
    <div className={`glass-panel court-frame ticket-card ${styles.card} ${layoutAccent}`.trim()}>
      <div className={`tape-tag ${styles.sportBadge}`}>{team.sport}</div>

      <div className={styles.logoContainer}>
        {team.logo ? (
          <img src={team.logo} alt={team.name} className={styles.logoImage} />
        ) : (
          <div className={styles.fallbackLogo}>{fallbackInitial}</div>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.teamName}>{team.name}</h3>
        <p className={styles.memberCount}>{team.members.length} members</p>

        <p className={`${styles.description} ${team.description ? '' : styles.descriptionEmpty}`.trim()}>
          {team.description || 'No description'}
        </p>

        <div className={styles.actions}>
          <Link href={`/teams/${team.id}`}>
            <button type="button" className={styles.viewButton}>View</button>
          </Link>

          {!isMember ? (
            <button
              type="button"
              onClick={() => onJoin(team.id)}
              disabled={hasPendingRequest}
              className={hasPendingRequest ? styles.pendingButton : styles.joinButton}
            >
              {hasPendingRequest ? 'Pending' : 'Join'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { LAYOUT_ACCENTS };
