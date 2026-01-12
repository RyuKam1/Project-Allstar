"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import styles from './navbar.module.css';

import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filterType, setFilterType] = useState('All'); 

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

  // Search Handler
  const handleSearch = async (query, filter) => {
      setSearchQuery(query);
      if (query.trim().length === 0) {
          setSearchResults([]);
          setShowResults(false);
          return;
      }

      setIsSearching(true);
      setShowResults(true);

      try {
          const { data, error } = await supabase
              .rpc('search_all', { query: query, filter_type: filter || filterType });
          
          if (error) throw error;
          setSearchResults(data || []);
      } catch (err) {
          console.error("Search error:", err);
      } finally {
          setIsSearching(false);
      }
  };

  const handleFilterChange = (e) => {
      const newFilter = e.target.value;
      setFilterType(newFilter);
      handleSearch(searchQuery, newFilter);
  };

  return (
    <>
      <nav className={`glass-panel ${styles.nav}`}>
        <div className={styles.logo}>
          <Link href="/" className={`primary-gradient-text ${styles.logoLink}`}>
            AllStar
          </Link>
        </div>

        {/* Global Search Bar */}
        <div className={styles.searchContainer}>
            <div className={styles.inputWrapper}>
                <select 
                    value={filterType} 
                    onChange={handleFilterChange}
                    className={styles.filterSelect}
                >
                    <option value="All">All</option>
                    <option value="Players">Players</option>
                    <option value="Teams">Teams</option>
                    <option value="Events">Events</option>
                    <option value="Tournaments">Tournaments</option>
                </select>
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => { if(searchResults.length > 0) setShowResults(true); }}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    className={styles.searchInput}
                />
                <span className={styles.searchIcon}>🔍</span>
            </div>

            {/* Results Dropdown */}
            {showResults && searchQuery && (
                <div className={styles.resultsDropdown}>
                    {isSearching ? (
                        <div className={styles.resultItem}>Searching...</div>
                    ) : searchResults.length > 0 ? (
                        searchResults.map((result) => (
                            <Link 
                                key={result.id} 
                                href={result.url_path}
                                className={styles.resultItemLink}
                                onClick={() => { setShowResults(false); setSearchQuery(''); }}
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
                        <div className={styles.resultItem}>No results found</div>
                    )}
                </div>
            )}
        </div>

        <button 
          className={styles.menuToggle}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className={`${styles.navLinks} ${mobileMenuOpen ? styles.open : ''}`}>
          {[
            { label: 'Venues', href: '/venues' },
            { label: 'Teams', href: '/teams' },
            { label: 'Events & Tournaments', href: '/events' },
            { label: 'Community', href: '/community' }
          ].map((item) => (
            <Link 
              href={item.href} 
              key={item.label}
              className={styles.navLink}
              onClick={closeMobileMenu}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className={styles.authButtons}>
          {user ? (
            <>
              <Link href="/profile" className={styles.profileLink} onClick={closeMobileMenu}>
                <img src={user.avatar} alt="Profile" className={styles.avatar} />
                <span className={styles.userName}>{user.name}</span>
              </Link>
              <button 
                onClick={() => { handleLogout(); closeMobileMenu(); }}
                className={styles.logoutButton}
              >
                Log Out
              </button>
            </>
          ) : (
            <Link href="/login" onClick={closeMobileMenu}>
              <button className={`btn-primary ${styles.getStartedButton}`}>
                Get Started
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div 
        className={`${styles.overlay} ${mobileMenuOpen ? styles.open : ''}`}
        onClick={closeMobileMenu}
      />
    </>
  );
}
