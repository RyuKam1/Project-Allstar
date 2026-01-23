"use client";
import React from 'react';
import styles from '../../app/page.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';

export default function GuestLanding() {
  const { theme, changeTheme } = useTheme();
  const router = useRouter();

  const getTitle = () => {
      if (theme === 'sport') return "UNLEASH CHAOS";
      if (theme === 'pure') return "Simply Beautiful.";
      return "THE LEGACY"; // Cinema
  };

  const getSubtitle = () => {
    if (theme === 'sport') return "Dominate the court with next-gen stats and high-octane community tools.";
    if (theme === 'pure') return "A minimal space for athletes to connect, grow, and focus on what matters.";
    return "A cinematic journey through your athletic career. Every game tells a story.";
  };

  return (
    <div className={styles.heroSection}>
       
       <div className={styles.vibeSwitcher}>
          <button onClick={() => changeTheme('cinema')} className={`${styles.vibeBtn} ${theme === 'cinema' ? styles.vibeBtnActive : ''}`}>Cinema</button>
          <button onClick={() => changeTheme('sport')} className={`${styles.vibeBtn} ${theme === 'sport' ? styles.vibeBtnActive : ''}`}>Sport</button>
          <button onClick={() => changeTheme('pure')} className={`${styles.vibeBtn} ${theme === 'pure' ? styles.vibeBtnActive : ''}`}>Pure</button>
       </div>

       <div className={styles.heroContent}>
          <h1 className={styles.title}>{getTitle()}</h1>
          <p className={styles.subtitle}>{getSubtitle()}</p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
             <button className="btn-primary" onClick={() => router.push('/login')}>
                 START JOURNEY
             </button>
          </div>
       </div>

       {/* Decorative Background Elements (handled by CSS via data-theme, but we could add more here) */}
    </div>
  );
}
