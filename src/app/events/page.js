"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { eventService } from "@/services/eventService";
import { tournamentService } from "@/services/tournamentService";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { teamService } from "@/services/teamService";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import EventCard from "@/components/Events/EventCard";
import Icon from '@/components/UI/Icon';
import { SkeletonCardGrid, EmptyState, ModalHeader } from '@/components/UI/primitives';
import { Stagger } from '@/components/UI/motion';
import styles from './events.module.css';

export default function EventsAndTournamentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { notify } = useNotificationCenter();
  
  // Data State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [filterSport, setFilterSport] = useState('All');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const sportFilters = ['All', 'Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Fitness', 'Baseball'];
  
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
            imageGradient: 'linear-gradient(135deg, #FFD700, #FDB931)',
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
    return true;
  });

  const handleHostSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
        notify("Please login first.", "warning");
        return;
    }

    try {
        if (hostType === 'Tournament') {
             if (formData.selectedTeams.length !== 4 && formData.selectedTeams.length !== 8) {
                notify("Please select 4 or 8 teams for the tournament bracket.", "warning");
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
        notify(`${hostType} created successfully.`, "success");
    } catch (err) {
        notify(`Failed to create: ${err.message}`, "error");
    }
  };

  const handleToggleTeam = (team) => {
    const selected = formData.selectedTeams;
    if (selected.find(t => t.id === team.id)) {
        setFormData({ ...formData, selectedTeams: selected.filter(t => t.id !== team.id) });
    } else {
        if (selected.length >= 8) {
          notify("Maximum 8 teams allowed.", "warning");
          return;
        }
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

        <div className={styles.contextBar} role="status">
          <span className={styles.contextMeta}>
            <strong className="tabular">{activeItems.length}</strong> events · {filterSport}
          </span>
          <button
            type="button"
            className={styles.filterFab}
            onClick={() => setShowFilterSheet(true)}
            aria-label="Open event filters"
          >
            <Icon name="chevronDown" size={16} className="icon-inline" />
            Filters
            {filterSport !== 'All' ? <span className={styles.filterBadge}>1</span> : null}
          </button>
        </div>

        <div className={`filter-group ${styles.desktopFilters}`} role="tablist" aria-label="Sport filters">
            {sportFilters.map(sport => (
                <button 
                    key={sport} 
                    type="button"
                    onClick={() => setFilterSport(sport)}
                    className={`filter-pill ${filterSport === sport ? 'filter-pill-active' : ''}`}
                    role="tab"
                    aria-selected={filterSport === sport}
                >
                    <span>{sport}</span>
                </button>
            ))}
        </div>

        {loading ? (
          <SkeletonCardGrid count={6} variant="event" />
        ) : activeItems.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No events in this filter"
            description={
              filterSport === 'All'
                ? 'Host a workshop or tournament to get things started.'
                : `No ${filterSport} events yet. Try another sport or host your own.`
            }
            actionLabel={user ? 'Host event' : 'Sign in to host'}
            onAction={() => (user ? setShowHostModal(true) : router.push('/login'))}
          />
        ) : (
          <Stagger className="grid-auto-fit">
            {activeItems.map((item) => (
              <EventCard key={`${item.kind}_${item.id}`} event={item} />
            ))}
          </Stagger>
        )}
      </div>

      {/* Host Modal */}
      {showFilterSheet && (
        <div className="dismiss-backdrop" onClick={() => setShowFilterSheet(false)}>
          <div
            className={`glass-panel ticket-card ${styles.filterSheet} dismiss-panel`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Event filters"
          >
            <ModalHeader title="Filters" onClose={() => setShowFilterSheet(false)} />
            <div className={styles.sheetSection}>
              <p className={styles.sheetLabel}>Sport</p>
              <div className={styles.sheetPills} role="tablist" aria-label="Sport filters">
                {sportFilters.map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => setFilterSport(sport)}
                    className={`filter-pill ${filterSport === sport ? 'filter-pill-active' : ''}`}
                    role="tab"
                    aria-selected={filterSport === sport}
                  >
                    <span>{sport}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className={`btn-primary ${styles.sheetApply}`}
              onClick={() => setShowFilterSheet(false)}
            >
              Show {activeItems.length} events
            </button>
          </div>
        </div>
      )}

      {showHostModal && (
        <div className={styles.modalOverlay} onClick={() => setShowHostModal(false)}>
           <div className={`glass-panel ${styles.modal}`} onClick={e => e.stopPropagation()}>
              <ModalHeader
                title="Host an Event"
                onClose={() => setShowHostModal(false)}
                closeLabel="Close host event modal"
              />

              <div className={styles.hostSelector}>
                  <button 
                    type="button"
                    onClick={() => setHostType('Tournament')}
                    className={`${styles.selectorBtn} ${hostType === 'Tournament' ? styles.selectorBtnActive : ''}`}
                  >
                    Tournament
                  </button>
                  <button 
                    type="button"
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
                              <button
                                key={team.id}
                                type="button"
                                onClick={() => handleToggleTeam(team)}
                                className={`${styles.teamItem} ${isActive ? styles.teamItemActive : ''}`}
                                aria-pressed={Boolean(isActive)}
                              >
                                <span>{team.name}</span>
                                {isActive && <span>✓</span>}
                              </button>
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
