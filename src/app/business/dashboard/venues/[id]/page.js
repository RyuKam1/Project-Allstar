"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from "@/components/Layout/Navbar";
import { businessService } from '@/services/businessService';
import { supabase } from '@/lib/supabaseClient';
import { uploadCompressedImage } from '@/lib/imageOptimizer';
import styles from './venue-editor.module.css';

const SPORT_OPTIONS = ["Basketball", "Soccer", "Tennis", "Baseball", "Volleyball", "Fitness", "Running", "Skating", "Multi-sport", "Pickleball"];

export default function VenueEditorPage() {
    const params = useParams();
    const router = useRouter();
    const venueId = params.id;

    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Initial State
    const [venue, setVenue] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address: '',
        sports: [],
        images: [], // Array of { image_url: string } or similar
        hours: '',
        bookingUrl: '',
        bookingPhone: ''
    });

    const [analyticsData, setAnalyticsData] = useState({ activeCount: 0, totalIntents: 0 });

    useEffect(() => {
        loadVenue();
    }, [venueId]);

    const loadVenue = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            let targetVenue = null;
            let type = 'community'; // default

            // 1. Try Community Location
            const { data: commData, error: commError } = await supabase
                .from('community_locations')
                .select('*')
                .eq('id', venueId)
                .eq('created_by', user.id)
                .single();

            if (commData) {
                targetVenue = commData;
                type = 'community';
            } else {
                // 2. Try Official Venue
                // We use 'venues' table directly instead of 'business_venues' view to be safe
                const { data: officialData, error: officialError } = await supabase
                    .from('venues')
                    .select('*')
                    .eq('id', venueId)
                    .eq('owner_id', user.id)
                    .single();

                if (officialData) {
                    targetVenue = officialData;
                    type = 'business';
                }
            }

            if (!targetVenue) {
                console.error("Venue not found or access denied");
                router.push('/business/dashboard');
                return;
            }

            setVenue({ ...targetVenue, type });

            // Fetch Images separately from location_images table
            const { data: imageRows } = await supabase
                .from('location_images')
                .select('*')
                .eq('location_id', venueId);

            const loadedImages = imageRows ? imageRows.map(row => ({
                id: row.id,
                image_url: row.image_url
            })) : [];

            setFormData({
                name: targetVenue.name,
                description: targetVenue.description || '',
                address: targetVenue.address || (targetVenue.location || ''),
                sports: targetVenue.sports || (targetVenue.sport ? [targetVenue.sport] : []),
                images: loadedImages,
                bannerUrl: targetVenue.banner_image_url || '', // Load banner
                coverUrl: targetVenue.image_url || '', // Load cover
                hours: targetVenue.operating_hours || '',
                bookingUrl: targetVenue.booking_config?.url || '',
                bookingPhone: targetVenue.booking_config?.phone || ''
            });

            // Load Analytics (Parallel)
            // 1. Total Intents (All time)
            const { count: totalIntents } = await supabase
                .from('play_intents')
                .select('id', { count: 'exact', head: true })
                .eq('location_id', venueId);

            // 2. Active Now (From Service or DB)
            const { count: activeCount } = await supabase
                .from('play_intents')
                .select('id', { count: 'exact', head: true })
                .eq('location_id', venueId)
                .gt('expires_at', new Date().toISOString());

            setAnalyticsData({
                totalIntents: totalIntents || 0,
                activeCount: activeCount || 0
            });

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // ... (rest of methods)

    const setBanner = (url) => {
        setFormData(prev => ({ ...prev, bannerUrl: url }));
        setHasChanges(true);
    };

    const setCover = (url) => {
        setFormData(prev => ({ ...prev, coverUrl: url }));
        setHasChanges(true);
    };



    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const toggleSport = (sport) => {
        setFormData(prev => {
            const exists = prev.sports.includes(sport);
            const newSports = exists
                ? prev.sports.filter(s => s !== sport)
                : [...prev.sports, sport];
            return { ...prev, sports: newSports };
        });
        setHasChanges(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const url = await uploadCompressedImage(file, 'allstar-assets', `venues/${venueId}`);

            if (url) {
                // Insert into DB immediately
                const { data: newImg, error: dbError } = await supabase
                    .from('location_images')
                    .insert({
                        location_id: venueId,
                        image_url: url,
                        uploaded_by: user.id
                    })
                    .select()
                    .single();

                if (dbError) throw dbError;

                // Update Local State
                const newImageObj = { id: newImg.id, image_url: url };
                const updatedImages = [...formData.images, newImageObj];
                setFormData(prev => ({ ...prev, images: updatedImages }));
                // Don't setHasChanges(true) because it's already saved
            } else {
                alert("Failed to upload image file.");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving image: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = async (index) => {
        const imageToDelete = formData.images[index];
        if (!confirm("Delete this image?")) return;

        try {
            if (imageToDelete.id) {
                await supabase.from('location_images').delete().eq('id', imageToDelete.id);
            }

            const updatedImages = formData.images.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, images: updatedImages }));
        } catch (error) {
            console.error("Error deleting image", error);
            alert("Failed to delete image");
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            console.log("Saving changes for venue ID:", venueId, "Type:", venue.type);

            if (venue.type === 'community') {
                // Update Community Location
                const { error: locError } = await supabase
                    .from('community_locations')
                    .update({
                        name: formData.name,
                        description: formData.description,
                        address: formData.address,
                        sports: formData.sports,
                        banner_image_url: formData.bannerUrl,
                        image_url: formData.coverUrl,
                        operating_hours: formData.hours, // Assuming we add these cols or they exist
                        // storing booking config in description or separate generic col if needed?
                        // For now let's assume community_locations schema supports these or we ignore them
                    })
                    .eq('id', venueId);

                if (locError) throw new Error("Failed to update community location: " + locError.message);
            
            } else {
                // Update Official Venue
                // 1. Basic Info
                const { error: venueError } = await supabase
                    .from('venues')
                    .update({
                        name: formData.name,
                        description: formData.description,
                        // address? venues usually uses 'location' or coords. Let's try flexible update.
                        // schema: name, description, sport, amenities...
                    })
                    .eq('id', venueId);
                
                if (venueError) console.warn("Basic info update warning:", venueError);

                // 2. Settings (Hours, etc)
                await businessService.updateVenueSettings(venueId, {
                    operating_hours: formData.hours,
                    booking_config: {
                        method: 'external_link',
                        url: formData.bookingUrl,
                        phone: formData.bookingPhone,
                        label: 'Book Now'
                    }
                });
            }

            setHasChanges(false);
            alert("Changes saved successfully!");
            loadVenue();
        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Editor...</div>;
    }

    return (
        <main>
            <Navbar />
            <div className={styles.container}>
                <Link href="/business/dashboard" className={styles.backLink}>
                    ← Back to Dashboard
                </Link>

                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>{formData.name || 'Untitled Venue'}</h1>
                        <div className={styles.subtitle}>Official Venue Editor</div>
                    </div>
                    <a
                        href={`/locations/${venueId}?type=community`}
                        target="_blank"
                        className="btn-secondary"
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                    >
                        View Public Page ↗
                    </a>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'details' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Details & Info
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'gallery' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('gallery')}
                    >
                        Gallery & Banner
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'booking' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('booking')}
                    >
                        Booking & Contact
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'analytics' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        Analytics
                    </button>
                </div>

                {activeTab === 'details' && (
                    <div className={styles.panel}>
                        <h2 className={styles.sectionTitle}>Basic Information</h2>
                        <div className={styles.formGrid}>
                            <div className={styles.fullWidth}>
                                <label className={styles.label}>Venue Name</label>
                                <input
                                    className={styles.input}
                                    value={formData.name}
                                    onChange={e => handleInputChange('name', e.target.value)}
                                />
                            </div>

                            <div className={styles.fullWidth}>
                                <label className={styles.label}>Description</label>
                                <textarea
                                    className={styles.textarea}
                                    value={formData.description}
                                    onChange={e => handleInputChange('description', e.target.value)}
                                />
                            </div>

                            <div className={styles.fullWidth}>
                                <label className={styles.label}>Address</label>
                                <input
                                    className={styles.input}
                                    placeholder="123 Sport Street, City, State"
                                    value={formData.address}
                                    onChange={e => handleInputChange('address', e.target.value)}
                                />
                            </div>

                            <div className={styles.fullWidth}>
                                <label className={styles.label}>Available Activities ({formData.sports.length} selected)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {SPORT_OPTIONS.map(sport => {
                                        const isSelected = formData.sports.includes(sport);
                                        return (
                                            <button
                                                key={sport}
                                                onClick={() => toggleSport(sport)}
                                                className={isSelected ? 'btn-primary' : 'btn-secondary'}
                                                style={{
                                                    padding: '8px 16px',
                                                    fontSize: '0.9rem',
                                                    opacity: isSelected ? 1 : 0.7
                                                }}
                                            >
                                                {sport} {isSelected && '✓'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'gallery' && (
                    <div className={styles.panel}>
                        <h2 className={styles.sectionTitle}>Gallery & Appearance</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            Manage your venue's visual appearance. Hover over an image to set it as <strong>Banner</strong> or <strong>Cover</strong>.
                        </p>

                        <div className={styles.imageGrid}>
                            {formData.images.map((img, idx) => {
                                const isBanner = formData.bannerUrl === img.image_url;
                                const isCover = formData.coverUrl === img.image_url;

                                return (
                                    <div key={idx} className={`${styles.imageCard} ${isBanner ? styles.isBanner : ''} ${isCover ? styles.isCover : ''} ${(isBanner && isCover) ? styles.isBoth : ''}`}>
                                        <img src={img.image_url} className={styles.cardImage} alt="Venue" />

                                        {/* Status Badges */}
                                        <div className={styles.badges}>
                                            {isBanner && <span className={`${styles.badge} ${styles.badgeBanner}`}>BANNER</span>}
                                            {isCover && <span className={`${styles.badge} ${styles.badgeCover}`}>COVER</span>}
                                        </div>

                                        {/* Delete Button (Always visible on top right) */}
                                        <button
                                            onClick={() => removeImage(idx)}
                                            className={styles.deleteBtn}
                                            title="Delete Image"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 6L6 18M6 6l12 12"></path>
                                            </svg>
                                        </button>

                                        {/* Hover Overlay with Actions */}
                                        <div className={styles.imageOverlay}>
                                            <button
                                                onClick={() => setBanner(img.image_url)}
                                                className={`${styles.actionBtn} ${isBanner ? styles.active : ''}`}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill={isBanner ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                                </svg>
                                                {isBanner ? 'Banner Set' : 'Set Banner'}
                                            </button>

                                            <button
                                                onClick={() => setCover(img.image_url)}
                                                className={`${styles.actionBtn} ${isCover ? styles.active : ''}`}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill={isCover ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                    <polyline points="21 15 16 10 5 21"></polyline>
                                                </svg>
                                                {isCover ? 'Cover Set' : 'Set Cover'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Upload Button */}
                            <label className={styles.uploadLabel}>
                                <span style={{ fontSize: '2rem' }}>{uploading ? '⏳' : '+'}</span>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '10px' }}>{uploading ? 'Uploading...' : 'Add Image'}</span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
                            </label>
                        </div>
                    </div>
                )}

                {activeTab === 'booking' && (
                    <div className={styles.panel}>
                        <h2 className={styles.sectionTitle}>Booking Configuration</h2>
                        <div className={styles.formGrid}>
                            <div className={styles.fullWidth}>
                                <label className={styles.label}>Operating Hours (Text)</label>
                                <input
                                    className={styles.input}
                                    placeholder="e.g. Mon-Fri 9am-10pm, Sat-Sun 8am-8pm"
                                    value={formData.hours || ''}
                                    onChange={e => handleInputChange('hours', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className={styles.label}>Booking / Website URL</label>
                                <input
                                    className={styles.input}
                                    placeholder="https://..."
                                    value={formData.bookingUrl}
                                    onChange={e => handleInputChange('bookingUrl', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className={styles.label}>Public Phone Number</label>
                                <input
                                    className={styles.input}
                                    placeholder="(555) ..."
                                    value={formData.bookingPhone}
                                    onChange={e => handleInputChange('bookingPhone', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className={styles.panel}>
                        <h2 className={styles.sectionTitle}>Performance Analytics</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analyticsData?.activeCount || 0}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Active Players Now</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analyticsData?.totalIntents || 0}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Total Play Intents</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>Coming Soon</div>
                                <div style={{ color: 'var(--text-muted)' }}>Page Views</div>
                            </div>
                        </div>

                        <h3 style={{ marginBottom: '1rem', color: 'white' }}>Recent Activity</h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Detailed historical charts and page view tracking are being collected and will appear here shortly.
                        </p>
                    </div>
                )}
            </div>
            {hasChanges && (
                <div className={styles.saveBar}>
                    <span style={{ color: 'white' }}>You have unsaved changes</span>
                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => {
                            setHasChanges(false);
                            loadVenue(); // Reset
                        }}
                    >
                        Discard
                    </button>
                </div>
            )}
        </main>
    );
}
