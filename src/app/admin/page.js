"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { authService } from "@/services/authService";
import { teamService } from "@/services/teamService";
import { tournamentService } from "@/services/tournamentService";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users'); // users, teams, tournaments
  const [data, setData] = useState({ users: [], teams: [], tournaments: [] });
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const [users, teams, tournaments] = await Promise.all([
      authService.getAllUsers(),
      teamService.getAllTeams(),
      tournamentService.getAllTournaments()
    ]);
    setData({ users, teams, tournaments });
    setLoading(false);
  };

  // --- Handlers ---

  const handleDelete = async (type, id) => {
    if (!confirm("Are you sure you want to delete this item? This cannot be undone.")) return;
    
    if (type === 'users') {
      // authService doesn't have delete yet, assumed mostly ready but strict req was teams/tournaments
      // Adding basic filter locally for prototype if needed, or simply removing from DB
      // Note: authService.deleteUser not implemented in previous step, focusing on Teams/Tournaments as requested
      alert("User deletion not supported in this version.");
    } else if (type === 'teams') {
      await teamService.deleteTeam(id);
    } else if (type === 'tournaments') {
      await tournamentService.deleteTournament(id);
    }
    loadAllData();
  };

  const handleAddWin = async (teamId) => {
    const cat = prompt("Win Category (e.g. Tournament, Match):", "Tournament");
    if (!cat) return;
    const desc = prompt("Description (e.g. Summer Cup 2025):", "Championship");
    if (!desc) return;
    
    await teamService.addWin(teamId, cat, desc);
    loadAllData();
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    if (activeTab === 'teams') {
      await teamService.updateTeam(editingItem.id, { name: editingItem.name, sport: editingItem.sport });
    } else if (activeTab === 'tournaments') {
      await tournamentService.updateTournament(editingItem.id, { name: editingItem.name, status: editingItem.status });
    }
    setEditingItem(null);
    loadAllData();
  };

  // --- Renderers ---

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
      {['users', 'teams', 'tournaments'].map(tab => (
        <button 
          key={tab}
          onClick={() => setActiveTab(tab)}
          style={{
            padding: '10px 20px',
            background: activeTab === tab ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold',
            textTransform: 'capitalize',
            cursor: 'pointer'
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  const renderUsersTable = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
        <tr>
          <th style={{ padding: '1rem' }}>User</th>
          <th style={{ padding: '1rem' }}>Email</th>
          <th style={{ padding: '1rem', color: '#EF4444' }}>Password</th>
          <th style={{ padding: '1rem' }}>Joined</th>
        </tr>
      </thead>
      <tbody>
        {data.users.map(u => (
          <tr key={u.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
            <td style={{ padding: '1rem' }}>{u.name}</td>
            <td style={{ padding: '1rem', color: '#aaa' }}>{u.email}</td>
            <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#EF4444' }}>{u.password}</td>
            <td style={{ padding: '1rem', fontSize: '0.8rem' }}>{new Date(u.joinedAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderTeamsTable = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
        <tr>
          <th style={{ padding: '1rem' }}>Name</th>
          <th style={{ padding: '1rem' }}>Sport</th>
          <th style={{ padding: '1rem' }}>Members</th>
          <th style={{ padding: '1rem' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.teams.map(t => (
          <tr key={t.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{t.name}</td>
            <td style={{ padding: '1rem' }}>
                <span style={{ background: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{t.sport}</span>
            </td>
            <td style={{ padding: '1rem' }}>{t.members.length}</td>
            <td style={{ padding: '1rem' }}>
              <button 
                onClick={() => handleAddWin(t.id)}
                 style={{ marginRight: '10px', background: 'transparent', border: '1px solid #FFD700', color: '#FFD700', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
                +Win
              </button>
              <button 
                onClick={() => setEditingItem(t)}
                style={{ marginRight: '10px', background: 'transparent', border: '1px solid #aaa', color: '#aaa', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Edit
              </button>
              <button 
                 onClick={() => handleDelete('teams', t.id)}
                 style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#F87171', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
        {data.teams.length === 0 && <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No teams found.</td></tr>}
      </tbody>
    </table>
  );

  const renderTournamentsTable = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
        <tr>
          <th style={{ padding: '1rem' }}>Name</th>
          <th style={{ padding: '1rem' }}>Sport</th>
          <th style={{ padding: '1rem' }}>Status</th>
           <th style={{ padding: '1rem' }}>Teams</th>
          <th style={{ padding: '1rem' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.tournaments.map(t => (
          <tr key={t.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{t.name}</td>
            <td style={{ padding: '1rem' }}>{t.sport}</td>
            <td style={{ padding: '1rem' }}>
                <span style={{ color: t.status === 'Active' ? '#10B981' : '#aaa' }}>{t.status}</span>
            </td>
             <td style={{ padding: '1rem' }}>{t.teams.length}</td>
            <td style={{ padding: '1rem' }}>
              <button 
                onClick={() => setEditingItem(t)}
                 style={{ marginRight: '10px', background: 'transparent', border: '1px solid #aaa', color: '#aaa', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Edit
              </button>
              <button 
                 onClick={() => handleDelete('tournaments', t.id)}
                 style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#F87171', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
         {data.tournaments.length === 0 && <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No tournaments found.</td></tr>}
      </tbody>
    </table>
  );

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <Navbar />
      
      <div className="container" style={{ paddingTop: '140px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Admin <span className="primary-gradient-text">Dashboard</span></h1>
        
        {renderTabs()}

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              {activeTab === 'users' && renderUsersTable()}
              {activeTab === 'teams' && renderTeamsTable()}
              {activeTab === 'tournaments' && renderTournamentsTable()}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
        }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '90%', maxWidth: '400px', background: '#222' }}>
            <h2>Edit {activeTab === 'teams' ? 'Team' : 'Tournament'}</h2>
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name</label>
                <input 
                  value={editingItem.name} 
                  onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                  style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #444', color: 'white' }}
                />
              </div>

              {activeTab === 'teams' && (
                 <div style={{ marginBottom: '1rem' }}>
                   <label style={{ display: 'block', marginBottom: '0.5rem' }}>Sport</label>
                   <select 
                     value={editingItem.sport} 
                     onChange={e => setEditingItem({...editingItem, sport: e.target.value})}
                     style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #444', color: 'white' }}
                   >
                     {['Basketball', 'Soccer', 'Tennis', 'Baseball', 'Volleyball'].map(s => <option key={s}>{s}</option>)}
                   </select>
                 </div>
              )}

              {activeTab === 'tournaments' && (
                 <div style={{ marginBottom: '1rem' }}>
                   <label style={{ display: 'block', marginBottom: '0.5rem' }}>Status</label>
                   <select 
                     value={editingItem.status} 
                     onChange={e => setEditingItem({...editingItem, status: e.target.value})}
                     style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #444', color: 'white' }}
                   >
                     <option>Active</option>
                     <option>Completed</option>
                     <option>Cancelled</option>
                   </select>
                 </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setEditingItem(null)} style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid #555', color: '#888' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
