import Link from 'next/link';
import Navbar from '@/components/Layout/Navbar';
import styles from '../legal.module.css';

export default function TermsPage() {
  return (
    <main className={styles.main}>
      <Navbar />
      <article className={`container ${styles.container}`}>
        <div className={`glass-panel ticket-card ${styles.panel}`}>
          <h1 className={styles.title}>Terms of service</h1>
          <p className={styles.meta}>Last updated: June 2026</p>
          <div className={styles.body}>
            <p>
              By using Project AllStar you agree to participate respectfully, provide
              accurate venue and profile information, and follow local laws when
              organizing or joining sports activities.
            </p>
            <p>
              Business accounts are responsible for the accuracy of listings they manage.
              We may remove content that is fraudulent, abusive, or unsafe.
            </p>
            <p>
              Play intents, team requests, and reviews should reflect real activity.
              False claims, spam, and harassment are grounds for account suspension.
            </p>
          </div>
          <ul className={styles.linkList}>
            <li><Link href="/help">Help center</Link></li>
            <li><Link href="/privacy">Privacy policy</Link></li>
          </ul>
        </div>
      </article>
    </main>
  );
}
