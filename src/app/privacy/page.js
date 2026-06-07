import Link from 'next/link';
import Navbar from '@/components/Layout/Navbar';
import styles from '../legal.module.css';

export default function PrivacyPage() {
  return (
    <main className={styles.main}>
      <Navbar />
      <article className={`container ${styles.container}`}>
        <div className={`glass-panel ticket-card ${styles.panel}`}>
          <h1 className={styles.title}>Privacy policy</h1>
          <p className={styles.meta}>Last updated: June 2026</p>
          <div className={styles.body}>
            <p>
              We collect account information, location data you choose to share, and
              activity needed to operate venues, teams, events, and community features.
            </p>
            <p>
              Public profile fields (name, avatar, bio, sport) may be visible to other
              users through team pages and community posts. Physical stats and private
              account details stay on your profile unless you share them directly.
            </p>
            <p>
              We do not sell personal data. You may request deletion of your account by
              contacting support@projectallstar.com.
            </p>
          </div>
          <ul className={styles.linkList}>
            <li><Link href="/help">Help center</Link></li>
            <li><Link href="/terms">Terms of service</Link></li>
          </ul>
        </div>
      </article>
    </main>
  );
}
