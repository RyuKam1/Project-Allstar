"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { businessService } from '@/services/businessService';
import { uploadCompressedImage } from '@/lib/imageOptimizer';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Navbar from '@/components/Layout/Navbar';
import Map from '@/components/UI/Map'; // Map Integration
import styles from './dashboard.module.css';

const DashboardContent = () => {
    const { user, loading, updateUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // View State: 'manage' | 'claim' | 'add'
    const [viewMode, setViewMode] = useState('manage');
    const [venues, setVenues] = useState([]);
    const [isLoadingVenues, setIsLoadingVenues] = useState(true);

    // --- Profile Edit State ---
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', bio: '', avatar: '' });
    const [avatarFile, setAvatarFile] = useState(null);

    // --- Claim Flow State ---
    const [claimSearchQuery, setClaimSearchQuery] = useState('');
    const [claimResults, setClaimResults] = useState([]);
    const [isSearchingClaim, setIsSearchingClaim] = useState(false);
    const [selectedClaimVenue, setSelectedClaimVenue] = useState(null);
    const [claimForm, setClaimForm] = useState({ businessName: '', contactEmail: '', contactPhone: '' });
    const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

    // --- Add Flow State ---
    const [newVenueLocation, setNewVenueLocation] = useState(null);
    const [isAddingVenue, setIsAddingVenue] = useState(false); // Map mode

    // Initial Load & Auth Check
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?redirect=/business/dashboard');
        } else if (user) {
            setFormData({
                name: user.name || '',
                bio: user.bio || '',
                avatar: user.avatar || ''
            });
        }
    }, [user, loading, router]);

    // Check URL params for initial view (e.g. ?mode=add)
    useEffect(() => {
        const mode = searchParams.get('mode');
        if (mode && ['manage', 'claim', 'add'].includes(mode)) {
            setViewMode(mode);
        }
    }, [searchParams]);

    // Load Venues
    useEffect(() => {
        if (user) loadOwnedVenues();
    }, [user]);

    const loadOwnedVenues = async () => {
        try {
            const data = await businessService.getOwnedVenues();
            setVenues(data);
            // Default to 'manage' if venues exist and no specific mode requested
            if (data.length > 0 && !searchParams.get('mode')) {
                setViewMode('manage');
            } else if (data.length === 0 && !searchParams.get('mode')) {
                // Optionally default to 'claim' if no venues?
                // Let's stick to manage (empty state) for now to be less aggressive
            }
        } catch (error) {
            console.error("Failed to load venues:", error);
        } finally {
            setIsLoadingVenues(false);
        }
    };

    // --- Profile Handlers ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, avatar: reader.result }));
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        let finalAvatarUrl = formData.avatar;
        if (avatarFile) {
            const url = await uploadCompressedImage(avatarFile, 'allstar-assets', 'avatars');
            if (url) finalAvatarUrl = url;
        }
        const result = await updateUser({
            name: formData.name,
            bio: formData.bio,
            avatar: finalAvatarUrl
        });
        if (result.success) {
            setIsEditing(false);
            setAvatarFile(null);
        } else {
            alert("Failed to update profile: " + result.error);
        }
        setIsSaving(false);
    };

    // --- Claim Handlers ---
    // Debounced Search
    useEffect(() => {
        if (viewMode !== 'claim') return;

        const delayDebounceFn = setTimeout(async () => {
            if (claimSearchQuery.trim().length === 0) {
                setClaimResults([]);
                setIsSearchingClaim(false);
                return;
            }
            const { data, error } = await supabase
                .from('community_locations')
                .select('id, name, lat, lng, sports, description')
                .ilike('name', `%${claimSearchQuery}%`)
                .limit(10);
            if (!error) setClaimResults(data || []);
            setIsSearchingClaim(false);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [claimSearchQuery, viewMode]);

    const handleClaimInput = (e) => {
        setClaimSearchQuery(e.target.value);
        if (e.target.value.trim().length > 0) setIsSearchingClaim(true);
        else setIsSearchingClaim(false);
    };

    const handleSubmitClaim = async (e) => {
        e.preventDefault();
        setIsSubmittingClaim(true);
        try {
            // Search currently only returns community locations
            await businessService.claimVenue(selectedClaimVenue.id, claimForm, 'community');
            alert("Claim submitted! We will review it shortly.");
            setClaimSearchQuery('');
            setSelectedClaimVenue(null);
            setViewMode('manage'); // Return to dashboard
            loadOwnedVenues(); // Refresh list (pending item might appear if we supported showing pending claims)
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setIsSubmittingClaim(false);
        }
    };

    // --- Add Handlers ---
    const [addForm, setAddForm] = useState({ name: '', description: '', sports: [] });
    const [isCreatingVenue, setIsCreatingVenue] = useState(false);

    const SPORT_OPTIONS = ["Basketball", "Soccer", "Tennis", "Baseball", "Volleyball", "Fitness", "Running", "Skating", "Multi-sport"];

    const handleMapClick = (coords) => {
        setNewVenueLocation(coords);
    };

    const toggleSport = (sport) => {
        setAddForm(prev => {
            const exists = prev.sports.includes(sport);
            if (exists) return { ...prev, sports: prev.sports.filter(s => s !== sport) };
            if (prev.sports.length >= 3) return prev; // Max 3
            return { ...prev, sports: [...prev.sports, sport] };
        });
    };

    const handleAddVenueSubmit = async () => {
        if (!newVenueLocation) return;
        if (!addForm.name.trim()) { alert("Please enter a business name."); return; }
        if (addForm.sports.length === 0) { alert("Please select at least one sport."); return; }

        setIsCreatingVenue(true);
        try {
            await businessService.createBusinessVenue({
                name: addForm.name,
                description: addForm.description,
                sports: addForm.sports,
                lat: newVenueLocation.lat,
                lng: newVenueLocation.lng
            });

            alert("Venue created successfully!");

            // Reset and refresh
            setNewVenueLocation(null);
            setAddForm({ name: '', description: '', sports: [] });
            setViewMode('manage');
            loadOwnedVenues();
        } catch (error) {
            console.error(error);
            alert("Failed to create venue: " + error.message);
        } finally {
            setIsCreatingVenue(false);
        }
    };


    if (loading || isLoadingVenues) {
        return (
            <div className={styles.main} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <p>Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <main className={styles.main}>
            <Navbar />

            <div className={`container ${styles.container}`}>
                <div className={styles.dashboardGrid}>

                    {/* LEFT COLUMN: Navigation & Identity */}
                    <div className={styles.leftColumn}>

                        {/* Identity Card */}
                        <div className={`glass-panel ${styles.glassPanel} ${styles.identityCard}`}>
                            <div className={styles.avatarContainer}>
                                <img
                                    src={isEditing ? formData.avatar : (user?.avatar || "https://ui-avatars.com/api/?name=Business&background=random")}
                                    alt="Profile"
                                    className={styles.avatarImage}
                                />
                            </div>

                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <label htmlFor="avatar-upload" style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>CHANGE LOGO</label>
                                        <input id="avatar-upload" type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Business Name"
                                        className="input-field" // Reuse global style if available or inline
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '8px', color: 'white', width: '100%', textAlign: 'center' }}
                                    />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setIsEditing(false)} className={styles.subtleEditBtn}>Cancel</button>
                                        <button onClick={handleSaveProfile} className="btn-primary" style={{ flex: 1, padding: '6px' }} disabled={isSaving}>Save</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className={styles.businessName}>{user?.name}</h1>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className={styles.subtleEditBtn}
                                    >
                                        <span>✏️</span> Edit Profile
                                    </button>
                                </>
                            )}

                            {/* Navigation Buttons */}
                            <div className={styles.actionButtons} style={{ flexDirection: 'column', marginTop: '30px' }}>
                                <button
                                    onClick={() => setViewMode('manage')}
                                    className={viewMode === 'manage' ? 'btn-primary' : 'btn-secondary'}
                                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                                >
                                    <span>📊</span> Dashboard
                                </button>
                                <button
                                    onClick={() => { setViewMode('claim'); setSelectedClaimVenue(null); }}
                                    className={viewMode === 'claim' ? 'btn-primary' : 'btn-secondary'}
                                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                                >
                                    <span>🔍</span> Find & Claim Venue
                                </button>
                                <button
                                    onClick={() => { setViewMode('add'); setNewVenueLocation(null); }}
                                    className={viewMode === 'add' ? 'btn-primary' : 'btn-secondary'}
                                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                                >
                                    <span>📍</span> Add New Venue
                                </button>
                            </div>
                        </div>

                        {/* Mini Stats (Only show in Manage mode) */}
                        {viewMode === 'manage' && (
                            <div className={`glass-panel ${styles.glassPanel}`}>
                                <div className={styles.statsHeader}><h3>Quick Stats</h3></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className={styles.statCard}><div className={styles.statValue}>{venues.length}</div><div className={styles.statLabel}>Venues</div></div>
                                    <div className={styles.statCard}><div className={styles.statValue}>-</div><div className={styles.statLabel}>Views</div></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Dynamic Content */}
                    <div className={styles.rightColumn}>

                        {/* VIEW: MANAGE (Dashboard) */}
                        {viewMode === 'manage' && (
                            <div className={`glass-panel ${styles.glassPanel}`}>
                                <h2 style={{ marginBottom: '1.5rem' }}>Your Venues</h2>
                                {venues.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <p>You haven't added any venues yet.</p>
                                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            <button onClick={() => setViewMode('claim')} className="btn-primary">Find Existing</button>
                                            <button onClick={() => setViewMode('add')} className="btn-secondary">Add New</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.venueList}>
                                        {venues.map(v => (
                                            <div key={v.venue_id || v.id} className={styles.venueCard}>
                                                <div>
                                                    <h3 style={{ margin: '0 0 5px 0' }}>{v.name || v.community_locations?.name || 'Unnamed Venue'}</h3>
                                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                        {v.status === 'verified' ? '✅ Verified' : (v.status === 'active' ? '✅ Active' : '⏳ Pending')}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn-secondary"
                                                    style={{ fontSize: '0.9rem' }}
                                                    onClick={() => router.push(`/business/dashboard/venues/${v.venue_id}`)}
                                                >
                                                    Manage
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: CLAIM (Search & Form) */}
                        {viewMode === 'claim' && (
                            <div className={`glass-panel ${styles.glassPanel}`}>
                                {!selectedClaimVenue ? (
                                    <>
                                        <h2 style={{ marginBottom: '1rem' }}>Find Your Venue</h2>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Search for an existing community venue to claim ownership.</p>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder="Search venue name..."
                                                value={claimSearchQuery}
                                                onChange={handleClaimInput}
                                                style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white', fontSize: '1rem' }}
                                                autoFocus
                                            />
                                            {isSearchingClaim && <div style={{ position: 'absolute', right: '15px', top: '15px' }} className="jumping-dots"></div>}
                                        </div>

                                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {claimResults.map(venue => (
                                                <div
                                                    key={venue.id}
                                                    onClick={() => setSelectedClaimVenue(venue)}
                                                    className={styles.venueCard}
                                                    style={{ cursor: 'pointer', justifyContent: 'flex-start', gap: '15px' }}
                                                >
                                                    <div style={{ fontSize: '1.5rem' }}>📍</div>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold' }}>{venue.name}</div>
                                                        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{venue.sports?.join(', ')}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {!isSearchingClaim && claimResults.length === 0 && claimSearchQuery.trim().length > 0 && (
                                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No venues found. <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setViewMode('add')}>Add a new one?</span></div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    // Claim Form
                                    <div>
                                        <button onClick={() => setSelectedClaimVenue(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', marginBottom: '20px', cursor: 'pointer' }}>← Back to Search</button>
                                        <h2 style={{ marginBottom: '20px' }}>Claiming: <span className="primary-gradient-text">{selectedClaimVenue.name}</span></h2>
                                        <form onSubmit={handleSubmitClaim} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Official Business Name</label>
                                                <input required type="text" value={claimForm.businessName} onChange={e => setClaimForm({ ...claimForm, businessName: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white' }} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Contact Email</label>
                                                <input required type="email" value={claimForm.contactEmail} onChange={e => setClaimForm({ ...claimForm, contactEmail: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white' }} />
                                            </div>
                                            <button type="submit" className="btn-primary" disabled={isSubmittingClaim}>
                                                {isSubmittingClaim ? 'Submitting...' : 'Submit Claim Request'}
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: ADD (Map) */}
                        {viewMode === 'add' && (
                            <div className={`glass-panel ${styles.glassPanel}`} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px', position: 'relative' }}>
                                <div style={{ padding: '20px 20px 10px', zIndex: 10 }}>
                                    <h2 style={{ marginBottom: '5px' }}>Add New Venue</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Drop a pin on the location.</p>
                                </div>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <Map
                                        isAddingLocation={true}
                                        onMapClick={handleMapClick}
                                        style={{ height: '100%' }}
                                    />

                                    {/* Create Form Modal - Fixed Position */}
                                    {newVenueLocation && (
                                        <div style={{
                                            position: 'fixed',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            background: 'rgba(0,0,0,0.6)',
                                            zIndex: 2000,
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            padding: '20px'
                                        }}>
                                            <div style={{
                                                background: '#1a1a1a',
                                                border: '1px solid var(--border-glass)',
                                                borderRadius: '16px',
                                                width: '100%',
                                                maxWidth: '500px',
                                                padding: '25px',
                                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                maxHeight: '90vh',
                                                overflowY: 'auto'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                    <h3 style={{ fontSize: '1.4rem' }}>Verify & Create</h3>
                                                    <button onClick={() => setNewVenueLocation(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                                                </div>

                                                <div style={{ marginBottom: '15px' }}>
                                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#888' }}>Venue Name</label>
                                                    <input
                                                        type="text"
                                                        value={addForm.name}
                                                        onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                                                        placeholder="e.g. Downtown Sports Complex"
                                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white', fontSize: '1rem' }}
                                                        autoFocus
                                                    />
                                                </div>

                                                <div style={{ marginBottom: '15px' }}>
                                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#888' }}>Description</label>
                                                    <textarea
                                                        value={addForm.description}
                                                        onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                                                        placeholder="Short description of your facility..."
                                                        rows={3}
                                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white', fontSize: '0.95rem' }}
                                                    />
                                                </div>

                                                <div style={{ marginBottom: '25px' }}>
                                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '10px', color: '#888' }}>Sports Available (Max 3)</label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        {SPORT_OPTIONS.map(sport => (
                                                            <button
                                                                key={sport}
                                                                onClick={() => toggleSport(sport)}
                                                                style={{
                                                                    padding: '8px 16px',
                                                                    borderRadius: '24px',
                                                                    border: '1px solid',
                                                                    borderColor: addForm.sports.includes(sport) ? 'var(--color-primary)' : '#333',
                                                                    background: addForm.sports.includes(sport) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                                                    color: addForm.sports.includes(sport) ? 'var(--color-primary)' : '#aaa',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.9rem',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                {sport}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleAddVenueSubmit}
                                                    className="btn-primary"
                                                    style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}
                                                    disabled={isCreatingVenue}
                                                >
                                                    {isCreatingVenue ? 'Creating Venue...' : 'Create Business Venue'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </main>
    );
};

export default function BusinessDashboard() {
    return (
        <React.Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f0f0f', color: 'white' }}>
                <p>Loading Dashboard...</p>
            </div>
        }>
            <DashboardContent />
        </React.Suspense>
    );
}
