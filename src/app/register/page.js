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
  const { register, user, loading, logout } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  if (loading) return null;

  if (user) {
    const isBusiness = user.account_type === 'business' || user.role === 'business' || user.user_metadata?.role === 'business';
    const dashboardLink = isBusiness ? '/business/dashboard' : '/profile';

    return (
      <main className={styles.main}>
        <Navbar />
        <div className={styles.authWrapper}>
          <div className={`glass-panel ${styles.authCard} ${styles.loggedInCard}`}>
            <h1 className={styles.title}>You made it!</h1>
            <p className={styles.loggedInMessage}>
              You are already part of the team,{" "}
              <span className={`primary-gradient-text ${styles.loggedInName}`}>
                {user.name || user.email}
              </span>
            </p>

            <div className={styles.loggedInActions}>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="btn-secondary"
              >
                Go home
              </button>

              <button
                type="button"
                onClick={() => router.push(dashboardLink)}
                className="btn-primary"
              >
                Go to dashboard
              </button>

              <button
                type="button"
                onClick={logout}
                className="btn-secondary"
              >
                Log out
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
      <div className={styles.authLayout}>
        <div className={styles.authStory}>
          <h2 className={styles.storyTitle}>Find your court. Build your crew.</h2>
          <p className={styles.storyText}>
            Create a player profile or register your venue to manage bookings and listings.
          </p>
        </div>
        <div className={styles.authWrapper}>
          <div className={`glass-panel ${styles.authCard}`}>
            <h1 className={styles.title}>
              Join the <span className="primary-gradient-text">Team</span>
            </h1>

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <div className={styles.accountTypeToggle}>
              <button
                type="button"
                onClick={() => setAccountType('player')}
                className={`${styles.accountTypeOption} ${accountType === 'player' ? styles.accountTypeOptionActive : ''}`}
              >
                Player
              </button>
              <button
                type="button"
                onClick={() => setAccountType('business')}
                className={`${styles.accountTypeOption} ${accountType === 'business' ? styles.accountTypeOptionActive : ''}`}
              >
                Business
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="register-name">Full Name</label>
                <input
                  id="register-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="register-email">Email Address</label>
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '2.5rem' }}>
                <label className={styles.label} htmlFor="register-password">Password</label>
                <div className={styles.passwordWrap}>
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
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
      </div>
    </main>
  );
}
