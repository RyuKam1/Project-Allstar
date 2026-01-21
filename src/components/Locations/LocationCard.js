"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPlayButtonText } from '@/lib/sportUtils';
import styles from './location-card.module.css';

/**
 * LocationCard Component
 * Unified card for displaying both community locations and business venues
 * @param {Object} location - Location data object
 * @param {string} type - 'community' or 'business'
 * @param {boolean} showActivity - Whether to show live activity indicator
 */
export default function LocationCard({ location, type, showActivity = true }) {
    const router = useRouter();

    if (!location) return null;

    const isBusiness = type === 'business';
    const name = location.name || (isBusiness ? `Venue #${location.venue_id}` : 'Unnamed Location');

    // Priority: Card Image -> Banner/First Image -> Legacy -> Placeholder
    const image = location.card_image_url || location.images?.[0]?.image_url || location.image_url || '/placeholder-court.jpg';

    // Calculate active players (mock for now, or passed in)
    const activePlayers = location.active_player_count || 0;

    const handleClick = (e) => {
        // Prevent default if clicking on action buttons
        if (e.target.closest('button') || e.target.closest('a')) return;

        // Navigate to unified location page
        // Using the UUID if available, otherwise fallback (legacy venues might need handling)
        const id = location.id;
        if (type === 'business') {
            router.push(`/venues/${id}`);
        } else {
            router.push(`/locations/${id}?type=${type}`);
        }
    };

    return (
        <div className={`glass-panel ${styles.card} ${isBusiness ? styles.businessCard : styles.communityCard}`} onClick={handleClick}>
            {/* Image Container */}
            <div className={styles.imageContainer}>
                <img src={image} alt={name} className={styles.image} />

                {/* Badges */}
                <div className={styles.badges}>
                    {isBusiness && (
                        <span className={styles.verifiedBadge}>
                            <span className={styles.checkIcon}>✓</span> Official
                        </span>
                    )}
                    {!isBusiness && (
                        <span className={styles.communityBadge}>
                            Community
                        </span>
                    )}
                </div>

                {/* Rating Badge (Restored) */}
                {isBusiness && location.rating && (
                    <div className={styles.ratingBadge}>
                        <span>⭐</span> {location.rating}
                    </div>
                )}

                {/* Activity Indicator */}
                {showActivity && activePlayers > 0 && (
                    <div className={styles.activityBadge}>
                        <span className={styles.pulseDot}></span>
                        {activePlayers} playing
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={styles.content}>
                <div className={styles.header}>
                    <h3 className={styles.name}>{name}</h3>
                    {location.distance && (
                        <span className={styles.distance}>{location.distance.toFixed(1)} km</span>
                    )}
                </div>

                {/* Sports Tags */}
                <div className={styles.sports}>
                    {(location.sports || []).slice(0, 3).map((sport, idx) => (
                        <span key={idx} className={styles.sportTag}>
                            {sport}
                        </span>
                    ))}
                </div>

                {/* Action Footer */}
                <div className={styles.footer}>
                    {/* Show price if business, or simple text for community */}
                    <span className={styles.price}>
                        {isBusiness ? (location.price || 'Ask for price') : 'Free / Public'}
                    </span>
                    <button className={styles.actionButton}>
                        {getPlayButtonText(location.sports)} →
                    </button>
                </div>
            </div>
        </div>
    );
}
