import Link from "next/link";

import styles from './footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div>
          <h3 className={`primary-gradient-text ${styles.brandTitle}`}>AllStar</h3>
          <p className={styles.description}>
            The ultimate platform for sports enthusiasts. Play anywhere, anytime.
          </p>
        </div>
        
        <div>
          <h4 className={styles.sectionTitle}>Explore</h4>
          <div className={styles.linkGroup}>
            <Link href="/venues" className={styles.link}>Venues</Link>
            <Link href="/events" className={styles.link}>Events</Link>
            <Link href="/community" className={styles.link}>Community</Link>
          </div>
        </div>

        <div>
          <h4 className={styles.sectionTitle}>Support</h4>
          <div className={styles.linkGroup}>
            <Link href="/help" className={styles.link}>Help Center</Link>
            <Link href="/terms" className={styles.link}>Terms by Service</Link>
            <Link href="/privacy" className={styles.link}>Privacy Policy</Link>
          </div>
        </div>

        <div>
          <h4 className={styles.sectionTitle}>Connect</h4>
          <div className={styles.socialGroup}>
            {['Twitter', 'Instagram', 'LinkedIn'].map(social => (
              <span key={social} className={styles.socialIcon}>{social}</span>
            ))}
          </div>
        </div>
      </div>
      
      <div className={`container ${styles.copyright}`}>
        © 2024 Project AllStar. All rights reserved.
      </div>
    </footer>
  );
}
