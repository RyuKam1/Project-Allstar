import Link from "next/link";

import styles from './footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const socialLinks = [
    { label: "Twitter", href: "https://x.com/projectallstar" },
    { label: "Instagram", href: "https://instagram.com/projectallstar" },
    { label: "LinkedIn", href: "https://linkedin.com/company/projectallstar" },
  ];

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
            <Link href="/business/add" className={styles.link}>Add a venue</Link>
          </div>
        </div>

        <div>
          <h4 className={styles.sectionTitle}>Support</h4>
          <div className={styles.linkGroup}>
            <Link href="/help" className={styles.link}>Help Center</Link>
            <Link href="/terms" className={styles.link}>Terms of Service</Link>
            <Link href="/privacy" className={styles.link}>Privacy Policy</Link>
          </div>
        </div>

        <div>
          <h4 className={styles.sectionTitle}>Connect</h4>
          <div className={styles.socialGroup}>
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className={styles.socialLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit AllStar on ${social.label}`}
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      
      <div className={`container ${styles.copyright}`}>
        © {currentYear} Project AllStar. All rights reserved.
      </div>
    </footer>
  );
}
