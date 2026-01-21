"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Layout/Navbar'; // Import Navbar
import Link from 'next/link';
import { communityLocationService } from '@/services/communityLocationService';
import { venueService } from '@/services/venueService';
import { playIntentService } from '@/services/playIntentService';
import { interactionTrackingService } from '@/services/interactionTrackingService';
import { supabase } from '@/lib/supabaseClient';
import PlayIntentForm from '@/components/PlayIntent/PlayIntentForm';
import EditLocationForm from '@/components/Community/EditLocationForm'; // Import Edit Form
import ActivityTimeline from '@/components/PlayIntent/ActivityTimeline';
import ReviewStats from '@/components/Reviews/ReviewStats';
import ReviewList from '@/components/Reviews/ReviewList';
import ReviewForm from '@/components/Reviews/ReviewForm';
import { reviewService } from '@/services/reviewService'; // Import Service
import Map from '@/components/UI/Map';
import PendingEditsList from '@/components/Community/PendingEditsList'; // Import correctly at top
import { useAuth } from '@/context/AuthContext';
import ImageLightbox from '@/components/UI/ImageLightbox';
import { getPlayButtonText } from '@/lib/sportUtils';
import styles from './location-detail.module.css';

export default function LocationDetailPage() {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const typeParam = searchParams.get('type'); // 'community' or 'business'

    const { user } = useAuth();
    const [location, setLocation] = useState(null);
    const [locationType, setLocationType] = useState(typeParam || 'community');
    const [loading, setLoading] = useState(true);
    const [showPlayForm, setShowPlayForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false); // New State
    const [activePlayerCount, setActivePlayerCount] = useState(0);
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState(null);
    const [showReviewForm, setShowReviewForm] = useState(false);

    // Lightbox State
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Determine type based on ID format if not meant in param
    // UUID = Community (usually), Integer = Business (Legacy)
    useEffect(() => {
        if (!typeParam) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            setLocationType(isUUID ? 'community' : 'business');
        }
    }, [id, typeParam]);

    const [fetchedAddress, setFetchedAddress] = useState(null);

    useEffect(() => {
        loadLocationData();
        // Track visit
        if (location && locationType) {
            interactionTrackingService.trackVisit(id, locationType);
        }

        // Real-time Player Count Subscription
        const channel = supabase
            .channel(`location_header_${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'play_intents',
                    filter: `location_id=eq.${id}`
                },
                () => {
                    // Update just the count
                    playIntentService.getActivePlayerCount(id, locationType)
                        .then(count => setActivePlayerCount(count))
                        .catch(err => console.error(err));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, locationType]);

    // Auto-fetch address if missing
    useEffect(() => {
        if (location && !location.address && location.lat && location.lng && !fetchedAddress) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.display_name) {
                        setFetchedAddress(data.display_name);
                    }
                })
                .catch(err => console.error("Failed to auto-fetch address:", err));
        }
    }, [location, fetchedAddress]);

    const loadLocationData = async () => {
        setLoading(true);
        try {
            // First: Check if this is actually a business user by trying to fetch as venue
            // Use the API-enabled venueService
            const venueData = await venueService.getVenueById(id);

            // If it's a valid DB venue (has booking config, price etc), REDIRECT immediately
            // We verify by checking if it returned an object and has 'isDbVenue' or distinct business props
            if (venueData && (venueData.isDbVenue || venueData.bookingConfig?.price)) {
                console.log("Redirecting to Venue Page...", venueData);
                window.location.href = `/venues/${id}`; // Force hard redirect to be safe
                return;
            }

            let data = null;
            if (locationType === 'community') {
                data = await communityLocationService.getLocationById(id);
            } else {
                data = venueData;
            }
            setLocation(data);

            // Get active player count
            const count = await playIntentService.getActivePlayerCount(id, locationType);
            setActivePlayerCount(count);

            // Get Reviews & Stats
            const [fetchedReviews, stats] = await Promise.all([
                reviewService.getReviews(id, locationType),
                reviewService.getReviewStats(id, locationType)
            ]);
            setReviews(fetchedReviews);
            setReviewStats(stats);

        } catch (error) {
            console.error('Failed to load location:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayIntentSuccess = () => {
        setShowPlayForm(false);
        loadLocationData(); // Refresh counts
    };

    if (loading) {
        return <div className={styles.loading}>Loading location...</div>;
    }

    if (!location) {
        return <div className={styles.notFound}>Location not found</div>;
    }

    // Normalize fields
    const name = location.name || `Venue #${location.id}`;
    const description = location.description || location.about || 'No description available.';

    // Image Logic: 
    // 1. Community Banner: location.banner_image_url
    // 2. Community First Image: location.images[0].image_url
    // 3. Business/Fallback: location.image_url
    // 4. Default
    let image = '/placeholder-court.jpg';
    if (location.banner_image_url) {
        image = location.banner_image_url;
    } else if (location.images?.[0]?.image_url) {
        image = location.images[0].image_url;
    } else if (location.image_url) {
        image = location.image_url;
    } else if (location.image) {
        // Direct property (from updated venues.js)
        image = location.image;
    } else if (locationType === 'business') {
        // Fallback for any legacy venues still missing explicit image
        image = `/venues/${name}.jpg`;
    }

    const sports = location.sports || (location.sport ? [location.sport] : []);

    return (
        <div className={styles.container}>
            <Navbar /> {/* Add Navbar */}

            {/* Hero Section */}
            <div className={styles.hero}>
                <div className={styles.heroImageContainer}>
                    <img src={image} alt={name} className={styles.heroImage} />
                    <div className={styles.heroOverlay} />
                </div>

                <div className={styles.heroContent}>
                    <div className={styles.badges}>
                        {locationType === 'business' && <span className={styles.officialBadge}>Official Venue</span>}
                        {locationType === 'community' && <span className={styles.communityBadge}>Community Spot</span>}
                    </div>

                    <h1 className={styles.title}>{name}</h1>

                    <div className={styles.meta}>
                        <div className={styles.rating}>
                            {reviewStats?.totalReviews > 0 ? (
                                <>
                                    <span className={styles.star}>★</span>
                                    {reviewStats.averageRating} ({reviewStats.totalReviews} reviews)
                                </>
                            ) : (
                                <span className={styles.noRating}>New Spot</span>
                            )}
                        </div>
                        {sports.map(s => <span key={s} className={styles.sportTag}>{s}</span>)}
                    </div>

                    <div className={styles.activeIndicator}>
                        <span className={styles.pulseDot}></span>
                        {activePlayerCount} people playing soon
                    </div>
                </div>
            </div>

            <div className={styles.contentGrid}>
                {/* Main Content */}
                <div className={styles.mainColumn}>

                    {/* Play Intent / Action Section */}
                    <section className={styles.section}>
                        <div className={styles.playHeader}>
                            <h2 className={styles.sectionTitle}>Activity</h2>

                            <div className={styles.actionGroup}>
                                {/* Logic: If it has a booking link, show Book. Otherwise, standard Play flow (even for businesses) */}
                                {locationType === 'business' && location.booking_link ? (
                                    <button
                                        className={styles.btnProfessional}
                                        onClick={() => window.open(location.booking_link, '_blank')}
                                    >
                                        Book Now
                                    </button>
                                ) : (
                                    /* Dynamic Play Text for everyone else (Community OR Free Business) */
                                    <button
                                        onClick={() => setShowPlayForm(true)}
                                        className="btn-primary"
                                    >
                                        {getPlayButtonText(location.sports || location.sport)}
                                    </button>
                                )}
                            </div>
                        </div>

                        <ActivityTimeline
                            locationId={id}
                            locationType={locationType}
                            onJoinBlock={(time) => {
                                // Open form pre-filled with this time? 
                                // For now just open form
                                setShowPlayForm(true);
                            }}
                        />
                    </section>

                    {/* Description */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>About</h2>
                        <p className={styles.description}>{description}</p>
                    </section>



                    {/* Image Gallery */}
                    {(location.images?.length > 0 || location.gallery?.length > 0) && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Gallery</h2>
                            <div className={styles.galleryGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {/* Combine all images for the lightbox logic */}
                                {(() => {
                                    // Collect all image URLs
                                    const allImages = [
                                        ...(location.images?.map(i => i.image_url) || []),
                                        ...(location.gallery || [])
                                    ];

                                    return allImages.map((imgUrl, idx) => (
                                        <div
                                            key={idx}
                                            style={{ aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                                            onClick={() => {
                                                setLightboxIndex(idx);
                                                setIsLightboxOpen(true);
                                            }}
                                        >
                                            <img
                                                src={imgUrl}
                                                alt={`Gallery ${idx}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                            />
                                        </div>
                                    ));
                                })()}
                            </div>
                        </section>
                    )}

                    {/* Lightbox */}
                    {isLightboxOpen && (
                        <ImageLightbox
                            images={[
                                ...(location.images?.map(i => i.image_url) || []),
                                ...(location.gallery || [])
                            ]}
                            initialIndex={lightboxIndex}
                            onClose={() => setIsLightboxOpen(false)}
                        />
                    )}

                    {/* Reviews */}
                    <section className={styles.section}>
                        <div className={styles.playHeader}> {/* Reusing playHeader for same flex layout */}
                            <h2 className={styles.sectionTitle}>What people are saying</h2>
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    // Scroll to review form or open modal?
                                    // For now, let's open the Review Form in a modal (reusing edit form logic kind of)
                                    // But we don't have a Review Modal state yet.
                                    // Let's add one quickly or assume we add it. 
                                    // Actually, let's check if we have a Review Modal. No.
                                    // I'll add `showReviewForm` state.
                                    setShowReviewForm(true);
                                }}
                            >
                                Write a Review
                            </button>
                        </div>
                        <div className={styles.reviewListPlaceholder}>
                            <ReviewList
                                reviews={reviews}
                                onReviewDeleted={loadLocationData}
                            />
                        </div>
                    </section>


                </div>



                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarContainerInternal}>

                        {/* Owner: Pending Edits */}
                        {user && location && user.id === location.created_by && (
                            <PendingEditsList
                                locationId={id}
                                onUpdate={loadLocationData}
                            />
                        )}

                        <div className={styles.sidebarCard}>
                            <h3>Location</h3>
                            <div className={styles.miniMap}>
                                {location.lat && location.lng ? (
                                    <Map
                                        venues={[location]}
                                        minimal={true}
                                        initialCenter={[location.lat, location.lng]}
                                        initialZoom={15}
                                        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '2rem' }}>🗺️</span>
                                )}
                            </div>
                            <AddressDisplay
                                address={location.address || fetchedAddress}
                                lat={location.lat}
                                lng={location.lng}
                            />
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.directionsLink}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                    <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                                </svg>
                                <span>Get Directions</span>
                            </a>
                        </div>

                        {/* Reviews Card */}
                        <div className={styles.sidebarCard}>
                            <h3>Reviews</h3>
                            <ReviewStats stats={reviewStats} />

                            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', marginTop: '1rem' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Played here recently?</p>
                                <button
                                    className={styles.secondaryButton}
                                    style={{ width: '100%', fontSize: '0.9rem', padding: '10px' }}
                                    onClick={() => setShowReviewForm(true)}
                                >
                                    Write a Review
                                </button>
                            </div>
                        </div>

                        {locationType === 'community' && (
                            <div className={styles.sidebarCard}>
                                <h3>Contributors</h3>
                                <p>Added by {location.created_by_name || 'Community Member'}</p>
                                <button
                                    className={styles.secondaryButton}
                                    onClick={() => setShowEditForm(true)}
                                >
                                    Suggest Edit
                                </button>
                            </div>
                        )}

                        {locationType === 'business' && (
                            <div className={styles.sidebarCard}>
                                <h3>Info</h3>
                                <p>Opening Hours: 08:00 - 22:00</p>
                                <button className={styles.secondaryButton}>Contact Venue</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Play Intent Modal */}
            {showPlayForm && (
                <PlayIntentForm
                    locationId={id}
                    locationType={locationType}
                    locationName={name}
                    availableSports={sports} // Pass context for sport selection
                    onSuccess={handlePlayIntentSuccess}
                    onCancel={() => setShowPlayForm(false)}
                />
            )}

            {/* Edit Location Modal */}
            {showEditForm && location && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div className="glass-panel" style={{ background: '#1a1a1a', padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
                        <EditLocationForm
                            location={location}
                            onSuccess={() => {
                                setShowEditForm(false);
                                loadLocationData(); // Refresh to see applied edits (if auto-applied)
                            }}
                            onCancel={() => setShowEditForm(false)}
                        />
                    </div>
                </div>
            )}

            {/* Review Form Modal */}
            {showReviewForm && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div className="glass-panel" style={{ background: '#1a1a1a', padding: '0', borderRadius: '16px', overflow: 'hidden', width: '100%', maxWidth: '600px' }}>
                        <ReviewForm
                            locationId={id}
                            locationType={locationType}
                            venueName={name}
                            availableSports={sports} // Pass retrieved sports
                            onSuccess={() => {
                                setShowReviewForm(false);
                                loadLocationData();
                            }}
                            onCancel={() => setShowReviewForm(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function AddressDisplay({ address, lat, lng }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Inline styles for simplicity
    const containerStyle = { marginBottom: '1rem' };
    const addressStyle = { marginBottom: '0.25rem' };
    const coordsStyle = { fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' };
    const btnStyle = {
        background: 'none',
        border: 'none',
        color: 'var(--color-primary)',
        fontSize: '0.9em',
        marginLeft: '5px',
        cursor: 'pointer',
        padding: 0,
        textDecoration: 'underline'
    };

    if (!address) {
        return (
            <div style={containerStyle}>
                <div style={coordsStyle}>
                    {lat?.toFixed(5)}, {lng?.toFixed(5)}
                </div>
            </div>
        );
    }

    const isLong = address.length > 50;
    const displayAddr = isExpanded || !isLong ? address : `${address.substring(0, 50)}...`;

    return (
        <div style={containerStyle}>
            <div style={addressStyle}>
                {displayAddr}
                {isLong && (
                    <button onClick={() => setIsExpanded(!isExpanded)} style={btnStyle}>
                        {isExpanded ? 'Show Less' : 'View Full'}
                    </button>
                )}
            </div>
            <div style={coordsStyle}>
                {lat?.toFixed(5)}, {lng?.toFixed(5)}
            </div>
        </div>
    );
}
