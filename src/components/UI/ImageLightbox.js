"use client";
import React, { useEffect, useCallback } from 'react';
import styles from './image-lightbox.module.css';

export default function ImageLightbox({ images, initialIndex, onClose }) {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
    const [direction, setDirection] = React.useState('next');

    const handleNext = useCallback((e) => {
        e?.stopPropagation();
        setDirection('next');
        setCurrentIndex((prev) => (prev + 1) % images.length);
    }, [images.length]);

    const handlePrev = useCallback((e) => {
        e?.stopPropagation();
        setDirection('prev');
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, handleNext, handlePrev]);

    if (!images || images.length === 0) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <button className={styles.closeButton} onClick={onClose}>×</button>

            {/* Navigation Controls - Direct children of overlay for viewport positioning */}
            {images.length > 1 && (
                <>
                    <button
                        className={`${styles.navButton} ${styles.prev}`}
                        onClick={handlePrev}
                        aria-label="Previous image"
                    >
                        ❮
                    </button>
                    <button
                        className={`${styles.navButton} ${styles.next}`}
                        onClick={handleNext}
                        aria-label="Next image"
                    >
                        ❯
                    </button>
                </>
            )}

            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <img
                    key={currentIndex} // Force re-render for animation
                    src={images[currentIndex]}
                    alt={`Preview ${currentIndex + 1}`}
                    className={`${styles.image} ${direction === 'next' ? styles.slideNext : styles.slidePrev}`}
                />
            </div>

            {/* Dots at bottom */}
            {images.length > 1 && (
                <div className={styles.dots} onClick={(e) => e.stopPropagation()}>
                    {images.map((_, idx) => (
                        <span
                            key={idx}
                            className={`${styles.dot} ${idx === currentIndex ? styles.activeDot : ''}`}
                            onClick={() => setCurrentIndex(idx)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
