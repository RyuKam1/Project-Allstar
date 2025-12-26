"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { tournamentService } from "@/services/tournamentService";
import { teamService } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';

export default function TournamentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [allTeams, setAllTeams] = useState([]);
  
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
    if (selectedTeams.length !== 4 && selectedTeams.length !== 8) {
      alert("Please select exactly 4 or 8 teams for a balanced bracket.");
      return;
    }
    await tournamentService.createTournament({ name: newName, sport: newSport, teams: selectedTeams }, user);
    setShowCreate(false);
    loadData();
  };

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <Navbar />
      <div className="container" style={{ paddingTop: '140px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
           <h1>Tournaments 🏆</h1>
           <button className="btn-primary" onClick={() => user ? setShowCreate(true) : router.push('/login')}>
             + Create Tournament
           </button>
         </div>

         {loading ? <div>Loading...</div> : (
           <div className="grid-auto-fit">
             {tournaments.map(t => (
               <div key={t.id} className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={() => router.push(`/tournaments/${t.id}`)}>
                 <h3>{t.name}</h3>
                 <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                   <span>{t.sport}</span>
                   <span>{t.status}</span>
                 </div>
                 <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                   {t.teams.length} Teams • Winner: {t.winner ? t.winner.name : 'TBD'}
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '90%', maxWidth: '600px', background: '#111', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>Create Tournament</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label>Tournament Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} required style={{ width: '100%', padding: '10px', background: '#333', border: 'none', color: 'white' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Sport</label>
                <select value={newSport} onChange={e => setNewSport(e.target.value)} style={{ width: '100%', padding: '10px', background: '#333', border: 'none', color: 'white' }}>
                   {['Basketball', 'Soccer', 'Tennis', 'Volleyball'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label>Select Teams (4 or 8)</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #333', padding: '10px' }}>
                  {allTeams.filter(t => t.sport === newSport).map(team => (
                    <div key={team.id} onClick={() => handleToggleTeam(team)} style={{ 
                      padding: '8px', 
                      background: selectedTeams.find(t => t.id === team.id) ? 'var(--color-primary)' : 'transparent',
                      cursor: 'pointer',
                      borderBottom: '1px solid #333'
                    }}>
                      {team.name}
                    </div>
                  ))}
                  {allTeams.filter(t => t.sport === newSport).length === 0 && <div style={{color:'#666'}}>No teams for this sport. Create some teams first!</div>}
                </div>
                <div style={{ textAlign: 'right', marginTop: '5px' }}>Selected: {selectedTeams.length}</div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #666', color: '#666' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Bracket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
