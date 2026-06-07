import Link from 'next/link';
import Navbar from '@/components/Layout/Navbar';
import Icon from '@/components/UI/Icon';
import styles from './not-found.module.css';

const quickLinks = [
  { href: '/venues', label: 'Venues', icon: 'location' },
  { href: '/teams', label: 'Teams', icon: 'users' },
  { href: '/events', label: 'Events', icon: 'calendar' },
  { href: '/community', label: 'Community', icon: 'message' },
];

export default function NotFound() {
  return (
    <main className={styles.main}>
      <Navbar />
      <div className={`container ${styles.content}`}>
        <div className={`glass-panel ticket-card ${styles.panel}`}>
          <div className={styles.courtMark} aria-hidden="true" />
          <p className={styles.code}>404</p>
          <h1 className={styles.title}>This court isn&apos;t on the map</h1>
          <p className={styles.text}>
            The page you wanted moved, never existed, or the link is out of date.
            Pick a route below and keep playing.
          </p>

          <nav className={styles.quickNav} aria-label="Quick navigation">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.quickLink}>
                <Icon name={link.icon} size={18} />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <Link href="/venues" className="btn-primary">Browse venues</Link>
            <Link href="/" className="btn-secondary">Back home</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
