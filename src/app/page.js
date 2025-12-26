import Navbar from "@/components/Layout/Navbar";
import Link from "next/link";
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <Navbar />
      
      {/* Hero Section */}
      <section className={`container ${styles.heroSection}`}>
        <div className={styles.backgroundGradient} />

        <h1 className={styles.title}>
          Find Your <span className="primary-gradient-text">Arena</span>. <br/>
          Unleash Your Game.
        </h1>
        
        <p className={styles.subtitle}>
          Discover top-rated stadiums, fields, and gyms near you. 
          Book instantly and join the biggest sports community.
        </p>

        <div className={styles.actions}>
          <Link href="/venues">
            <button className={`btn-primary ${styles.primaryButton}`}>
              Find a Venue
            </button>
          </Link>
          <button className={styles.secondaryButton}>
            Download App
          </button>
        </div>

        {/* Floating details / Stats (Visual flair) */}
        <div className={`glass-panel ${styles.statsContainer}`}>
           <div className={styles.statItem}>
             <h3 className="primary-gradient-text">500+</h3>
             <p>Venues</p>
           </div>
           <div className={styles.statItem}>
             <h3 className="primary-gradient-text">12k+</h3>
             <p>Active Players</p>
           </div>
           <div className={styles.statItem}>
             <h3 className="primary-gradient-text">24/7</h3>
             <p>Support</p>
           </div>
        </div>
      </section>
    </main>
  );
}
