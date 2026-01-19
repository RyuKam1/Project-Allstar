"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Navbar from "@/components/Layout/Navbar";
import { businessService } from '@/services/businessService';

export default function ClaimVenuePage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        businessName: '',
        contactEmail: '',
        contactPhone: ''
    });

    // Real-time search with debounce
    React.useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim().length === 0) {
                setResults([]);
                setIsSearching(false);
                return;
            }

            // Perform search
            const { data, error } = await supabase
                .from('community_locations')
                .select('id, name, lat, lng, sports, description')
                .ilike('name', `%${searchQuery}%`)
                .limit(10);

            if (!error) {
                setResults(data || []);
            }
            setIsSearching(false);
        }, 300); // 300ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleInput = (e) => {
        setSearchQuery(e.target.value);
        if (e.target.value.trim().length > 0) {
            setIsSearching(true); // Show loading immediately while typing
        } else {
            setIsSearching(false);
        }
    };

    const handleClaimSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await businessService.claimVenue(selectedVenue.id, formData);
            alert("Claim request submitted! We will verify your details.");
            router.push('/business/dashboard');
        } catch (error) {
            console.error(error);
            alert("Error submitting claim: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="container" style={{ paddingTop: '100px', paddingBottom: '60px', maxWidth: '800px' }}>

                <h1 style={{ marginBottom: '10px' }}>Claim Your Venue</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>
                    Find your venue on Project AllStar and verify ownership to gain control.
                </p>

                {/* Step 1: Search */}
                {!selectedVenue && (
                    <div className="glass-panel" style={{ padding: '30px' }}>
                        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="Search venue name..."
                                value={searchQuery}
                                onChange={handleInput}
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                            />
                            <button type="button" className="btn-primary" disabled={isSearching} style={{ width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                🔍
                            </button>
                        </form>

                        <div style={{ marginTop: '20px' }}>
                            {isSearching && (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                    <span className="jumping-dots">Searching</span>
                                </div>
                            )}

                            {!isSearching && results.map(venue => (
                                <div
                                    key={venue.id}
                                    onClick={() => setSelectedVenue(venue)}
                                    style={{
                                        padding: '15px',
                                        borderBottom: '1px solid var(--border-glass)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    className="hover-bg"
                                >
                                    <div style={{ fontWeight: 'bold' }}>{venue.name}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        {venue.sports?.join(', ')} • {venue.description?.substring(0, 50)}...
                                    </div>
                                </div>
                            ))}

                            {!isSearching && results.length === 0 && searchQuery.trim().length > 0 && (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No venues found.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Claim Form */}
                {selectedVenue && (
                    <div className="glass-panel" style={{ padding: '40px' }}>
                        <button
                            onClick={() => setSelectedVenue(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', marginBottom: '20px', cursor: 'pointer' }}
                        >
                            ← Back to search
                        </button>

                        <h2 style={{ marginBottom: '20px' }}>Claiming: <span className="primary-gradient-text">{selectedVenue.name}</span></h2>

                        <form onSubmit={handleClaimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Official Business Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.businessName}
                                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                    className="input-field"
                                    placeholder="e.g. Downtown Sports LLC"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Business Email</label>
                                <input
                                    required
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                    className="input-field"
                                    placeholder="official@venue.com"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Phone Number</label>
                                <input
                                    required
                                    type="tel"
                                    value={formData.contactPhone}
                                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                    className="input-field"
                                    placeholder="(555) 123-4567"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white' }}
                                />
                            </div>

                            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(var(--color-primary-rgb), 0.1)', borderRadius: '8px' }}>
                                <p style={{ fontSize: '0.9rem' }}>
                                    By clicking submit, you confirm that you are the authorized representative of this venue.
                                    False claims may result in account suspension.
                                </p>
                            </div>

                            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
                                {loading ? 'Submitting...' : 'Submit Claim Request'}
                            </button>
                        </form>
                    </div>
                )}

            </div>
        </>
    );
}
