"use client";
import React, { useState, useEffect } from 'react';
import { playIntentService } from '@/services/playIntentService';
import ParticipantList from './ParticipantList';
import styles from './activity-timeline.module.css';

/**
 * ActivityTimeline Component
 * Shows clustered play intents as time blocks with player counts
 * @param {string} locationId - Location ID
 * @param {string} locationType - 'community' or 'business'
 * @param {function} onJoinBlock - Callback when user joins a time block
 */
export default function ActivityTimeline({ locationId, locationType, onJoinBlock }) {
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBlock, setExpandedBlock] = useState(null);

    useEffect(() => {
        loadTimeline();

        // Refresh every 30 seconds
        const interval = setInterval(loadTimeline, 30000);
        return () => clearInterval(interval);
    }, [locationId, locationType]);

    const loadTimeline = async () => {
        try {
            const data = await playIntentService.getIntentTimeline(locationId, locationType);
            setTimeline(data);
        } catch (error) {
            console.error('Failed to load timeline:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatRelativeTime = (date) => {
        const now = new Date();
        const diff = new Date(date) - now;
        const minutes = Math.round(diff / 60000);

        if (minutes < 0) return 'Now';
        if (minutes < 60) return `in ${minutes}m`;
        if (minutes < 1440) {
            const hours = Math.floor(minutes / 60);
            return `in ${hours}h`;
        }
        return 'Tomorrow';
    };

    const handleBlockClick = (block) => {
        if (expandedBlock === block.centerTime.getTime()) {
            setExpandedBlock(null);
        } else {
            setExpandedBlock(block.centerTime.getTime());
        }
    };

    const handleJoin = (block) => {
        if (onJoinBlock) {
            onJoinBlock(block.centerTime);
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Loading activity...</p>
            </div>
        );
    }

    // Guard against undefined timeline
    const safeTimeline = timeline || [];

    if (safeTimeline.length === 0) {
        return (
            <div className={styles.empty}>
                <div className={styles.emptyIcon}>🏃</div>
                <h3>No one's playing yet</h3>
                <p>Be the first to signal when you're heading here!</p>
            </div>
        );
    }

    return (
        <div className={styles.timeline}>
            <div className={styles.header}>
                <h3 className={styles.title}>Activity</h3>
                <p className={styles.subtitle}>
                    {safeTimeline.reduce((sum, block) => sum + block.playerCount, 0)} player{safeTimeline.reduce((sum, block) => sum + block.playerCount, 0) !== 1 ? 's' : ''} planning to play
                </p>
            </div>

            <div className={styles.blocks}>
                {safeTimeline.map((block, index) => {
                    // Normalize block time to Date object to be safe
                    const blockDate = new Date(block.centerTime);
                    const blockKey = blockDate.getTime();
                    const isExpanded = expandedBlock === blockKey;

                    // Determine if this block is "active" (happening now or significantly populated)
                    const now = new Date();
                    const diffMins = (blockDate - now) / 60000;
                    const isActive = diffMins > -30 && diffMins < 30; // Within 30 mins window

                    return (
                        <div
                            key={blockKey}
                            className={`${styles.blockContainer} ${isActive ? styles.activeBlock : ''}`}
                            style={{ animationDelay: `${index * 0.1}s` }} // Staggered entrance
                        >
                            <div
                                className={`${styles.block} ${isExpanded ? styles.expanded : ''}`}
                                onClick={() => handleBlockClick({ ...block, centerTime: blockDate })}
                            >
                                <div className={styles.blockTime}>
                                    <div className={styles.time}>{formatTime(blockDate)}</div>
                                    <div className={styles.relativeTime}>{formatRelativeTime(blockDate)}</div>
                                </div>

                                <div className={styles.blockInfo}>
                                    <div className={styles.playerCount}>
                                        <span className={styles.count}>{block.playerCount}</span>
                                        <span className={styles.label}>player{block.playerCount !== 1 ? 's' : ''}</span>
                                    </div>

                                    {/* Sport icons if available */}
                                    {block.intents.some(i => i.sport) && (
                                        <div className={styles.sports}>
                                            {[...new Set(block.intents.map(i => i.sport).filter(Boolean))].map(sport => (
                                                <span key={sport} className={styles.sportTag}>{sport}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className={styles.expandIcon}>
                                    {isExpanded ? '▼' : '▶'}
                                </div>
                            </div>

                            {/* Expanded View - Participants */}
                            {isExpanded && (
                                <div className={styles.participants}>
                                    <ParticipantList participants={block.intents} />
                                    <button
                                        onClick={() => handleJoin(block)}
                                        className={styles.joinButton}
                                    >
                                        Join this time
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
