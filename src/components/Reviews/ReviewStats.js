"use client";
import React from 'react';
import StarRating from './StarRating';
import styles from './review-stats.module.css';

/**
 * ReviewStats Component
 * Displays aggregate review statistics with weighted average and distribution
 * @param {object} stats - Review statistics object
 * @param {number} stats.averageRating - Weighted average rating
 * @param {number} stats.totalReviews - Total number of reviews
 * @param {object} stats.distribution - Star distribution (5: count, 4: count, etc.)
 */
export default function ReviewStats({ stats }) {
    if (!stats || stats.totalReviews === 0) {
        return (
            <div className={`glass-panel ${styles.statsCard}`}>
                <div className={styles.noReviews}>
                    <div className={styles.noReviewsIcon}>⭐</div>
                    <div className={styles.noReviewsText}>No reviews yet</div>
                </div>
            </div>
        );
    }

    const { averageRating, totalReviews, distribution } = stats;

    // Calculate percentages for distribution bars
    const getPercentage = (count) => {
        return totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    };

    return (
        <div className={`glass-panel ${styles.statsCard}`}>
            {/* Overall Rating */}
            <div className={styles.overallRating}>
                <div className={styles.ratingNumber}>{averageRating.toFixed(1)}</div>
                <div className={styles.ratingStars}>
                    <StarRating rating={averageRating} size="medium" />
                </div>
                <div className={styles.totalReviews}>
                    Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </div>
            </div>

            {/* Distribution */}
            <div className={styles.distribution}>
                {[5, 4, 3, 2, 1].map((stars) => {
                    const count = distribution[stars] || 0;
                    const percentage = getPercentage(count);

                    return (
                        <div key={stars} className={styles.distributionRow}>
                            <div className={styles.starLabel}>
                                {stars} <span className={styles.starIcon}>★</span>
                            </div>
                            <div className={styles.barContainer}>
                                <div
                                    className={styles.bar}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <div className={styles.count}>{count}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
