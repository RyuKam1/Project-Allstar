"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import TeamCard from "@/components/Teams/TeamCard";
import { teamService } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import styles from './teams.module.css';

export default function TeamsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterSport, setFilterSport] = useState('All');
  
  // Create Form State
  const [newTeam, setNewTeam] = useState({ name: '', sport: 'Basketball', description: '' });

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    const data = await teamService.getAllTeams();
    setTeams(data);
    setLoading(false);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await teamService.createTeam(newTeam, user);
      setShowCreateModal(false);
      setNewTeam({ name: '', sport: 'Basketball', description: '' });
      loadTeams(); // Refresh
    } catch (err) {
      alert(err.message);
    }
  };

  const handleJoinTeam = async (teamId) => {
    if (!user) {
        router.push('/login');
        return;
    }
    try {
      await teamService.requestJoinTeam(teamId, user);
      loadTeams();
    } catch (err) {
      alert(err.message);
    }
  };

  const activeTeams = teams.filter(team => 
    filterSport === 'All' || team.sport === filterSport
  );

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={`container ${styles.container}`}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              Team <span className="primary-gradient-text">Directory</span>
            </h1>
            <p className={styles.subtitle}>Join a squad or start your own dynasty.</p>
          </div>
          <button 
            className="btn-primary" 
            onClick={() => user ? setShowCreateModal(true) : router.push('/login')}
          >
            + Create Team
          </button>
        </div>

        {/* Sport Filters */}
        <div className={styles.filters}>
          {['All', 'Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Baseball'].map(sport => (
            <button 
              key={sport} 
              onClick={() => setFilterSport(sport)}
              className={`${styles.filterButton} ${filterSport === sport ? styles.filterButtonActive : ''}`}
            >
              {sport}
            </button>
          ))}
        </div>

        {loading ? (
             <div className={styles.loading}>Loading teams...</div>
        ) : activeTeams.length === 0 ? (
             <div className={`glass-panel ${styles.emptyState}`}>
               <h2>No teams yet!</h2>
               <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                 {filterSport === 'All' 
                   ? "Be the first to create a team and invite your friends." 
                   : `No ${filterSport} teams found. Start a new squad!`}
               </p>
               <button className="btn-primary" onClick={() => user ? setShowCreateModal(true) : router.push('/login')}>
                 Start a {filterSport === 'All' ? 'Team' : filterSport + ' Team'}
               </button>
             </div>
        ) : (
          <div className="grid-auto-fit">
            {activeTeams.map(team => (
              <TeamCard key={team.id} team={team} user={user} onJoin={handleJoinTeam} />
            ))}
          </div>
        )}
      </div>

      {/* Simple Create Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={`glass-panel ${styles.modalPanel}`}>
            <h2 className={styles.modalTitle}>Create New Team</h2>
            <form onSubmit={handleCreateTeam} className={styles.modalForm}>
              <div className={styles.logoUploadSection}>
                <label className={styles.label}>Team Logo</label>
                <div className={styles.logoPreviewContainer}>
                  {newTeam.logo ? (
                    <img src={newTeam.logo} alt="Preview" className={styles.logoPreview} />
                  ) : (
                    <div className={styles.logoPlaceholder}>No Logo</div>
                  )}
                  <input 
                    id="team-logo-create"
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.size > 500000) {
                          alert("Max file size 500KB");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewTeam({...newTeam, logo: reader.result});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className={styles.hidden}
                  />
                  <label htmlFor="team-logo-create" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                    Choose Logo
                  </label>
                </div>
              </div>

              <div>
                <label className={styles.label}>Team Name</label>
                <input 
                  type="text" 
                  required
                  value={newTeam.name}
                  onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                  className={styles.input}
                />
              </div>
              
              <div>
                <label className={styles.label}>Sport</label>
                <select
                  value={newTeam.sport}
                  onChange={e => setNewTeam({...newTeam, sport: e.target.value})}
                  className={styles.select}
                >
                  <option>Basketball</option>
                  <option>Soccer</option>
                  <option>Tennis</option>
                  <option>Baseball</option>
                  <option>Volleyball</option>
                </select>
              </div>

              <div>
                <label className={styles.label}>Motto / Description</label>
                <textarea 
                  value={newTeam.description}
                  onChange={e => setNewTeam({...newTeam, description: e.target.value})}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowCreateModal(false)} className={styles.cancelButton}>Cancel</button>
                <button type="submit" className={`btn-primary ${styles.submitButton}`}>Create Team</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
