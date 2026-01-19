"use client";
import React, { useState } from 'react';
import { communityLocationService } from '@/services/communityLocationService';
import { interactionTrackingService } from '@/services/interactionTrackingService';
import { useAuth } from '@/context/AuthContext';
import styles from './community-location-form.module.css'; // Reusing styles

/**
 * EditLocationForm Component
 * Allows community members to suggest edits
 */
export default function EditLocationForm({ location, onSuccess, onCancel }) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: location.name || '',
        description: location.description || '',
        address: location.address || '',
        sports: location.sports || [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [images, setImages] = useState([]); // Base64 strings for NEW gallery images
    const [bannerImage, setBannerImage] = useState(null); // Base64 for Banner
    const [cardImage, setCardImage] = useState(null); // Base64 for Card

    const availableSports = [
        'Basketball', 'Football', 'Soccer', 'Tennis', 'Volleyball',
        'Baseball', 'Skateboarding', 'Running', 'Fitness', 'Other'
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleSport = (sport) => {
        setFormData(prev => {
            const current = prev.sports;
            if (current.includes(sport)) {
                return { ...prev, sports: current.filter(s => s !== sport) };
            } else {
                return { ...prev, sports: [...current, sport] };
            }
        });
    };

    const handleSingleImageUpload = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be under 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'banner') setBannerImage(reader.result);
            if (type === 'card') setCardImage(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleGalleryUpload = (e) => {
        const files = Array.from(e.target.files);
        const totalImages = (location.images?.length || 0) + images.length + files.length;

        if (totalImages > 10) {
            setError('Maximum 10 images allowed per location');
            return;
        }

        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Each image must be under 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('Must be logged in to edit');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const promises = [];

            // Standard fields
            if (formData.name !== location.name) {
                promises.push(communityLocationService.submitEdit(location.id, 'name', formData.name));
            }
            if (formData.description !== location.description) {
                promises.push(communityLocationService.submitEdit(location.id, 'description', formData.description));
            }
            if (formData.address !== location.address) {
                promises.push(communityLocationService.submitEdit(location.id, 'address', formData.address));
            }
            if (formData.address !== location.address) {
                promises.push(communityLocationService.submitEdit(location.id, 'address', formData.address));
            }

            // Sports
            const sportsChanged = JSON.stringify(formData.sports.sort()) !== JSON.stringify((location.sports || []).sort());
            if (sportsChanged) {
                promises.push(communityLocationService.submitEdit(location.id, 'sports', formData.sports));
            }

            // Banner & Card Images (New Schema Columns)
            if (bannerImage) {
                promises.push(communityLocationService.submitEdit(location.id, 'banner_image_url', bannerImage));
            }
            if (cardImage) {
                promises.push(communityLocationService.submitEdit(location.id, 'card_image_url', cardImage));
            }

            // Gallery Images (Existing Logic)
            if (images.length > 0) {
                const imagePromises = images.map(img =>
                    communityLocationService.uploadImage(location.id, img)
                );
                await Promise.all(imagePromises);

                await interactionTrackingService.trackImageUpload(location.id, 'community');
            }

            if (promises.length === 0 && images.length === 0) {
                setError('No changes detected');
                setIsSubmitting(false);
                return;
            }

            await Promise.all(promises);

            if (promises.length > 0) {
                await interactionTrackingService.trackEdit(location.id, 'community');
            }

            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to submit edits');
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container} style={{ maxWidth: '500px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className={styles.title}>Suggest Edits</h2>
            <p className={styles.subtitle}>Help improve this spot for everyone.</p>

            <form onSubmit={handleSubmit} className={styles.form}>

                {/* Specific Image Sections */}
                <div className={styles.uploadGrid}>
                    <div className={styles.field}>
                        <label className={styles.label}>Banner Image</label>
                        <div className={styles.uploadZone} onClick={() => document.getElementById('banner-upload').click()}>
                            {bannerImage ? (
                                <>
                                    <img src={bannerImage} alt="Banner" className={styles.previewImage} />
                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={(e) => { e.stopPropagation(); setBannerImage(null); }}
                                    >
                                        ×
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className={styles.uploadIcon}>🖼️</span>
                                    <span className={styles.uploadText}>Hero Banner</span>
                                </>
                            )}
                            <input
                                id="banner-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSingleImageUpload(e, 'banner')}
                                className={styles.hiddenInput}
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Card Image</label>
                        <div className={styles.uploadZone} onClick={() => document.getElementById('card-upload').click()}>
                            {cardImage ? (
                                <>
                                    <img src={cardImage} alt="Card" className={styles.previewImage} />
                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={(e) => { e.stopPropagation(); setCardImage(null); }}
                                    >
                                        ×
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className={styles.uploadIcon}>📱</span>
                                    <span className={styles.uploadText}>Card Thumbnail</span>
                                </>
                            )}
                            <input
                                id="card-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSingleImageUpload(e, 'card')}
                                className={styles.hiddenInput}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={styles.input}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Address</label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={styles.input}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Address</label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={styles.input}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className={styles.textarea}
                        rows={4}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Sports</label>
                    <div className={styles.sportsGrid}>
                        {availableSports.map(sport => (
                            <button
                                key={sport}
                                type="button"
                                className={`${styles.sportChip} ${formData.sports.includes(sport) ? styles.active : ''}`}
                                onClick={() => toggleSport(sport)}
                            >
                                {sport}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Gallery Upload Section */}
                <div className={styles.field}>
                    <label className={styles.label}>Gallery Photos</label>
                    <div className={styles.imageUploadContainer}>
                        <input
                            type="file"
                            id="edit-loc-images"
                            multiple
                            accept="image/*"
                            onChange={handleGalleryUpload}
                            className={styles.hiddenInput}
                            disabled={images.length >= 5}
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="edit-loc-images" className={styles.uploadButton} style={{
                            display: 'inline-block',
                            padding: '10px 15px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginBottom: '10px'
                        }}>
                            <span>+ Add Gallery Photos</span>
                        </label>

                        <div className={styles.imagePreviews} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {images.map((img, idx) => (
                                <div key={idx} className={styles.previewItem} style={{ position: 'relative', width: '80px', height: '80px' }}>
                                    <img src={img} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        style={{
                                            position: 'absolute',
                                            top: '-5px',
                                            right: '-5px',
                                            background: 'red',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '20px',
                                            height: '20px',
                                            cursor: 'pointer',
                                            lineHeight: '20px',
                                            padding: 0
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.actions}>
                    <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Submit Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
