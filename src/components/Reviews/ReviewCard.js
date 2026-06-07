"use client";
import React, { useState } from 'react';
import StarRating from './StarRating';
import { reviewService } from '@/services/reviewService';
import { useAuth } from '@/context/AuthContext';
import { useNotificationCenter } from '@/components/UI/NotificationCenter';
import Icon from '@/components/UI/Icon';
import styles from './review-card.module.css';

/**
 * ReviewCard Component
 * Displays a single review with user info, rating, comment, and images
 * @param {object} review - The review object
 * @param {function} onDelete - Callback when review is deleted
 * @param {function} onEdit - Callback when review is edited
 */
export default function ReviewCard({ review, onDelete, onEdit }) {
    const { user } = useAuth();
    const { notify, confirm } = useNotificationCenter();
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isOwnReview = user && review.user_id === user.id;
    const reviewDate = new Date(review.created_at);
    const formattedDate = reviewDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const handleDelete = async () => {
        const confirmed = await confirm('Are you sure you want to delete this review?', {
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;

        setDeleting(true);
        try {
            await reviewService.deleteReview(review.id);
            if (onDelete) onDelete(review.id);
        } catch (err) {
            notify(err.message || 'Failed to delete review', 'error');
            setDeleting(false);
        }
    };

    const handleReport = async (e) => {
        e.preventDefault();

        if (!reportReason.trim()) {
            notify('Please provide a reason for reporting', 'warning');
            return;
        }

        setReporting(true);
        try {
            await reviewService.reportReview(review.id, reportReason);
            notify('Thank you for your report. We will review it shortly.', 'success');
            setShowReportDialog(false);
            setReportReason('');
        } catch (err) {
            notify(err.message || 'Failed to report review', 'error');
        } finally {
            setReporting(false);
        }
    };

    return (
        <div className={`glass-panel ${styles.reviewCard}`}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.userInfo}>
                    <img
                        src={review.profiles?.avatar || 'https://ui-avatars.com/api/?name=User'}
                        alt={review.profiles?.name || 'User'}
                        className={styles.avatar}
                    />
                    <div>
                        <div className={styles.userName}>
                            {review.profiles?.name || 'Anonymous'}
                            {review._weight > 2.5 && (
                                <span title="Top Contributor (High Reputation)" style={{ marginLeft: '6px', display: 'inline-flex', verticalAlign: 'middle' }}>
                                    <Icon name="medal" size={14} />
                                </span>
                            )}
                            {review._weight >= 1.5 && review._weight <= 2.5 && (
                                <span title="Verified Player (Confirmed presence)" style={{ marginLeft: '6px', display: 'inline-flex', verticalAlign: 'middle', color: 'var(--color-success, #22c55e)' }}>
                                    <Icon name="check" size={14} />
                                </span>
                            )}
                        </div>
                        <div className={styles.date}>{formattedDate}</div>
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    {isOwnReview ? (
                        <>
                            <button
                                onClick={() => onEdit && onEdit(review)}
                                className={styles.actionButton}
                                title="Edit review"
                                aria-label="Edit review"
                            >
                                <Icon name="edit" size={16} />
                            </button>
                            <button
                                onClick={handleDelete}
                                className={styles.actionButton}
                                disabled={deleting}
                                title="Delete review"
                                aria-label="Delete review"
                            >
                                {deleting ? <Icon name="clock" size={16} /> : <Icon name="trash" size={16} />}
                            </button>
                        </>
                    ) : (
                        user && (
                            <button
                                onClick={() => setShowReportDialog(true)}
                                className={styles.reportButton}
                                title="Report review"
                                aria-label="Report review"
                            >
                                <Icon name="warning" size={16} />
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Rating */}
            <div className={styles.rating} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StarRating rating={review.rating} size="small" />
                {review.played_sport && (
                    <span
                        style={{
                            fontSize: '0.8rem',
                            background: 'rgba(255,255,255,0.1)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        Played {review.played_sport} 🎾
                    </span>
                )}
            </div>

            {/* Comment */}
            <p className={styles.comment}>{review.comment}</p>

            {/* Images */}
            {review.images && review.images.length > 0 && (
                <div className={styles.images}>
                    {review.images.map((img, idx) => (
                        <div key={idx} className={styles.imageWrapper}>
                            <img
                                src={img}
                                alt={`Review image ${idx + 1}`}
                                className={styles.image}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Report Dialog */}
            {showReportDialog && (
                <div className={styles.reportDialog}>
                    <div className={styles.reportOverlay} onClick={() => setShowReportDialog(false)} />
                    <div className={`glass-panel ${styles.reportContent}`}>
                        <h4 className={styles.reportTitle}>Report Review</h4>
                        <p className={styles.reportSubtitle}>
                            Help us maintain a respectful community. What&apos;s wrong with this review?
                        </p>
                        <form onSubmit={handleReport}>
                            <textarea
                                className={styles.reportTextarea}
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                placeholder="Please describe the issue..."
                                rows={4}
                                required
                            />
                            <div className={styles.reportActions}>
                                <button
                                    type="button"
                                    onClick={() => setShowReportDialog(false)}
                                    className="btn-secondary"
                                    disabled={reporting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={reporting}
                                >
                                    {reporting ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
