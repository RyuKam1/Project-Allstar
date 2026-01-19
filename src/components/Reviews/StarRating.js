"use client";
import React, { useState } from 'react';
import styles from './star-rating.module.css';

/**
 * StarRating Component
 * Displays and allows input of star ratings
 * @param {number} rating - Current rating (0-5)
 * @param {boolean} interactive - Whether stars are clickable
 * @param {function} onRatingChange - Callback when rating changes
 * @param {string} size - Size variant: 'small', 'medium', 'large'
 */
export default function StarRating({
    rating = 0,
    interactive = false,
    onRatingChange = null,
    size = 'medium'
}) {
    const [hoverRating, setHoverRating] = useState(0);

    const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

    const handleClick = (value) => {
        if (interactive && onRatingChange) {
            onRatingChange(value);
        }
    };

    const handleMouseEnter = (value) => {
        if (interactive) {
            setHoverRating(value);
        }
    };

    const handleMouseLeave = () => {
        if (interactive) {
            setHoverRating(0);
        }
    };

    return (
        <div
            className={`${styles.starRating} ${styles[size]} ${interactive ? styles.interactive : ''}`}
            role={interactive ? "radiogroup" : "img"}
            aria-label={`Rating: ${rating} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((value) => {
                const isFilled = value <= displayRating;
                const isHalfFilled = !interactive && value - 0.5 === displayRating;

                return (
                    <button
                        key={value}
                        type="button"
                        className={`${styles.star} ${isFilled ? styles.filled : ''} ${isHalfFilled ? styles.half : ''}`}
                        onClick={() => handleClick(value)}
                        onMouseEnter={() => handleMouseEnter(value)}
                        onMouseLeave={handleMouseLeave}
                        disabled={!interactive}
                        aria-label={`${value} star${value > 1 ? 's' : ''}`}
                        role={interactive ? "radio" : "presentation"}
                        aria-checked={interactive ? value === rating : undefined}
                    >
                        {isHalfFilled ? (
                            <svg viewBox="0 0 24 24" className={styles.starIcon}>
                                <defs>
                                    <linearGradient id={`half-${value}`}>
                                        <stop offset="50%" stopColor="var(--star-filled)" />
                                        <stop offset="50%" stopColor="var(--star-empty)" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                    fill={`url(#half-${value})`}
                                />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" className={styles.starIcon}>
                                <path
                                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                    fill={isFilled ? 'var(--star-filled)' : 'var(--star-empty)'}
                                />
                            </svg>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
