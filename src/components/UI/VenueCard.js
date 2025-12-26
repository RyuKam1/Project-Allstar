"use client";
import Link from "next/link";

import styles from './venue-card.module.css';

export default function VenueCard({ venue }) {
  return (
    <Link href={`/venues/${venue.id}`} className={styles.cardLink}>
      <div className={`glass-panel ${styles.card}`}>
        <div className={styles.imageContainer}>
          <img 
            src={`/venues/${venue.name}.jpg`} 
            alt={venue.name}
            className={styles.image}
          />
        </div>
        
        <div className={styles.content}>
          <div className={styles.header}>
            <span className={styles.typeTag}>
              {venue.type}
            </span>
            <div className={styles.rating}>
              <span>⭐</span>
              <span>{venue.rating}</span>
            </div>
          </div>

          <h3 className={styles.title}>{venue.name}</h3>
          
          <p className={styles.location}>
            📍 {venue.location}
          </p>

          <div className={styles.footer}>
            <span className={styles.price}>{venue.price}</span>
            <span className={styles.bookButton}>
              Book Now →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
