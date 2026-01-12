"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { eventService } from "@/services/eventService";
import { tournamentService } from "@/services/tournamentService";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { teamService } from "@/services/teamService";
import styles from './events.module.css';

export default function EventsAndTournamentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Data State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [filterSport, setFilterSport] = useState('All');
  const [filterType, setFilterType] = useState('All'); // Tournament, Workshop, Match, etc.
  
  // Host Modal State
  const [showHostModal, setShowHostModal] = useState(false);
  const [hostType, setHostType] = useState('Tournament'); // or 'Event'
  const [allTeams, setAllTeams] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    sport: 'Basketball',
    date: '',
    location: '',
    cost: 'Free',
    type: 'Workshop',
    selectedTeams: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const [events, tournaments, teams] = await Promise.all([
            eventService.getAllEvents(),
            tournamentService.getAllTournaments(),
            teamService.getAllTeams()
        ]);

        // Normalize data structure for unified display
        const normalizedEvents = events.map(e => ({
            ...e,
            kind: 'Event', // To distinguish source
            routeId: e.id,
            displayType: e.type // e.g., "Workshop"
        }));

        const normalizedTournaments = tournaments.map(t => ({
            id: t.id,
            title: t.name,
            sport: t.sport,
            kind: 'Tournament',
            routeId: t.id,
            displayType: 'Tournament',
            location: 'Multiple Venues', // Default for tournaments unless specified
            date: 'Ongoing', // Could be dynamic
            cost: 'Entry Fee',
            reward: 'Trophy 🏆', // Generic
            imageGradient: 'linear-gradient(135deg, #FFD700, #FDB931)', // Goldish for Tournaments
            teams: t.teams
        }));

        setItems([...normalizedEvents, ...normalizedTournaments]);
        setAllTeams(teams);
    } catch (err) {
        console.error("Failed to load data", err);
    } finally {
        setLoading(false);
    }
  };

  const activeItems = items.filter(item => {
    if (filterSport !== 'All' && item.sport !== filterSport) return false;
    if (filterType !== 'All') {
        if (filterType === 'Tournament' && item.kind !== 'Tournament') return false;
        if (filterType !== 'Tournament' && item.kind === 'Tournament') return false; 
        // For sub-types of events (Workshop, Race)
        if (filterType !== 'Tournament' && item.kind === 'Event' && item.displayType !== filterType) return false;
    }
    return true;
  });

  const handleHostSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
        alert("Please login first");
        return;
    }

    try {
        if (hostType === 'Tournament') {
             if (formData.selectedTeams.length !== 4 && formData.selectedTeams.length !== 8) {
                alert("Please select 4 or 8 teams for the tournament bracket.");
                return;
             }
             await tournamentService.createTournament({
                name: formData.title,
                sport: formData.sport,
                teams: formData.selectedTeams
             }, user);
        } else {
             // Create standard event
             await eventService.createEvent({
                title: formData.title,
                sport: formData.sport,
                date: formData.date,
                location: formData.location,
                cost: formData.cost,
                type: hostType, 
                maxSpots: 20, // Default
                reward: 'Fun & Glory'
             }, user);
        }
        setShowHostModal(false);
        loadData(); // Refresh list
        alert(`${hostType} created successfully!`);
    } catch (err) {
        alert("Failed to create: " + err.message);
    }
  };

  const handleToggleTeam = (team) => {
    const selected = formData.selectedTeams;
    if (selected.find(t => t.id === team.id)) {
        setFormData({ ...formData, selectedTeams: selected.filter(t => t.id !== team.id) });
    } else {
        if (selected.length >= 8) return alert("Max 8 teams");
        setFormData({ ...formData, selectedTeams: [...selected, team] });
    }
  };

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={`container ${styles.contentContainer}`}>
        
        {/* Header Section */}
        <div className={styles.header}>
            <div>
                <h1 className={styles.title}>Discover <span className="primary-gradient-text">Events & Tournaments</span></h1>
                <p className={styles.subtitle}>Find tournaments, workshops, and matches or host your own.</p>
            </div>
            <button className="btn-primary" onClick={() => user ? setShowHostModal(true) : router.push('/login')}>
                + Host Event
            </button>
        </div>

        {/* Sport Filters */}
        <div className={styles.filterSection}>
            {['All', 'Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Fitness'].map(sport => (
                <button 
                    key={sport} 
                    onClick={() => setFilterSport(sport)}
                    className={`${styles.filterBtn} ${filterSport === sport ? styles.filterBtnActive : ''}`}
                >
                    {sport}
                </button>
            ))}
        </div>

        {/* Type Filters */}
        <div className={styles.filterSectionSecondary}>
            {['All', 'Tournament', 'Workshop', 'Race', 'Match'].map(type => (
                <button 
                    key={type} 
                    onClick={() => setFilterType(type)}
                    className={`${styles.typeBtn} ${filterType === type ? styles.typeBtnActive : ''}`}
                >
                    {type}
                </button>
            ))}
        </div>

        {/* Grid Listing */}
        {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div> : (
            <div className="grid-auto-fit">
                {activeItems.length === 0 && <div className={styles.emptyState}>No events found matching filters.</div>}
                
                {activeItems.map(item => (
                    <div 
                        key={`${item.kind}_${item.id}`} 
                        className={`${styles.card} glass-panel`}
                        onClick={() => router.push(item.kind === 'Tournament' ? `/tournaments/${item.routeId}` : `/events/${item.routeId}`)}
                    >
                          {/* Card Header Image/Gradient */}
                          <div className={styles.cardHeader} style={{ background: item.imageGradient }}>
                              {/* Content Image with Fallback */}
                              <img 
                                src={`/events/${item.title}.webp`} 
                                alt="" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={(e) => {
                                    // If local image fails, hide it and show emoji/kind specific placeholder
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className={styles.fallbackPlaceholder} style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                  <span className={styles.cardEmoji}>
                                     {item.sport === 'Basketball' ? '🏀' : item.sport === 'Soccer' ? '⚽' : '🏆'}
                                  </span>
                              </div>
                              <span className={styles.cardTag}>
                                 {item.displayType}
                              </span>
                          </div>
                         
                         <div className={styles.cardContent}>
                            <h3 className={styles.cardTitle}>{item.title}</h3>
                            
                            <div className={styles.cardMeta}>
                                <div className={styles.row}>
                                    <span>📅 {item.date}</span>
                                    <span className={styles.highlight}>{item.cost}</span>
                                </div>
                                <div className={styles.row}>
                                    <span>📍 {item.location}</span>
                                    <span>🏅 {item.reward}</span>
                                </div>
                            </div>
                         </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Host Modal */}
      {showHostModal && (
        <div className={styles.modalOverlay} onClick={() => setShowHostModal(false)}>
           <div className={`glass-panel ${styles.modal}`} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                  <h2 style={{ margin: 0 }}>Host an Event</h2>
                  <button onClick={() => setShowHostModal(false)} className={styles.modalClose}>×</button>
              </div>

              <div className={styles.hostSelector}>
                  <button 
                    onClick={() => setHostType('Tournament')}
                    className={`${styles.selectorBtn} ${hostType === 'Tournament' ? styles.selectorBtnActive : ''}`}
                  >
                    Tournament
                  </button>
                  <button 
                    onClick={() => setHostType('Workshop')}
                    className={`${styles.selectorBtn} ${hostType !== 'Tournament' ? styles.selectorBtnActive : ''}`}
                  >
                    Event / Workshop
                  </button>
              </div>

              <form onSubmit={handleHostSubmit}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Title / Name</label>
                    <input 
                        className={styles.input}
                        value={formData.title} 
                        onChange={e => setFormData({ ...formData, title: e.target.value })} 
                        required 
                        placeholder={hostType === 'Tournament' ? "e.g. Winter Cup" : "e.g. Yoga Class"}
                    />
                  </div>
                  
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Sport</label>
                        <select 
                            className={styles.select}
                            value={formData.sport}
                            onChange={e => setFormData({ ...formData, sport: e.target.value })}
                        >
                            {['Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Fitness', 'Running'].map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    {hostType !== 'Tournament' && (
                        <div className={styles.formGroup}>
                             <label className={styles.label}>Type</label>
                             <select 
                                className={styles.select}
                                value={formData.type}
                                onChange={e => { setFormData({ ...formData, type: e.target.value }); setHostType(e.target.value); }}
                             >
                                {['Workshop', 'Race', 'Match'].map(t => <option key={t}>{t}</option>)}
                             </select>
                        </div>
                    )}
                  </div>

                  {hostType !== 'Tournament' && (
                      <div className={styles.formGrid}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Date</label>
                            <input type="date" className={styles.input} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                          </div>
                          <div className={styles.formGroup}>
                             <label className={styles.label}>Location</label>
                             <input className={styles.input} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
                          </div>
                      </div>
                  )}

                  {hostType === 'Tournament' && (
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Select Teams (4 or 8)</label>
                        <div className={styles.teamList}>
                          {allTeams.filter(t => t.sport === formData.sport).map(team => {
                            const isActive = formData.selectedTeams.find(t => t.id === team.id);
                            return (
                              <div key={team.id} onClick={() => handleToggleTeam(team)} className={`${styles.teamItem} ${isActive ? styles.teamItemActive : ''}`}>
                                <span>{team.name}</span>
                                {isActive && <span>✓</span>}
                              </div>
                            );
                          })}
                          {allTeams.filter(t => t.sport === formData.sport).length === 0 && <div style={{color:'#666', fontSize:'0.9rem', padding: '10px'}}>No teams found for {formData.sport}</div>}
                        </div>
                        <div style={{ textAlign: 'right', marginTop: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: (formData.selectedTeams.length === 4 || formData.selectedTeams.length === 8) ? '#4ade80' : '#ffa500' }}>
                            Selected: {formData.selectedTeams.length} teams
                        </div>
                      </div>
                  )}

                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                      {hostType === 'Tournament' ? 'Generate Bracket' : 'Create Event'}
                  </button>
              </form>
           </div>
        </div>
      )}

    </main>
  );
}
