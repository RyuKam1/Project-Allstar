"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';

import styles from './navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className={`glass-panel ${styles.nav}`}>
      <div className={styles.logo}>
        <Link href="/" className={`primary-gradient-text ${styles.logoLink}`}>
          AllStar
        </Link>
      </div>

      <div className={styles.navLinks}>
        {[
          { label: 'Venues', href: '/venues' },
          { label: 'Teams', href: '/teams' },
          { label: 'Events & Tournaments', href: '/events' },
          { label: 'Community', href: '/community' }
        ].map((item) => (
          <Link 
            href={item.href} 
            key={item.label}
            className={styles.navLink}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className={styles.authButtons}>
        {user ? (
          <>
            <Link href="/profile" className={styles.profileLink}>
              <img src={user.avatar} alt="Profile" className={styles.avatar} />
              <span className={styles.userName}>{user.name}</span>
            </Link>
            <button 
              onClick={handleLogout}
              className={styles.logoutButton}
            >
              Log Out
            </button>
          </>
        ) : (
          <Link href="/login">
            <button className={`btn-primary ${styles.getStartedButton}`}>
              Get Started
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
}
