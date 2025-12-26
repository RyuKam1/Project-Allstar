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
        {loading ? <div>Loading...</div> : (
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
                              {item.image ? (
                                  <img 
                                    src={item.image} 
                                    alt={item.title} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  />
                              ) : (
                                  <span className={styles.cardEmoji}>
                                     {item.sport === 'Basketball' ? '🏀' : item.sport === 'Soccer' ? '⚽' : '🏆'}
                                  </span>
                              )}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <div className="glass-panel" style={{ padding: '2rem', width: '90%', maxWidth: '600px', background: '#111', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <h2>Host an Event</h2>
                  <button onClick={() => setShowHostModal(false)} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#222', padding: '5px', borderRadius: '8px' }}>
                  <button 
                    onClick={() => setHostType('Tournament')}
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', background: hostType === 'Tournament' ? 'var(--color-primary)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
                  >
                    Tournament
                  </button>
                  <button 
                    onClick={() => setHostType('Workshop')}
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', background: hostType === 'Workshop' ? 'var(--color-primary)' : 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
                  >
                    Event / Workshop
                  </button>
              </div>

              <form onSubmit={handleHostSubmit}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="event-title" style={{ display: 'block', marginBottom: '5px' }}>Title / Name</label>
                    <input 
                        id="event-title"
                        value={formData.title} 
                        onChange={e => setFormData({ ...formData, title: e.target.value })} 
                        required 
                        style={{ width: '100%', padding: '12px', background: '#333', border: 'none', color: 'white', borderRadius: '4px' }} 
                        placeholder={hostType === 'Tournament' ? "e.g. Winter Cup" : "e.g. Yoga Class"}
                        aria-label="Event or tournament title"
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label htmlFor="event-sport" style={{ display: 'block', marginBottom: '5px' }}>Sport</label>
                        <select 
                            id="event-sport"
                            value={formData.sport}
                            onChange={e => setFormData({ ...formData, sport: e.target.value })}
                            style={{ width: '100%', padding: '12px', background: '#333', border: 'none', color: 'white', borderRadius: '4px' }}
                            aria-label="Select sport type"
                        >
                            {['Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Fitness', 'Running'].map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    {hostType !== 'Tournament' && (
                        <div>
                             <label style={{ display: 'block', marginBottom: '5px' }}>Type</label>
                             <select 
                                value={formData.type}
                                onChange={e => { setFormData({ ...formData, type: e.target.value }); setHostType(e.target.value); }}
                                style={{ width: '100%', padding: '12px', background: '#333', border: 'none', color: 'white', borderRadius: '4px' }}
                             >
                                {['Workshop', 'Race', 'Match'].map(t => <option key={t}>{t}</option>)}
                             </select>
                        </div>
                    )}
                  </div>

                  {hostType !== 'Tournament' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Date</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required style={{ width: '100%', padding: '12px', background: '#333', border: 'none', color: 'white', borderRadius: '4px' }} />
                          </div>
                          <div>
                             <label style={{ display: 'block', marginBottom: '5px' }}>Location</label>
                             <input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required style={{ width: '100%', padding: '12px', background: '#333', border: 'none', color: 'white', borderRadius: '4px' }} />
                          </div>
                      </div>
                  )}

                  {hostType === 'Tournament' && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Select Teams (4 or 8)</label>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #333', padding: '10px', borderRadius: '4px' }}>
                          {allTeams.filter(t => t.sport === formData.sport).map(team => (
                            <div key={team.id} onClick={() => handleToggleTeam(team)} style={{ 
                              padding: '8px', 
                              background: formData.selectedTeams.find(t => t.id === team.id) ? 'var(--color-primary)' : 'transparent',
                              cursor: 'pointer',
                              borderBottom: '1px solid #333',
                              fontSize: '0.9rem'
                            }}>
                              {team.name}
                            </div>
                          ))}
                          {allTeams.filter(t => t.sport === formData.sport).length === 0 && <div style={{color:'#666', fontSize:'0.9rem'}}>No teams found for {formData.sport}</div>}
                        </div>
                        <div style={{ textAlign: 'right', marginTop: '5px', fontSize: '0.8rem', color: formData.selectedTeams.length === 4 || formData.selectedTeams.length === 8 ? '#4ade80' : 'orange' }}>
                            Selected: {formData.selectedTeams.length}
                        </div>
                      </div>
                  )}

                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}>
                      {hostType === 'Tournament' ? 'Generat Bracket' : 'Create Event'}
                  </button>
              </form>
           </div>
        </div>
      )}

    </main>
  );
}
