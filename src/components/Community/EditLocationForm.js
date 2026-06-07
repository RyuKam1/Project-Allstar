"use client";
import React, { useState } from 'react';
import { communityLocationService } from '@/services/communityLocationService';
import { interactionTrackingService } from '@/services/interactionTrackingService';
import { useAuth } from '@/context/AuthContext';
import { ModalDismissButton } from '@/components/UI/primitives';
import { COMMUNITY_IMAGE_MAX_COUNT, compressCommunityImageFile } from '@/lib/storageImages';
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

    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

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

    const handleGalleryUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        const existingCount = location.images?.length || 0;
        const totalImages = existingCount + images.length + files.length;

        if (totalImages > COMMUNITY_IMAGE_MAX_COUNT) {
            setError(`Maximum ${COMMUNITY_IMAGE_MAX_COUNT} images allowed per location`);
            return;
        }

        setError('');

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                setError('Only image files are allowed');
                continue;
            }

            try {
                const compressed = await compressCommunityImageFile(file);
                const previewUrl = URL.createObjectURL(compressed);
                setImages(prev => [...prev, compressed]);
                setImagePreviews(prev => [...prev, previewUrl]);
            } catch (err) {
                console.error(err);
                setError(err.message || 'Failed to process image');
            }
        }

        e.target.value = '';
    };

    const removeImage = (index) => {
        setImagePreviews(prev => {
            const next = [...prev];
            const removed = next[index];
            if (removed?.startsWith('blob:')) URL.revokeObjectURL(removed);
            next.splice(index, 1);
            return next;
        });
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

            const sportsChanged = JSON.stringify(formData.sports.sort()) !== JSON.stringify((location.sports || []).sort());
            if (sportsChanged) {
                promises.push(communityLocationService.submitEdit(location.id, 'sports', formData.sports));
            }

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

            setIsSubmitting(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to submit edits');
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container} style={{ maxWidth: '500px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className={styles.titleRow}>
                <div>
                    <h2 className={styles.title}>Suggest Edits</h2>
                    <p className={styles.subtitle}>Help improve this spot for everyone.</p>
                </div>
                <ModalDismissButton
                    onClick={onCancel}
                    label="Close edit form"
                    disabled={isSubmitting}
                />
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
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
                    <label className={styles.label}>Gallery Photos (max {COMMUNITY_IMAGE_MAX_COUNT} total)</label>
                    <div className={styles.imageUploadContainer}>
                        <input
                            type="file"
                            id="edit-loc-images"
                            multiple
                            accept="image/*"
                            onChange={handleGalleryUpload}
                            className={styles.hiddenInput}
                            disabled={(location.images?.length || 0) + images.length >= COMMUNITY_IMAGE_MAX_COUNT}
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
                            {imagePreviews.map((img, idx) => (
                                <div key={idx} className={styles.previewItem} style={{ position: 'relative', width: '80px', height: '80px' }}>
                                    <img src={img} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
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
