"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import Icon from '@/components/UI/Icon';
import { runGlobalSearch } from "@/services/globalSearchService";
import styles from './navbar.module.css';

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [filterType, setFilterType] = useState('All');

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { label: 'Venues', href: '/venues' },
        { label: 'Teams', href: '/teams' },
        { label: 'Events', href: '/events' },
        { label: 'Community', href: '/community' },
    ];

    if (user?.account_type === 'business') {
        navItems.push({
            label: 'Business Dashboard',
            href: '/business/dashboard',
            isSpecial: true
        });
    }

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.__allstarPrefetchDone) return;
        window.__allstarPrefetchDone = true;

        const prefetchRoutes = ['/', '/venues', '/teams', '/events', '/community', '/profile', '/login'];
        if (user?.account_type === 'business') {
            prefetchRoutes.push('/business/dashboard');
        }

        const runPrefetch = () => {
            prefetchRoutes.forEach((route) => {
                router.prefetch(route);
            });
        };

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(runPrefetch, { timeout: 1200 });
        } else {
            setTimeout(runPrefetch, 250);
        }
    }, [router, user?.account_type]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    useEffect(() => {
        if (!mobileMenuOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') closeMobileMenu();
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [mobileMenuOpen]);

    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
        if (!isSearchOpen) {
            setTimeout(() => document.getElementById('global-search-input')?.focus(), 100);
        }
    };

    // Search Handler
    const handleSearch = async (query, filter) => {
        setSearchQuery(query);
        if (query.trim().length === 0) {
            setSearchResults([]);
            setShowResults(false);
            setSearchError('');
            return;
        }

        setIsSearching(true);
        setShowResults(true);
        setSearchError('');

        try {
            const data = await runGlobalSearch(query, filter || filterType);
            setSearchResults(data);
        } catch (err) {
            console.error("Search error:", err);
            setSearchResults([]);
            setSearchError(err?.message || 'Search failed. Try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleFilterChange = (e) => {
        const newFilter = e.target.value;
        setFilterType(newFilter);
        handleSearch(searchQuery, newFilter);
    };

    const isActiveNav = (href) => {
        if (href === '/venues') {
            return pathname.startsWith('/venues') || pathname.startsWith('/locations');
        }
        if (href === '/events') {
            return pathname.startsWith('/events') || pathname.startsWith('/tournaments');
        }
        if (href === '/teams') {
            return pathname.startsWith('/teams');
        }
        if (href === '/community') {
            return pathname.startsWith('/community');
        }
        if (href === '/business/dashboard') {
            return pathname.startsWith('/business');
        }
        return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
    };

    return (
        <>
            <nav className={`glass-panel ${styles.nav}`}>
                <div className={styles.navLeft}>
                    <div className={styles.logo}>
                        <Link
                            href="/"
                            className={`primary-gradient-text ${styles.logoLink} ${pathname === '/' ? styles.logoActive : ''}`}
                        >
                            AllStar
                        </Link>
                    </div>

                    {/* Desktop Nav Links */}
                    <div className={styles.desktopNavLinks}>
                        {navItems.map((item) => (
                            <Link
                                href={item.href}
                                key={item.label}
                        className={`${styles.navLink} ${isActiveNav(item.href) ? styles.activeLink : ''} ${item.isSpecial ? styles.businessLink : ''}`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className={styles.navRight}>
                    <button
                        type="button"
                        className={`${styles.searchChip} ${isSearchOpen ? styles.searchChipActive : ''}`}
                        onClick={toggleSearch}
                        aria-label={isSearchOpen ? 'Close search' : 'Open search'}
                        aria-expanded={isSearchOpen}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span className={styles.searchChipLabel}>Search</span>
                    </button>

                    <div className={styles.authButtons}>
                        {user ? (
                            <div className={styles.profileMenuContainer} ref={profileMenuRef}>
                                <button
                                    className={styles.profileTrigger}
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    aria-label="User menu"
                                    suppressHydrationWarning
                                >
                                    <img src={user.avatar} alt="Profile" className={styles.avatar} />
                                </button>

                                {isProfileMenuOpen && (
                                    <div className={`glass-panel ${styles.profileDropdown}`}>
                                        <Link
                                            href={user.account_type === 'business' ? '/business/dashboard' : '/profile'}
                                            className={styles.dropdownItem}
                                            onClick={() => setIsProfileMenuOpen(false)}
                                        >
                                            <Icon name="user" size={16} className={styles.dropdownIcon} /> {user.account_type === 'business' ? 'Dashboard' : 'Profile'}
                                        </Link>
                                        <button
                                            onClick={() => { handleLogout(); setIsProfileMenuOpen(false); }}
                                            className={styles.dropdownItem}
                                        >
                                            <Icon name="logout" size={16} className={styles.dropdownIcon} /> Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                onClick={closeMobileMenu}
                                className={`btn-primary ${styles.getStartedButton}`}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                            >
                                Login
                            </Link>
                        )}
                    </div>
                    <button
                        className={styles.menuToggle}
                        onClick={toggleMobileMenu}
                    >
                        <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={22} />
                    </button>
                </div>
            </nav>

            {/* Expandable Search Bar */}
            <div className={`${styles.searchBarContainer} ${isSearchOpen ? styles.searchOpen : ''}`}>
                <div className={styles.searchBarInner}>
                    <select
                        value={filterType}
                        onChange={handleFilterChange}
                        className={styles.filterSelect}
                    >
                        <option value="All">All Categories</option>
                        <option value="Venues">Venues</option>
                        <option value="Players">Players</option>
                        <option value="Teams">Teams</option>
                        <option value="Events">Events</option>
                        <option value="Tournaments">Tournaments</option>
                    </select>
                    <div className={styles.searchDivider}></div>
                    <input
                        id="global-search-input"
                        type="text"
                        placeholder={
                            filterType === 'Venues'
                                ? 'Search courts, fields, gyms...'
                                : 'Search venues, players, teams, events...'
                        }
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                    <div className={styles.searchCloseZone}>
                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(false)}
                            className={styles.closeSearch}
                            aria-label="Close search"
                        >
                            <Icon name="close" size={18} />
                        </button>
                    </div>
                </div>

                {/* Results Dropdown */}
                {showResults && searchQuery && (
                    <div className={styles.resultsDropdown}>
                        {isSearching ? (
                            <div className={styles.resultLoading}>Searching...</div>
                        ) : searchError ? (
                            <div className={styles.resultEmpty}>{searchError}</div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((result) => (
                                <Link
                                    key={result.id}
                                    href={result.url_path}
                                    className={styles.resultItemLink}
                                    onClick={() => { setShowResults(false); setIsSearchOpen(false); setSearchQuery(''); }}
                                >
                                    <div className={styles.resultItem}>
                                        {result.image ? (
                                            <img src={result.image} alt="" className={styles.resultImage} />
                                        ) : (
                                            <div className={styles.resultPlaceholder}>{result.title[0]}</div>
                                        )}
                                        <div className={styles.resultInfo}>
                                            <div className={styles.resultTitle}>{result.title}</div>
                                            <div className={styles.resultSubtitle}>
                                                <span className={styles.resultType}>{result.type}</span> • {result.subtitle}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className={styles.resultEmpty}>No results found</div>
                        )}
                    </div>
                )}
            </div>

            {/* Mobile Menu Overlay */}
            <div
                className={`${styles.overlay} ${mobileMenuOpen ? styles.open : ''}`}
                onClick={closeMobileMenu}
            />

            {/* Mobile Menu Sidebar */}
            <div className={`${styles.navLinks} ${mobileMenuOpen ? styles.open : ''}`}>
                <div className={styles.mobileMenuHeader}>
                    <span className={styles.mobileMenuTitle}>Menu</span>
                    <button
                        type="button"
                        className={styles.mobileMenuClose}
                        onClick={closeMobileMenu}
                        aria-label="Close menu"
                    >
                        <Icon name="close" size={22} />
                    </button>
                </div>
                {navItems.map((item) => (
                    <Link
                        href={item.href}
                        key={item.label}
                        onClick={closeMobileMenu}
                        className={`${styles.navLink} ${isActiveNav(item.href) ? styles.activeLink : ''}`}
                    >
                        {item.label}
                    </Link>
                ))}
            </div>
        </>
    );
}
