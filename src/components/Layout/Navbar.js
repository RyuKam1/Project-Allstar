"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import styles from './navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className={`glass-panel ${styles.nav}`}>
        <div className={styles.logo}>
          <Link href="/" className={`primary-gradient-text ${styles.logoLink}`}>
            AllStar
          </Link>
        </div>

        <button 
          className={styles.menuToggle}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className={`${styles.navLinks} ${mobileMenuOpen ? styles.open : ''}`}>
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
              onClick={closeMobileMenu}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className={styles.authButtons}>
          {user ? (
            <>
              <Link href="/profile" className={styles.profileLink} onClick={closeMobileMenu}>
                <img src={user.avatar} alt="Profile" className={styles.avatar} />
                <span className={styles.userName}>{user.name}</span>
              </Link>
              <button 
                onClick={() => { handleLogout(); closeMobileMenu(); }}
                className={styles.logoutButton}
              >
                Log Out
              </button>
            </>
          ) : (
            <Link href="/login" onClick={closeMobileMenu}>
              <button className={`btn-primary ${styles.getStartedButton}`}>
                Get Started
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div 
        className={`${styles.overlay} ${mobileMenuOpen ? styles.open : ''}`}
        onClick={closeMobileMenu}
      />
    </>
  );
}
