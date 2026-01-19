"use client";
import React from 'react';
import styles from './participant-list.module.css';

/**
 * ParticipantList Component
 * Shows users who are planning to play in a time block
 * @param {Array} participants - Array of play intents with user info
 */
export default function ParticipantList({ participants }) {
    if (!participants || participants.length === 0) {
        return null;
    }

    const getSkillLevelBadge = (level) => {
        const badges = {
            beginner: { emoji: '🌱', label: 'Beginner' },
            intermediate: { emoji: '⚡', label: 'Intermediate' },
            advanced: { emoji: '🏆', label: 'Advanced' },
            any: { emoji: '👥', label: 'Any Level' }
        };
        return badges[level] || badges.any;
    };

    return (
        <div className={styles.list}>
            <div className={styles.header}>
                <h4 className={styles.title}>Who's going</h4>
                <span className={styles.count}>{participants.length}</span>
            </div>

            <div className={styles.participants}>
                {participants.map((participant, index) => {
                    const skillBadge = participant.skill_level
                        ? getSkillLevelBadge(participant.skill_level)
                        : null;

                    return (
                        <div key={participant.id || index} className={styles.participant}>
                            {/* Avatar */}
                            <div className={styles.avatar}>
                                {participant.user_avatar ? (
                                    <img
                                        src={participant.user_avatar}
                                        alt={participant.user_name}
                                        className={styles.avatarImage}
                                    />
                                ) : (
                                    <div className={styles.avatarPlaceholder}>
                                        {participant.user_name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className={styles.info}>
                                <div className={styles.name}>{participant.user_name || 'Anonymous'}</div>

                                <div className={styles.details}>
                                    {participant.sport && (
                                        <span className={styles.sport}>🏀 {participant.sport}</span>
                                    )}
                                    {skillBadge && (
                                        <span className={styles.skill}>
                                            {skillBadge.emoji} {skillBadge.label}
                                        </span>
                                    )}
                                </div>

                                {participant.note && (
                                    <div className={styles.note}>"{participant.note}"</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
