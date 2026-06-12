"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from "@/components/Layout/Navbar";
import { useAuth } from '@/context/AuthContext';
import { businessService } from '@/services/businessService';

export default function BusinessOnboardingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [status, setStatus] = useState(null); // none | pending | verified | suspended
    const [working, setWorking] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                // Opt the user into business onboarding (none -> pending).
                const result = await businessService.requestBusinessAccount();
                if (!cancelled) setStatus(result || 'pending');
            } catch (e) {
                if (!cancelled) setError(e.message || 'Could not start onboarding.');
            } finally {
                if (!cancelled) setWorking(false);
            }
        })();

        return () => { cancelled = true; };
    }, [user, loading, router]);

    if (loading || working) {
        return (
            <>
                <Navbar />
                <div className="container" style={{ minHeight: '100dvh', paddingTop: '120px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Setting up your business onboarding…</p>
                </div>
            </>
        );
    }

    const isVerified = status === 'verified';

    return (
        <>
            <Navbar />
            <div className="container" style={{ minHeight: '100dvh', paddingTop: '100px', paddingBottom: '60px' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: '16px' }}>
                        Become a <span className="primary-gradient-text">Verified Business</span>
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
                        {isVerified
                            ? "You're verified. Head to your dashboard to manage your venues."
                            : "Your business account is pending verification. Choose how you'd like to get started — nothing goes live until an admin confirms ownership."}
                    </p>
                </div>

                {error && (
                    <div role="alert" style={{ maxWidth: '640px', margin: '0 auto 32px', color: 'var(--color-danger, #e5484d)', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                {isVerified ? (
                    <div style={{ textAlign: 'center' }}>
                        <button type="button" className="btn-primary" onClick={() => router.push('/business/dashboard')}>
                            Go to Dashboard
                        </button>
                    </div>
                ) : (
                    <div className="grid-auto-fit" style={{ gap: '30px', alignItems: 'stretch', maxWidth: '900px', margin: '0 auto' }}>
                        <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderLeft: '4px solid var(--color-primary)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📍</div>
                            <h2 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Claim an existing listing</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px', flex: 1 }}>
                                Your venue is already on the map. Search for it and verify ownership — the current
                                community maintainer keeps control until an admin approves your claim.
                            </p>
                            <Link href="/business/claim" className="btn-primary">Find &amp; claim my venue</Link>
                        </div>

                        <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderLeft: '4px solid var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🏟️</div>
                            <h2 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Propose a new venue</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px', flex: 1 }}>
                                Not listed yet? Submit your venue for review. It enters our verification queue and
                                only becomes an official listing once an admin approves it.
                            </p>
                            <Link href="/business/add" className="btn-secondary">Submit a venue proposal</Link>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
