"use client";
import React, { useState, useEffect } from 'react';
import { communityLocationService } from '@/services/communityLocationService';
import { useAuth } from '@/context/AuthContext';
import styles from './community-location-form.module.css';

/**
 * CommunityLocationForm Component
 * Form for users to add new community locations
 * @param {Object} initialCoords - {lat, lng} from map pin drop
 * @param {function} onSuccess - Callback after successful creation
 * @param {function} onCancel - Callback to cancel
 */
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

    const [images, setImages] = useState([]); // Array of base64 strings
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Sports options
    const availableSports = [
        'Basketball', 'Football', 'Soccer', 'Tennis', 'Volleyball',
        'Baseball', 'Skateboarding', 'Running', 'Fitness', 'Other'
    ];

    useEffect(() => {
        if (initialCoords) {
            setFormData(prev => ({
                ...prev,
                lat: initialCoords.lat,
                lng: initialCoords.lng
            }));

            // Auto-fetch address
            fetchAddress(initialCoords.lat, initialCoords.lng);
        }
    }, [initialCoords]);

    const fetchAddress = async (lat, lng) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.display_name) {
                // Use the display name from Nominatim
                setFormData(prev => ({ ...prev, address: data.display_name }));
            }
        } catch (err) {
            console.error("Failed to fetch address", err);
        }
    };

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

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + images.length > 5) {
            setError('Maximum 5 images allowed');
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
            setError('You must be logged in to add a location');
            return;
        }

        // Basic Validation
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
                formData.address, // Pass address
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
            <h2 className={styles.title}>Add Community Spot</h2>
            <p className={styles.subtitle}>Share a new place to play with the community.</p>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Name */}
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

                {/* Address (Auto-filled) */}
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

                {/* Description */}
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

                {/* Sports Multi-Select */}
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

                {/* Image Upload */}
                <div className={styles.field}>
                    <label className={styles.label}>Images (Max 5)</label>
                    <div className={styles.imageUploadContainer}>
                        <input
                            type="file"
                            id="loc-images"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            className={styles.hiddenInput}
                            disabled={images.length >= 5}
                        />
                        <label htmlFor="loc-images" className={styles.uploadButton}>
                            <span>+ Add Photos</span>
                        </label>

                        <div className={styles.imagePreviews}>
                            {images.map((img, idx) => (
                                <div key={idx} className={styles.previewItem}>
                                    <img src={img} alt={`Preview ${idx}`} className={styles.previewImage} />
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

                {/* Coordinates Display (Read-onlyish) */}
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
