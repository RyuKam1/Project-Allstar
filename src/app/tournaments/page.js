"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { tournamentService } from "@/services/tournamentService";
import { teamService } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import { useRouter } from 'next/navigation';

import EventCard from "@/components/Events/EventCard";
import Icon from '@/components/UI/Icon';
import { SkeletonCardGrid, EmptyState, ModalHeader } from '@/components/UI/primitives';
import { Stagger } from '@/components/UI/motion';
import styles from './tournaments-list.module.css';
import eventStyles from '../events/events.module.css';

export default function TournamentsPage() {
  const { user } = useAuth();
  const { notify } = useNotificationCenter();
  const router = useRouter();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [allTeams, setAllTeams] = useState([]);
  const [filterSport, setFilterSport] = useState('All');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const sportFilters = ['All', 'Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Baseball'];
  
  // Create Form
  const [newName, setNewName] = useState('');
  const [newSport, setNewSport] = useState('Basketball');
  const [selectedTeams, setSelectedTeams] = useState([]);

  async function loadData() {
    const data = await tournamentService.getAllTournaments();
    const teams = await teamService.getAllTeams();
    setTournaments(data);
    setAllTeams(teams);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleTeam = (team) => {
    if (selectedTeams.find(t => t.id === team.id)) {
      setSelectedTeams(selectedTeams.filter(t => t.id !== team.id));
    } else {
      if (selectedTeams.length >= 8) {
        notify("Maximum 8 teams for demo.", "warning");
        return;
      }
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (newName.trim() === '') {
      notify("Please enter a name.", "warning");
      return;
    }
    if (selectedTeams.length !== 4 && selectedTeams.length !== 8) {
      notify("Please select exactly 4 or 8 teams for a balanced bracket.", "warning");
      return;
    }
    await tournamentService.createTournament({ name: newName, sport: newSport, teams: selectedTeams }, user);
    setShowCreate(false);
    setSelectedTeams([]);
    setNewName('');
    loadData();
  };

  const activeTournaments = tournaments.filter(t => 
    filterSport === 'All' || t.sport === filterSport
  );

  const tournamentCards = activeTournaments.map((t) => ({
    id: t.id,
    routeId: t.id,
    title: t.name,
    sport: t.sport,
    kind: 'Tournament',
    displayType: 'Tournament',
    location: 'Multiple venues',
    date: 'Ongoing',
    cost: 'Entry fee',
  }));

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={`container ${styles.container}`}>
         <div className={styles.header}>
            <h1 className={styles.title}>
              Tournaments <span className="primary-gradient-text">Bracket Hub</span>
            </h1>
            <button className="btn-primary" onClick={() => user ? setShowCreate(true) : router.push('/login')}>
              + Create Tournament
            </button>
         </div>

         <div className={eventStyles.contextBar} role="status">
           <span className={eventStyles.contextMeta}>
             <strong className="tabular">{activeTournaments.length}</strong> brackets · {filterSport}
           </span>
           <button
             type="button"
             className={eventStyles.filterFab}
             onClick={() => setShowFilterSheet(true)}
             aria-label="Open tournament filters"
           >
             <Icon name="chevronDown" size={16} className="icon-inline" />
             Filters
             {filterSport !== 'All' ? <span className={eventStyles.filterBadge}>1</span> : null}
           </button>
         </div>

         <div className={`filter-group ${eventStyles.desktopFilters}`} role="tablist" aria-label="Sport filters">
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
         ) : activeTournaments.length === 0 ? (
           <EmptyState
             icon="trophy"
             title="No tournaments yet"
             description={
               filterSport === 'All'
                 ? 'Create a bracket with 4 or 8 teams to kick off a tournament.'
                 : `No ${filterSport} tournaments found. Try another sport or create one.`
             }
             actionLabel={user ? 'Create tournament' : 'Sign in to create'}
             onAction={() => (user ? setShowCreate(true) : router.push('/login'))}
           />
         ) : (
           <Stagger className="grid-auto-fit">
             {tournamentCards.map((event) => (
               <EventCard key={event.id} event={event} />
             ))}
           </Stagger>
         )}
      </div>

      {/* Create Modal */}
      {showFilterSheet && (
        <div className="dismiss-backdrop" onClick={() => setShowFilterSheet(false)}>
          <div
            className={`glass-panel ticket-card ${eventStyles.filterSheet} dismiss-panel`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tournament filters"
          >
            <ModalHeader title="Filters" onClose={() => setShowFilterSheet(false)} />
            <div className={eventStyles.sheetSection}>
              <p className={eventStyles.sheetLabel}>Sport</p>
              <div className={eventStyles.sheetPills} role="tablist" aria-label="Sport filters">
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
              className={`btn-primary ${eventStyles.sheetApply}`}
              onClick={() => setShowFilterSheet(false)}
            >
              Show {activeTournaments.length} tournaments
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className={styles.modalOverlay} onClick={() => setShowCreate(false)}>
          <div className={`glass-panel ${styles.modalPanel}`} onClick={(e) => e.stopPropagation()}>
            <ModalHeader
              title="Create Tournament"
              onClose={() => setShowCreate(false)}
              closeLabel="Close create tournament modal"
            />
            <form onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tournament Name</label>
                <input 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  required 
                  className={styles.input}
                  placeholder="e.g. Winter Clash 2024"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Sport</label>
                <select 
                  value={newSport} 
                  onChange={e => {
                    setNewSport(e.target.value);
                    setSelectedTeams([]); // Reset selection when sport changes
                  }} 
                  className={styles.select}
                >
                   {['Basketball', 'Soccer', 'Tennis', 'Volleyball'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Select Teams (4 or 8)</label>
                <div className={styles.teamListContainer}>
                  {allTeams.filter(t => t.sport === newSport).map(team => (
                    <button 
                      key={team.id} 
                      type="button"
                      onClick={() => handleToggleTeam(team)} 
                      className={`${styles.teamItem} ${selectedTeams.find(t => t.id === team.id) ? styles.teamItemActive : ''}`}
                      aria-pressed={Boolean(selectedTeams.find(t => t.id === team.id))}
                    >
                      {team.name}
                      {selectedTeams.find(t => t.id === team.id) && <span>✓</span>}
                    </button>
                  ))}
                  {allTeams.filter(t => t.sport === newSport).length === 0 && (
                    <div className="text-center p-3 text-muted">No teams for this sport. Create some teams first!</div>
                  )}
                </div>
                <div className="text-right mt-2 text-sm text-muted">
                  Selected: <strong>{selectedTeams.length}</strong> / 8
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowCreate(false)} className={styles.cancelButton}>Cancel</button>
                <button type="submit" className="btn-primary">Create Bracket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
