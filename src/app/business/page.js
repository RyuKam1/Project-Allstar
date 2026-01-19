"use client";
import React from 'react';
import Link from 'next/link';
import Navbar from "@/components/Layout/Navbar";

export default function BusinessLandingPage() {
    return (
        <>
            <Navbar />
            <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '60px' }} className="container">

                {/* Header: Simple & Direct */}
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 4vw, 3rem)',
                        fontWeight: '800',
                        marginBottom: '16px'
                    }}>
                        Manage Your <span className="primary-gradient-text">Venue Presence</span>
                    </h1>
                    <p style={{
                        fontSize: '1.1rem',
                        color: 'var(--text-muted)',
                        maxWidth: '600px',
                        margin: '0 auto',
                        lineHeight: 1.6
                    }}>
                        Control your official profile, manage operating hours, and connect with the community.
                        Your players are already here.
                    </p>
                </div>

                {/* Two Paths Action Area */}
                <div className="grid-auto-fit" style={{ gap: '30px', marginBottom: '80px', alignItems: 'stretch' }}>

                    {/* Path 1: Claim Existing */}
                    <div className="glass-panel" style={{
                        padding: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        borderLeft: '4px solid var(--color-primary)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            background: 'rgba(var(--color-primary-rgb), 0.1)',
                            width: '60px',
                            height: '60px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px'
                        }}>📍</div>

                        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Already on the map?</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', flex: 1 }}>
                            Search for your venue to verify ownership. We'll transfer control to you while
                            keeping all existing community reviews and activity history intact.
                        </p>

                        <Link href="/business/claim" style={{ width: '100%' }}>
                            <button className="btn-primary" style={{ width: '100%' }}>
                                Find & Claim Venue
                            </button>
                        </Link>
                    </div>

                    {/* Path 2: Add New */}
                    <div className="glass-panel" style={{
                        padding: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        borderLeft: '4px solid var(--text-muted)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            background: 'rgba(255,255,255, 0.05)',
                            width: '60px',
                            height: '60px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px',
                            border: '1px solid var(--border-glass)'
                        }}>➕</div>

                        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>New to AllStar?</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', flex: 1 }}>
                            Create a pristine official venue profile from scratch. Configure your sports,
                            upload high-quality images, and go live immediately.
                        </p>

                        <Link href="/business/add" style={{ width: '100%' }}>
                            <button className="btn-secondary" style={{ width: '100%' }}>
                                Create New Venue
                            </button>
                        </Link>
                    </div>

                </div>

                {/* Philosophy / Features Grid */}
                <div style={{ padding: '0 20px' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '1.25rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        Platform Philosophy
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>

                        {/* Feature 1 */}
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>⚡</div>
                            <div>
                                <h4 style={{ margin: '0 0 8px' }}>Active Community Momentum</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    We show <strong>Play Intent</strong>, not just bookings. See when people are actually planning to go,
                                    encouraging spontaneous play and filling gaps.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>🔗</div>
                            <div>
                                <h4 style={{ margin: '0 0 8px' }}>External-First Booking</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    We don't try to replace your booking system. We link directly to it.
                                    Keep using your existing tools; we just send you the traffic.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>🛡️</div>
                            <div>
                                <h4 style={{ margin: '0 0 8px' }}>Integrity & Control</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    You control the official details (Hours, Rules). The community contributes social energy.
                                    Neither can overwrite the other.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </>
    );
}
