"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { tournamentService } from "@/services/tournamentService";
import { teamService } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';

import styles from './tournaments-list.module.css';

export default function TournamentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [allTeams, setAllTeams] = useState([]);
  const [filterSport, setFilterSport] = useState('All');
  
  // Create Form
  const [newName, setNewName] = useState('');
  const [newSport, setNewSport] = useState('Basketball');
  const [selectedTeams, setSelectedTeams] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await tournamentService.getAllTournaments();
    const teams = await teamService.getAllTeams();
    setTournaments(data);
    setAllTeams(teams);
    setLoading(false);
  };

  const handleToggleTeam = (team) => {
    if (selectedTeams.find(t => t.id === team.id)) {
      setSelectedTeams(selectedTeams.filter(t => t.id !== team.id));
    } else {
      if (selectedTeams.length >= 8) return alert("Max 8 teams for demo");
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (newName.trim() === '') return alert("Please enter a name");
    if (selectedTeams.length !== 4 && selectedTeams.length !== 8) {
      alert("Please select exactly 4 or 8 teams for a balanced bracket.");
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

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={`container ${styles.container}`}>
         <div className={styles.header}>
            <h1 className={styles.title}>
              Tournaments <span className="primary-gradient-text">🏆</span>
            </h1>
            <button className="btn-primary" onClick={() => user ? setShowCreate(true) : router.push('/login')}>
              + Create Tournament
            </button>
         </div>

         {/* Sport Filters */}
         <div className={styles.filters}>
           {['All', 'Basketball', 'Soccer', 'Tennis', 'Volleyball'].map(sport => (
             <button 
               key={sport} 
               onClick={() => setFilterSport(sport)}
               className={`${styles.filterButton} ${filterSport === sport ? styles.filterButtonActive : ''}`}
             >
               {sport}
             </button>
           ))}
         </div>

         {loading ? <div className="text-center">Loading...</div> : (
           <div className="grid-auto-fit">
             {activeTournaments.length === 0 && <div className="text-center p-5 text-muted">No tournaments found.</div>}
             {activeTournaments.map(t => (
               <div 
                 key={t.id} 
                 className={`glass-panel ${styles.tournamentCard}`} 
                 onClick={() => router.push(`/tournaments/${t.id}`)}
               >
                 <h3>{t.name}</h3>
                 <div className={styles.cardHeader}>
                   <span>{t.sport}</span>
                   <span>{t.status}</span>
                 </div>
                 <div className={styles.cardMeta}>
                   {t.teams.length} Teams • Winner: <span className={t.winner ? styles.winnerLabel : ''}>
                     {t.winner ? t.winner.name : 'TBD'}
                   </span>
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalPanel}`}>
            <h2 className={styles.modalTitle}>Create Tournament</h2>
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
                    <div 
                      key={team.id} 
                      onClick={() => handleToggleTeam(team)} 
                      className={`${styles.teamItem} ${selectedTeams.find(t => t.id === team.id) ? styles.teamItemActive : ''}`}
                    >
                      {team.name}
                      {selectedTeams.find(t => t.id === team.id) && <span>✓</span>}
                    </div>
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
