import Link from 'next/link';
import Navbar from '@/components/Layout/Navbar';
import styles from '../legal.module.css';

export default function HelpPage() {
  return (
    <main className={styles.main}>
      <Navbar />
      <article className={`container ${styles.container}`}>
        <div className={`glass-panel ticket-card ${styles.panel}`}>
          <h1 className={styles.title}>Help center</h1>
          <p className={styles.lead}>
            Project AllStar connects players with venues, teams, and events in your city.
          </p>
          <div className={styles.body}>
            <p>
              For account issues, venue claims, moderation requests, or bug reports,
              email support@projectallstar.com and include your account email plus a
              short description of what happened.
            </p>
            <p>
              Business owners can claim a listing from the venue page or the business
              dashboard. Players can join teams, post play intents, and leave reviews
              after signing in.
            </p>
          </div>
          <ul className={styles.linkList}>
            <li><Link href="/venues">Browse venues</Link></li>
            <li><Link href="/teams">Find teams</Link></li>
            <li><Link href="/privacy">Privacy policy</Link></li>
            <li><Link href="/terms">Terms of service</Link></li>
          </ul>
          <div className={styles.actions}>
            <Link href="/venues" className="btn-primary">Explore venues</Link>
          </div>
        </div>
      </article>
    </main>
  );
}
