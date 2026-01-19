"use client";
import React, { useState } from 'react';
import StarRating from './StarRating';
import { reviewService } from '@/services/reviewService';
import { useAuth } from '@/context/AuthContext';
import styles from './review-form.module.css';

/**
 * ReviewForm Component
 * UX-framed review submission form with experience-focused language
 * @param {number} venueId - The venue ID
 * @param {string} venueName - The venue name for personalization
 * @param {function} onSuccess - Callback when review is submitted
 * @param {function} onCancel - Callback when form is cancelled
 * @param {object} existingReview - Optional existing review for editing
 */
export default function ReviewForm({
    locationId,
    locationType,
    venueName, // Keep for display
    availableSports = [], // New prop
    onSuccess,
    onCancel,
    existingReview = null
}) {
    const { user } = useAuth();
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [comment, setComment] = useState(existingReview?.comment || '');
    const [images, setImages] = useState(existingReview?.images || []);
    const [playedHere, setPlayedHere] = useState(!!existingReview?.played_sport);
    const [selectedSport, setSelectedSport] = useState(existingReview?.played_sport || '');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const characterCount = comment.length;
    const isValid = rating > 0 && comment.trim().length >= 10;

    // Logic for available sports
    const safeSports = Array.isArray(availableSports) ? availableSports : [];
    const hasSpecificSports = safeSports.length > 0;
    const sportOptions = hasSpecificSports ? safeSports : ['Basketball', 'Tennis', 'Soccer', 'Pickleball', 'Volleyball', 'Other'];

    // Auto-select if only one sport available
    React.useEffect(() => {
        if (playedHere && hasSpecificSports && safeSports.length === 1 && !selectedSport) {
            setSelectedSport(safeSports[0]);
        }
    }, [playedHere, hasSpecificSports, safeSports, selectedSport]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError("Image must be less than 5MB");
            return;
        }

        if (images.length >= 3) {
            setError("Maximum 3 images per review");
            return;
        }

        setUploading(true);
        setError('');

        const reader = new FileReader();
        reader.onloadend = () => {
            setImages([...images, reader.result]);
            setUploading(false);
        };
        reader.onerror = () => {
            setError("Failed to upload image");
            setUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isValid) {
            setError("Please provide a rating and at least 10 characters of feedback");
            return;
        }

        setSubmitting(true);
        setError('');

        const sportToSave = playedHere && selectedSport ? selectedSport : null;

        try {
            if (existingReview) {
                await reviewService.updateReview(existingReview.id, rating, comment, images, sportToSave);
            } else {
                await reviewService.submitReview(locationId, locationType, rating, comment, images, sportToSave);
            }

            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message || "Failed to submit review");
            setSubmitting(false);
        }
    };

    if (!user) {
        return (
            <div className={`glass-panel ${styles.loginPrompt}`}>
                <p>Please <a href="/login" className={styles.loginLink}>log in</a> to share your experience.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={`glass-panel ${styles.reviewForm}`}>
            <h3 className={styles.formTitle}>
                {existingReview ? 'Update your experience' : `How was your time at ${venueName}?`}
            </h3>
            <p className={styles.formSubtitle}>
                {existingReview ? 'Edit your review below' : 'Share what others should know before visiting'}
            </p>

            {/* Star Rating */}
            <div className={styles.ratingSection}>
                <label className={styles.label}>Your rating</label>
                <StarRating
                    rating={rating}
                    interactive={true}
                    onRatingChange={setRating}
                    size="large"
                />
                {rating > 0 && (
                    <span className={styles.ratingText}>
                        {rating === 5 && "Excellent!"}
                        {rating === 4 && "Great"}
                        {rating === 3 && "Good"}
                        {rating === 2 && "Fair"}
                        {rating === 1 && "Poor"}
                    </span>
                )}
            </div>

            {/* Comment */}
            <div className={styles.commentSection}>
                <label htmlFor="review-comment" className={styles.label}>
                    Your experience
                </label>
                <textarea
                    id="review-comment"
                    className={styles.textarea}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What stood out to you? How were the facilities? Would you recommend this venue to others?"
                    rows={5}
                    maxLength={1000}
                />
                <div className={styles.characterCount}>
                    <span className={characterCount < 10 ? styles.warning : ''}>
                        {characterCount} / 1000
                    </span>
                    {characterCount < 10 && (
                        <span className={styles.hint}>At least 10 characters needed</span>
                    )}
                    {characterCount > 100 && (
                        <span className={styles.bonus}>✨ Detailed review!</span>
                    )}
                </div>
            </div>

            {/* Played Context */}
            <div className={styles.contextSection} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <label className={styles.checkboxLabel} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '500' }}>
                    <input
                        type="checkbox"
                        checked={playedHere}
                        onChange={(e) => setPlayedHere(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                    />
                    Have you played here?
                </label>

                {playedHere && (
                    <div style={{ marginTop: '10px', marginLeft: '28px' }}>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-muted)' }}>
                            Which sport?
                        </label>
                        {hasSpecificSports && safeSports.length === 1 ? (
                            <div
                                style={{
                                    padding: '8px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.95rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>{safeSports[0]}</span>
                            </div>
                        ) : (
                            <select
                                value={selectedSport}
                                onChange={(e) => setSelectedSport(e.target.value)}
                                className={styles.sportSelect}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <option value="">Select a sport...</option>
                                {sportOptions.map(sport => (
                                    <option key={sport} value={sport}>{sport}</option>
                                ))}
                                {!hasSpecificSports && <option value="Other">Other</option>}
                            </select>
                        )}
                    </div>
                )}
            </div>

            {/* Image Upload */}
            <div className={styles.imageSection}>
                <label className={styles.label}>Add photos (optional)</label>
                <p className={styles.imageHint}>Help others see what to expect</p>

                {images.length > 0 && (
                    <div className={styles.imagePreview}>
                        {images.map((img, idx) => (
                            <div key={idx} className={styles.imageItem}>
                                <img src={img} alt={`Upload ${idx + 1}`} className={styles.previewImage} />
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className={styles.removeImage}
                                    aria-label="Remove image"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {images.length < 3 && (
                    <div>
                        <input
                            type="file"
                            id="review-image-upload"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className={styles.hidden}
                            disabled={uploading}
                        />
                        <label
                            htmlFor="review-image-upload"
                            className={`btn-secondary ${styles.uploadButton}`}
                            style={{ opacity: uploading ? 0.7 : 1 }}
                        >
                            {uploading ? 'Uploading...' : '📷 Add Photo'}
                        </label>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className={styles.error} role="alert">
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn-secondary"
                    disabled={submitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={!isValid || submitting}
                >
                    {submitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Share Experience'}
                </button>
            </div>
        </form>
    );
}
