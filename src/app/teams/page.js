"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import TeamCard from "@/components/Teams/TeamCard";
import Icon from '@/components/UI/Icon';
import { teamService } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import { useRouter } from 'next/navigation';
import styles from './teams.module.css';
import { SkeletonTeamGrid, EmptyState, ModalHeader } from '@/components/UI/primitives';
import { Stagger } from '@/components/UI/motion';
import eventStyles from '../events/events.module.css';

export default function TeamsPage() {
  const { user } = useAuth();
  const { notify } = useNotificationCenter();
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterSport, setFilterSport] = useState('All');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const sportFilters = ['All', 'Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Baseball'];
  
  // Create Form State
  const [newTeam, setNewTeam] = useState({ name: '', sport: 'Basketball', description: '' });

  async function loadTeams() {
    const data = await teamService.getAllTeams();
    setTeams(data);
    setLoading(false);
  }

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await teamService.createTeam(newTeam, user);
      setShowCreateModal(false);
      setNewTeam({ name: '', sport: 'Basketball', description: '' });
      loadTeams(); // Refresh
    } catch (err) {
      notify(err.message, "error");
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
      notify(err.message, "error");
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

         <div className={eventStyles.contextBar} role="status">
           <span className={eventStyles.contextMeta}>
             <strong className="tabular">{activeTeams.length}</strong> teams · {filterSport}
           </span>
           <button
             type="button"
             className={eventStyles.filterFab}
             onClick={() => setShowFilterSheet(true)}
             aria-label="Open team filters"
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
             <SkeletonTeamGrid count={6} />
        ) : activeTeams.length === 0 ? (
             <EmptyState
               icon="users"
               title="No teams yet"
               description={
                 filterSport === 'All'
                   ? 'Be the first to create a team and invite your friends.'
                   : `No ${filterSport} teams found. Start a new squad.`
               }
               actionLabel={user ? 'Create team' : 'Sign in to create'}
               onAction={() => (user ? setShowCreateModal(true) : router.push('/login'))}
             />
        ) : (
          <Stagger className="grid-auto-fit">
            {activeTeams.map(team => (
              <TeamCard key={team.id} team={team} user={user} onJoin={handleJoinTeam} />
            ))}
          </Stagger>
        )}
      </div>

      {/* Simple Create Modal */}
      {showFilterSheet && (
        <div className="dismiss-backdrop" onClick={() => setShowFilterSheet(false)}>
          <div
            className={`glass-panel ticket-card ${eventStyles.filterSheet} dismiss-panel`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Team filters"
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
              Show {activeTeams.length} teams
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={`glass-panel ${styles.modalPanel}`} onClick={(e) => e.stopPropagation()}>
            <ModalHeader
              title="Create New Team"
              onClose={() => setShowCreateModal(false)}
              closeLabel="Close create team modal"
            />
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
                          notify("Max file size is 500KB.", "warning");
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
