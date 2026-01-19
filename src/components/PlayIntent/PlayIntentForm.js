"use client";
import React, { useState } from 'react';
import CircularTimePicker from './CircularTimePicker';
import { playIntentService } from '@/services/playIntentService';
import { interactionTrackingService } from '@/services/interactionTrackingService';
import { useAuth } from '@/context/AuthContext';
import styles from './play-intent-form.module.css';

/**
 * PlayIntentForm Component
 * Modal form for creating play intents with UX-framed language
 * @param {string} locationId - Location ID
 * @param {string} locationType - 'community' or 'business'
 * @param {string} locationName - Location name for display
 * @param {function} onSuccess - Callback on successful submission
 * @param {function} onCancel - Callback on cancel
 */
export default function PlayIntentForm({ locationId, locationType, locationName, availableSports = [], onSuccess, onCancel }) {
    const { user } = useAuth();

    // Determine sports list: use available venue sports if provided, otherwise default list
    const defaultSports = [
        'Basketball', 'Football', 'Soccer', 'Tennis', 'Volleyball',
        'Baseball', 'Badminton', 'Table Tennis', 'Cricket', 'Other'
    ];
    const sportOptions = (availableSports && availableSports.length > 0) ? availableSports : defaultSports;
    const isSingleSport = sportOptions.length === 1;

    const [selectedTime, setSelectedTime] = useState(() => {
        const now = new Date();
        return new Date(now.getTime() + 15 * 60000);
    });

    // Auto-select if single sport, otherwise empty
    const [sport, setSport] = useState(isSingleSport ? sportOptions[0] : '');
    const [skillLevel, setSkillLevel] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const optionalSectionRef = React.useRef(null);

    const skillLevels = [
        { value: 'any', label: 'Any Level' },
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
    ];

    const handleTimeConfirmed = (time) => {
        setSelectedTime(time);
        // Smooth scroll to show the rest of the form
        if (optionalSectionRef.current) {
            optionalSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('Please log in to signal your play intent');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await playIntentService.createIntent(
                locationId,
                locationType,
                selectedTime,
                sport || null,
                skillLevel || null,
                note.trim() || null
            );

            // Track interaction
            await interactionTrackingService.trackPlayIntent(locationId, locationType);

            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            setError(err.message || 'Failed to create play intent');
            setIsSubmitting(false);
        }
    };

    const formatTimeDisplay = (date) => {
        const now = new Date();
        const diff = date - now;
        const minutes = Math.round(diff / 60000);

        if (minutes < 60) {
            return `in ${minutes} minutes`;
        } else if (minutes < 1440) {
            const hours = Math.floor(minutes / 60);
            return `in ${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
            return date.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        }
    };

    return (
        <div className={styles.modal}>
            <div className={styles.modalOverlay} onClick={onCancel} />
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <h2 className={styles.title}>When are you playing?</h2>
                    <p className={styles.subtitle}>
                        Let others know you'll be at <strong>{locationName}</strong>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Time Picker */}
                    <div className={styles.section}>
                        <CircularTimePicker
                            defaultTime={selectedTime}
                            onTimeSelect={handleTimeConfirmed}
                            onQuickSelect={handleTimeConfirmed}
                        />
                        <p className={styles.timeHint}>
                            You're planning to play {formatTimeDisplay(selectedTime)}
                            <span className={styles.scrollHintIcon}>↓</span>
                        </p>
                    </div>

                    {/* Optional Inputs */}
                    <div className={styles.optionalSection} ref={optionalSectionRef}>
                        <p className={styles.optionalLabel}>Optional details (skip if you want)</p>

                        {/* Sport Selection */}
                        <div className={styles.field}>
                            <label className={styles.label}>Which sport?</label>
                            <select
                                value={sport}
                                onChange={(e) => setSport(e.target.value)}
                                className={styles.select}
                                disabled={isSingleSport} // Lock if only one option
                                style={isSingleSport ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' } : {}}
                            >
                                {!isSingleSport && <option value="">Select a sport...</option>}
                                {sportOptions.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Skill Level */}
                        <div className={styles.field}>
                            <label className={styles.label}>Your skill level?</label>
                            <div className={styles.skillButtons}>
                                {skillLevels.map(level => (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => setSkillLevel(level.value)}
                                        className={`${styles.skillButton} ${skillLevel === level.value ? styles.active : ''}`}
                                    >
                                        {level.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Note */}
                        <div className={styles.field}>
                            <label className={styles.label}>Anything others should know?</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g., 'Looking for a pickup game' or 'Bringing extra equipment'"
                                maxLength={200}
                                className={styles.textarea}
                                rows={3}
                            />
                            <div className={styles.charCount}>{note.length}/200</div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className={styles.error}>{error}</div>
                    )}

                    {/* Actions */}
                    <div className={styles.actions}>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn-secondary"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : "I'm Going"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
