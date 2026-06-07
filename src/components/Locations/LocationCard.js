"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { getPlayButtonText } from '@/lib/sportUtils';
import styles from './location-card.module.css';

/**
 * LocationCard Component
 * Unified card for displaying both community locations and business venues
 */
export default function LocationCard({ location, type, showActivity = true }) {
    const router = useRouter();

    if (!location) return null;

    const isBusiness = type === 'business';
    const name = location.name || (isBusiness ? `Venue #${location.venue_id}` : 'Unnamed Location');
    const image = location.card_image_url || location.images?.[0]?.image_url || location.image_url || '/placeholder-court.jpg';
    const activePlayers = location.active_player_count || 0;

    const handleClick = (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        const id = location.id;
        router.push(`/locations/${id}?type=${type}`);
    };

    return (
        <div
            className={`glass-panel court-frame ticket-card ${styles.card} ${isBusiness ? styles.businessCard : styles.communityCard}`}
            onClick={handleClick}
        >
            <div className={styles.imageContainer}>
                <img
                    src={image}
                    alt={name}
                    className={styles.image}
                    loading="lazy"
                    width={400}
                    height={220}
                />

                <div className={styles.badges}>
                    {isBusiness ? (
                        <span className="tape-tag">Official</span>
                    ) : (
                        <span className={`tape-tag ${styles.communityTape}`}>Community</span>
                    )}
                </div>

                {isBusiness && location.rating && (
                    <div className={`${styles.ratingBadge} tabular`}>
                        <span>★</span> {location.rating}
                    </div>
                )}

                {showActivity && activePlayers > 0 && (
                    <div className={styles.activityBadge}>
                        <span className={styles.pulseDot} />
                        <span className="tabular">{activePlayers} playing</span>
                    </div>
                )}
            </div>

            <div className={styles.content}>
                <div className={styles.header}>
                    <h3 className={styles.name}>{name}</h3>
                    {location.distance != null && (
                        <span className={`${styles.distance} tabular`}>{location.distance.toFixed(1)} km</span>
                    )}
                </div>

                <div className={styles.sports}>
                    {(location.sports || []).slice(0, 3).map((sport, idx) => (
                        <span key={idx} className={styles.sportTag}>{sport}</span>
                    ))}
                </div>

                <div className={styles.footer}>
                    <span className={styles.price}>
                        {isBusiness ? (location.price || 'Ask for price') : 'Free / Public'}
                    </span>
                    <button type="button" className={styles.actionButton}>
                        {getPlayButtonText(location.sports)} →
                    </button>
                </div>
            </div>
        </div>
    );
}
