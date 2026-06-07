"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/UI/Icon';
import { Stagger } from '@/components/UI/motion';
import { SkeletonList } from '@/components/UI/primitives';
import { playIntentService } from '@/services/playIntentService';
import styles from './member-dashboard.module.css';

const SUGGESTIONS = [
  { title: 'Browse venues in your area', href: '/venues', time: 'Suggested' },
  { title: 'Check open team slots', href: '/teams', time: 'Suggested' },
  { title: 'See upcoming tournaments', href: '/events', time: 'Suggested' },
];

export default function MemberDashboard({ user }) {
  const firstName = user?.name?.split(' ')[0] || 'Athlete';
  const [upcomingGames, setUpcomingGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);

  useEffect(() => {
    let mounted = true;

    playIntentService
      .getUserIntents()
      .then((games) => {
        if (mounted) setUpcomingGames(games.slice(0, 3));
      })
      .catch(() => {
        if (mounted) setUpcomingGames([]);
      })
      .finally(() => {
        if (mounted) setLoadingGames(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <div className={`container ${styles.memberDashboard}`}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Good to see you, {firstName}</h1>
        <p className={styles.caption}>Pick up where you left off.</p>
      </header>

      <Stagger className={styles.grid}>
        <div className={`glass-panel court-frame ticket-card ${styles.heroCard}`}>
          <div>
            <span className={styles.heroLabel}>Your next move</span>
            <h2 className={styles.heroTitle}>Find a run or join a team</h2>
            <div className={styles.heroMeta}>
              <span className={styles.metaItem}>
                <Icon name="location" size={16} /> Venues near you
              </span>
              <span className={styles.metaItem}>
                <Icon name="calendar" size={16} />{' '}
                {upcomingGames.length > 0
                  ? `${upcomingGames.length} upcoming run${upcomingGames.length === 1 ? '' : 's'}`
                  : 'Events this week'}
              </span>
            </div>
          </div>
          <Link href="/venues" className="btn-primary">Find a venue</Link>
        </div>

        <div className={`glass-panel court-frame ${styles.card}`}>
          <h3 className={styles.cardTitle}>Quick links</h3>
          <div className={styles.quickGrid}>
            <Link href="/venues" className={`btn-secondary ${styles.quickLink}`}>
              <Icon name="location" size={18} /> Venues
            </Link>
            <Link href="/teams" className={`btn-secondary ${styles.quickLink}`}>
              <Icon name="users" size={18} /> Teams
            </Link>
            <Link href="/events" className={`btn-secondary ${styles.quickLink}`}>
              <Icon name="calendar" size={18} /> Events
            </Link>
            <Link href="/community" className={`btn-secondary ${styles.quickLink}`}>
              <Icon name="message" size={18} /> Community
            </Link>
          </div>
        </div>

        <div className={`glass-panel court-frame ${styles.card}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Upcoming runs</h3>
            <Link href="/profile" className={styles.viewAll}>Profile</Link>
          </div>
          {loadingGames ? (
            <SkeletonList rows={3} />
          ) : upcomingGames.length > 0 ? (
            <ul className={styles.activityList}>
              {upcomingGames.map((game) => (
                <li key={game.id}>
                  <Link
                    href={`/locations/${game.location_id}?type=${game.location_type}`}
                    className={styles.activityItem}
                  >
                    <div className={styles.activityAvatar} aria-hidden="true" />
                    <div>
                      <div className={styles.activityTitle}>
                        {game.location_name || 'Pickup game'}
                      </div>
                      <div className={styles.activityTime}>
                        {new Date(game.intent_time).toLocaleDateString()} ·{' '}
                        {new Date(game.intent_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={styles.activityList}>
              {SUGGESTIONS.map((item) => (
                <li key={item.title}>
                  <Link href={item.href} className={styles.activityItem}>
                    <div className={styles.activityAvatar} aria-hidden="true" />
                    <div>
                      <div className={styles.activityTitle}>{item.title}</div>
                      <div className={styles.activityTime}>{item.time}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Stagger>
    </div>
  );
}
