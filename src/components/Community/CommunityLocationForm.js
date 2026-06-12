"use client";
import React, { useState, useEffect } from 'react';
import { communityLocationService } from '@/services/communityLocationService';
import { useAuth } from '@/context/AuthContext';
import { ModalDismissButton } from '@/components/UI/primitives';
import { COMMUNITY_IMAGE_MAX_COUNT, compressCommunityImageFile } from '@/lib/storageImages';
import { getCatalogSportLabels } from '@/lib/sportsCatalog';
import styles from './community-location-form.module.css';

export default function CommunityLocationForm({ initialCoords, onSuccess, onCancel }) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        description: '',
        sports: [],
        lat: initialCoords?.lat || '',
        lng: initialCoords?.lng || ''
    });

    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const availableSports = getCatalogSportLabels({ includeOther: true });

    async function fetchAddress(lat, lng) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.display_name) {
                setFormData(prev => ({ ...prev, address: data.display_name }));
            }
        } catch (err) {
            console.error("Failed to fetch address", err);
        }
    }

    useEffect(() => {
        if (initialCoords) {
            setFormData(prev => ({
                ...prev,
                lat: initialCoords.lat,
                lng: initialCoords.lng
            }));
            fetchAddress(initialCoords.lat, initialCoords.lng);
        }
    }, [initialCoords]);

    useEffect(() => {
        return () => {
            imagePreviews.forEach((url) => {
                if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, [imagePreviews]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleSport = (sport) => {
        setFormData(prev => {
            const current = prev.sports;
            if (current.includes(sport)) {
                return { ...prev, sports: current.filter(s => s !== sport) };
            }
            return { ...prev, sports: [...current, sport] };
        });
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length + images.length > COMMUNITY_IMAGE_MAX_COUNT) {
            setError(`Maximum ${COMMUNITY_IMAGE_MAX_COUNT} images allowed`);
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
            setError('You must be logged in to add a location');
            return;
        }

        if (!formData.name.trim()) {
            setError('Location name is required');
            return;
        }
        if (formData.sports.length === 0) {
            setError('Please select at least one sport');
            return;
        }
        if (!formData.lat || !formData.lng) {
            setError('Location coordinates are missing');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await communityLocationService.createLocation(
                parseFloat(formData.lat),
                parseFloat(formData.lng),
                formData.name,
                formData.description,
                formData.address,
                formData.sports,
                images
            );

            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to create location');
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.titleRow}>
                <div>
                    <h2 className={styles.title}>Add Community Spot</h2>
                    <p className={styles.subtitle}>Share a new place to play with the community.</p>
                </div>
                <ModalDismissButton
                    onClick={onCancel}
                    label="Close add location form"
                    disabled={isSubmitting}
                />
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                    <label className={styles.label}>Location Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. 5th St. Court"
                        className={styles.input}
                        maxLength={100}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Address</label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Auto-detecting address..."
                        className={styles.input}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Details about the surface, lighting, vibe..."
                        className={styles.textarea}
                        maxLength={500}
                        rows={3}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Sports (Select all that apply) *</label>
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

                <div className={styles.field}>
                    <label className={styles.label}>Images (Max {COMMUNITY_IMAGE_MAX_COUNT}, compressed)</label>
                    <div className={styles.imageUploadContainer}>
                        <input
                            type="file"
                            id="loc-images"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            className={styles.hiddenInput}
                            disabled={images.length >= COMMUNITY_IMAGE_MAX_COUNT}
                        />
                        <label htmlFor="loc-images" className={styles.uploadButton}>
                            <span>+ Add Photos</span>
                        </label>

                        <div className={styles.imagePreviews}>
                            {imagePreviews.map((img, idx) => (
                                <div key={idx} className={styles.previewItem}>
                                    <img src={img} alt={`Preview ${idx + 1}`} className={styles.previewImage} />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className={styles.removeBtn}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.coordsInfo}>
                    <span>📍 {parseFloat(formData.lat).toFixed(5)}, {parseFloat(formData.lng).toFixed(5)}</span>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.actions}>
                    <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Add to Map'}
                    </button>
                </div>
            </form>
        </div>
    );
}

