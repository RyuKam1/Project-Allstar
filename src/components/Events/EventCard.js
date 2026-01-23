"use client";
import React from 'react';
import Link from 'next/link';
import styles from '../../app/events/events.module.css';

export default function EventCard({ event, user }) {
  // Parsing date for the badge (assuming format "YYYY-MM-DD" or similar text)
  let dateObj = new Date(event.date);
  if (isNaN(dateObj)) dateObj = new Date(); // Fallback
  
  const month = dateObj.toLocaleString('default', { month: 'short' });
  const day = dateObj.getDate();

  return (
    <Link href={event.kind === 'Tournament' ? `/tournaments/${event.routeId}` : `/events/${event.routeId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card card-elevated" style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Image / Header */}
        <div className={styles.cardImageContainer}>
           <img 
               src={`/events/${event.title}.webp`} 
               alt={event.title}
               style={{ width: '100%', height: '100%', objectFit: 'cover' }}
               onError={(e) => {
                   e.target.style.display = 'none';
                   e.target.parentNode.style.display = 'flex';
                   e.target.parentNode.style.alignItems = 'center';
                   e.target.parentNode.style.justifyContent = 'center';
                   e.target.parentNode.style.fontSize = '3rem';
                   e.target.parentNode.innerHTML = event.sport === 'Basketball' ? '🏀' : event.sport === 'Soccer' ? '⚽' : '🏆';
               }}
           />
           {/* Date Badge */}
           <div className={styles.cardDateBadge}>
              <span className={styles.cardDateMonth}>{month}</span>
              <span className={styles.cardDateDay}>{day}</span>
           </div>
           
           {/* Top Right Tag */}
           <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
              <span className="text-caption" style={{ 
                  background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', backdropFilter: 'blur(4px)' 
              }}>
                 {event.displayType}
              </span>
           </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="text-caption" style={{ color: 'var(--color-brand)', marginBottom: '0.25rem' }}>
               {event.sport}
            </div>
            
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>{event.title}</h3>
            
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.9rem', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
               <span>📍 {event.location}</span>
               <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{event.cost}</span>
            </div>
        </div>
      </div>
    </Link>
  );
}
