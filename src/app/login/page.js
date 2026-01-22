"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Layout/Navbar';

import styles from './auth.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user, loading, logout } = useAuth(); // Destructure user, loading, logout
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);
    if (result.success) {
      if (result.user?.account_type === 'business') {
        router.push('/business/dashboard');
      } else {
        router.push('/profile');
      }
    } else {
      setError(result.error || 'Login failed');
      setIsSubmitting(false);
    }
  };

  if (loading) return null; // Or spinner

  if (user) {
    const isBusiness = user.account_type === 'business' || user.role === 'business' || user.user_metadata?.role === 'business';
    const dashboardLink = isBusiness ? '/business/dashboard' : '/profile';

    return (
      <main className={styles.main}>
        <Navbar />
        <div className={styles.authWrapper}>
          <div className={`glass-panel ${styles.authCard}`} style={{ textAlign: 'center' }}>
            <h1 className={styles.title}>Welcome Back</h1>
            <div style={{ margin: '20px 0', fontSize: '1.2rem' }}>
              You are already logged in as <br/>
              <span className="primary-gradient-text" style={{ fontWeight: 'bold' }}>{user.name || user.email}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button 
                onClick={() => router.push('/')}
                className="btn-secondary"
                style={{ width: '100%' }}
              >
                Go Home
              </button>
              
              <button 
                onClick={() => router.push(dashboardLink)}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                Go to Dashboard
              </button>
              
              <button 
                onClick={logout}
                style={{ 
                  background: 'transparent', 
                  border: '1px solid #444', 
                  color: '#aaa', 
                  padding: '10px', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={styles.authWrapper}>
        <div className={`glass-panel ${styles.authCard}`}>
          <h1 className={styles.title}>
            Welcome <span className="primary-gradient-text">Back</span>
          </h1>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
              />
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '2.5rem' }}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className={`btn-primary ${styles.submitBtn}`}
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className={styles.footer}>
            Don't have an account? <Link href="/register" className={styles.link}>Sign Up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
