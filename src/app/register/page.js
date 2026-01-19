"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Layout/Navbar';

import styles from '../login/auth.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('player');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await register(name, email, password, accountType);
    if (result.success) {
      if (accountType === 'business') {
        router.push('/business/dashboard');
      } else {
        router.push('/profile');
      }
    } else {
      setError(result.error || 'Registration failed');
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={styles.authWrapper}>
        <div className={`glass-panel ${styles.authCard}`}>
          <h1 className={styles.title}>
            Join the <span className="primary-gradient-text">Team</span>
          </h1>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setAccountType('player')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: accountType === 'player' ? '2px solid var(--color-primary)' : '1px solid var(--border-glass)',
                background: accountType === 'player' ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Player
            </button>
            <button
              type="button"
              onClick={() => setAccountType('business')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: accountType === 'business' ? '2px solid var(--color-primary)' : '1px solid var(--border-glass)',
                background: accountType === 'business' ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Business
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                placeholder="John Doe"
              />
            </div>

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
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p className={styles.footer}>
            Already have an account? <Link href="/login" className={styles.link}>Sign In</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
