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

  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
        <div className={styles.navLeft}>
            <div className={styles.logo}>
            <Link href="/" className={`primary-gradient-text ${styles.logoLink}`}>
                AllStar
            </Link>
            </div>
            
            {/* Desktop Nav Links */}
            <div className={styles.desktopNavLinks}>
                <Link href="/venues" className={styles.navLink}>Venues</Link>
                <Link href="/teams" className={styles.navLink}>Teams</Link>
                <Link href="/events" className={styles.navLink}>Events</Link>
                <Link href="/community" className={styles.navLink}>Community</Link>
            </div>
        </div>

        <div className={styles.navRight}>
            {/* Search Toggle */}
            <button 
                className={`${styles.iconButton} ${isSearchOpen ? styles.active : ''}`}
                onClick={toggleSearch}
                aria-label="Search"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </button>

            <div className={styles.authButtons}>
            {user ? (
                <>
                <Link href="/profile" className={styles.profileLink} onClick={closeMobileMenu}>
                    <img src={user.avatar} alt="Profile" className={styles.avatar} />
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
                    Login
                </button>
                </Link>
            )}
            </div>
             <button 
                className={styles.menuToggle}
                onClick={toggleMobileMenu}
            >
                {mobileMenuOpen ? '✕' : '☰'}
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
                    <option value="Players">Players</option>
                    <option value="Teams">Teams</option>
                    <option value="Events">Events</option>
                    <option value="Tournaments">Tournaments</option>
                </select>
                <div className={styles.searchDivider}></div>
                <input 
                    id="global-search-input"
                    type="text" 
                    placeholder="Search for players, teams, events..." 
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className={styles.searchInput}
                />
                <button onClick={() => setIsSearchOpen(false)} className={styles.closeSearch}>✕</button>
           </div>

           {/* Results Dropdown */}
            {showResults && searchQuery && (
                <div className={styles.resultsDropdown}>
                    {isSearching ? (
                        <div className={styles.resultLoading}>Searching...</div>
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
    </>
  );
}
