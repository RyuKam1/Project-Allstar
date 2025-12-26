"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Layout/Navbar';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);
    if (result.success) {
      router.push('/profile');
    } else {
      setError(result.error || 'Login failed');
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Welcome <span className="primary-gradient-text">Back</span>
          </h1>

          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.2)', 
              color: '#f87171', 
              padding: '10px', 
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--border-glass)', 
                  color: 'white',
                  borderRadius: '8px',
                  outline: 'none'
                }}
                placeholder="you@example.com"
              />
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--border-glass)', 
                  color: 'white',
                  borderRadius: '8px',
                  outline: 'none'
                }}
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSubmitting}
              style={{ width: '100%', opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Don't have an account? <Link href="/register" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Sign Up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
