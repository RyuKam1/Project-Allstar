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
  const [showPassword, setShowPassword] = useState(false);

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
          <div className={`glass-panel ${styles.authCard} ${styles.loggedInCard}`}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.loggedInMessage}>
              You are already signed in as{" "}
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
          <h2 className={styles.storyTitle}>Your city&apos;s pickup games live here.</h2>
          <p className={styles.storyText}>
            Book courts, join teams, and find tournaments without digging through group chats.
          </p>
        </div>
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
              <label className={styles.label} htmlFor="login-password">Password</label>
              <div className={styles.passwordWrap}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="••••••••"
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
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className={styles.footer}>
            Don&apos;t have an account? <Link href="/register" className={styles.link}>Sign Up</Link>
          </p>
        </div>
        </div>
      </div>
    </main>
  );
}
