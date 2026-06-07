"use client";
import React, { useState } from 'react';
import ReviewCard from './ReviewCard';
import styles from './review-list.module.css';

/**
 * ReviewList Component
 * Displays all reviews for a venue with weighted ordering (invisible to users)
 * @param {Array} reviews - Array of review objects with weights
 * @param {function} onReviewDeleted - Callback when a review is deleted
 * @param {function} onReviewEdit - Callback when edit is requested
 */
export default function ReviewList({ reviews = [], onReviewDeleted, onReviewEdit }) {
    const [sortBy, setSortBy] = useState('weighted'); // weighted, recent, highest, lowest

    // Sort reviews based on selected option
    const sortedReviews = [...reviews].sort((a, b) => {
        switch (sortBy) {
            case 'weighted':
                // Already sorted by weight from service
                return (b._weight || 1) - (a._weight || 1);
            case 'recent':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'highest':
                return b.rating - a.rating;
            case 'lowest':
                return a.rating - b.rating;
            default:
                return 0;
        }
    });

    if (reviews.length === 0) {
        return (
            <div className={`glass-panel ${styles.emptyState}`}>
                <div className={styles.emptyIcon}>💭</div>
                <h3 className={styles.emptyTitle}>No reviews yet</h3>
                <p className={styles.emptyText}>
                    Be the first to share your experience at this venue
                </p>
            </div>
        );
    }

    return (
        <div className={styles.reviewList}>
            {/* Sort Controls */}
            <div className={styles.controls}>
                <div className={styles.reviewCount}>
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </div>
                <div className={styles.sortControls}>
                    <label htmlFor="sort-select" className={styles.sortLabel}>
                        Sort by:
                    </label>
                    <select
                        id="sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={styles.sortSelect}
                    >
                        <option value="weighted">Most Helpful</option>
                        <option value="recent">Most Recent</option>
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                    </select>
                </div>
            </div>

            {/* Review Cards */}
            <div className={styles.reviews}>
                {sortedReviews.map((review) => (
                    <ReviewCard
                        key={review.id}
                        review={review}
                        onDelete={onReviewDeleted}
                        onEdit={onReviewEdit}
                    />
                ))}
            </div>
        </div>
    );
}
