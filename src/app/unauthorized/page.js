"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Layout/Navbar';

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <main style={{ minHeight: '100vh', background: 'var(--background)' }}>
            <Navbar />
            <div className="container" style={{ 
                height: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                paddingTop: '60px'
            }}>
                <div className="glass-panel" style={{ 
                    padding: '40px', 
                    maxWidth: '500px', 
                    width: '100%', 
                    textAlign: 'center',
                    borderTop: '4px solid #ef4444' 
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🛑</div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Access Denied</h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '30px', lineHeight: '1.6' }}>
                        You don't have permission to view this area. This section is restricted to registered business owners and administrators.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {/* Button 1: Home */}
                        <button 
                            onClick={() => router.push('/')}
                            className="btn-secondary"
                            style={{ width: '100%' }}
                        >
                            Back to Safety (Home)
                        </button>

                        {/* Button 2: Profile/Dashboard */}
                        <button 
                            onClick={() => router.push('/login')} 
                            className="btn-primary"
                            style={{ width: '100%' }}
                        >
                            Go to My Dashboard
                        </button>

                        {/* Button 3: Business Pitch (Since they were likely trying to go there) */}
                        <button 
                            onClick={() => router.push('/business')}
                            style={{ 
                                background: 'transparent', 
                                border: '1px solid var(--border-glass)', 
                                color: 'var(--text-muted)', 
                                padding: '12px', 
                                borderRadius: '8px', 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            className="hover-bg"
                        >
                            Learn About Business Accounts
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
