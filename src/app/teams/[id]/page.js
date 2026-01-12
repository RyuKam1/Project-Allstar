"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import FieldLayout from "@/components/Tournament/FieldLayout";
import { teamService } from "@/services/teamService";
import { authService } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";
import { useParams } from 'next/navigation';
import styles from './team-details.module.css';

export default function TeamDetails() {
  const params = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [guestName, setGuestName] = useState('');

  useEffect(() => {
    if (params?.id) loadTeam();
  }, [params?.id]);

  const loadTeam = async () => {
    const teams = await teamService.getAllTeams();
    const found = teams.find(t => t.id === params.id);
    setTeam(found);
    setLoading(false);
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!guestName) return;
    await teamService.addGuestMember(team.id, guestName); // Guest starts at Bench
    setGuestName('');
    loadTeam();
  };

  const handleDropPlayer = async (playerId, newPosition) => {
    await teamService.updateMemberPosition(team.id, playerId, newPosition);
    loadTeam();
  };

  const handleRequestAccess = async () => {
    if (!user) return; // Should redirect to login handled by UI usually
    await teamService.requestJoinTeam(team.id, user);
    loadTeam();
  };

  const handleAcceptRequest = async (requesterId, targetPosition = 'Bench') => {
    await teamService.acceptJoinRequest(team.id, requesterId, targetPosition);
    loadTeam();
  };

  const handleRejectRequest = async (requesterId) => {
    await teamService.rejectJoinRequest(team.id, requesterId);
    loadTeam();
  };

  const handleDragStart = (e, playerId) => {
    e.dataTransfer.setData("playerId", playerId);
  };

  const handleDragOverBench = (e) => {
    e.preventDefault();
  };

  const handleDropToBench = async (e) => {
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId) {
      await teamService.updateMemberPosition(team.id, playerId, 'Bench');
      loadTeam();
    }
  };

  const handleLogoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) {
      alert("File too large. Max 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      await teamService.updateTeam(team.id, { logo: reader.result });
      loadTeam();
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>Loading...</div>;
  if (!team) return <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>Team not found</div>;

  const isOwner = user && user.id === team.ownerId;
  const benchPlayers = team.members.filter(m => m.position === 'Bench');

  const handlePlayerClick = async (member) => {
    // If it's a guest, they don't have a "profile" per se, but we can show what we have
    if (member.isGuest) {
      setSelectedPlayer({
        ...member,
        bio: 'Guest Athlete',
        sport: team.sport,
        careerWins: []
      });
    } else {
      // Platform user - get full data from authService
      // Fetch fresh profile data (height, weight, etc.)
      const fullProfile = await authService.getUserProfile(member.id);
      
      const displayProfile = fullProfile || member; // Fallback to basic member info if fetch fails
      
      // Fetch career wins across all teams
      const allUserTeams = await teamService.getUserTeams(member.id);
      const wins = [];
      allUserTeams.forEach(t => {
        if (t.wins) {
          t.wins.forEach(w => wins.push({ ...w, teamName: t.name }));
        }
      });

      setSelectedPlayer({
        ...displayProfile,
        role: member.role, // Keep team-specific role
        careerWins: wins.sort((a,b) => new Date(b.date) - new Date(a.date))
      });
    }
    setShowPlayerModal(true);
  };

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className="container">
        
        {/* Header */}
        <div className={`glass-panel ${styles.teamHeader}`}>
          
          {/* Logo Section */}
          <div className={styles.logoContainer}>
             <img 
               src={team.logo || `https://ui-avatars.com/api/?name=${team.name}&background=random&size=200`} 
               alt={team.name} 
               className={styles.logo}
             />
             {isOwner && (
               <>
                 <label 
                   htmlFor="team-logo-upload"
                   className={styles.logoEditLabel}
                   title="Change Logo"
                 >
                   ✏️
                 </label>
                 <input 
                   id="team-logo-upload" 
                   type="file" 
                   accept="image/*" 
                   onChange={handleLogoUpdate} 
                   className={styles.hidden}
                 />
               </>
             )}
          </div>

          <div className={styles.headerInfo}>
            <div className={styles.titleFlex}>
              <h1 className={styles.title}>{team.name}</h1>
              <span className={styles.sportTag}>{team.sport}</span>
            </div>
            <p className={styles.description}>{team.description}</p>
          </div>
          
          <div className={styles.headerStats}>
            <div className={styles.statItem}>
                <div className={styles.statValue}>{team.members.length}</div>
                <div className={styles.statLabel}>Members</div>
            </div>
            
            {!isOwner && !team.members.some(m => m.id === user?.id) && (
                <button 
                  onClick={handleRequestAccess}
                  disabled={team.requests?.some(r => r.id === user?.id)}
                  className="btn-primary"
                  style={team.requests?.some(r => r.id === user?.id) ? { opacity: 0.7, cursor: 'not-allowed', background: '#555', fontSize: '0.9rem' } : { fontSize: '0.9rem' }}
                >
                  {team.requests?.some(r => r.id === user?.id) ? 'Request Sent' : 'Request Access'}
                </button>
            )}
          </div>
        </div>
        


        <div className={styles.teamLayout}>
          {/* Field View (Drop Target 1) */}
          <div>
            <div className={styles.sectionHeader}>
               <h2 className={styles.sectionTitle}>Starting Lineup</h2>
               {isOwner && <span className={styles.ownerHint}>Drag players to positions</span>}
            </div>
            <FieldLayout 
               sport={team.sport} 
               players={team.members} 
               onDropPlayer={handleDropPlayer} 
               isOwner={isOwner} 
               onPlayerClick={handlePlayerClick}
            />
          </div>

          {/* Right Column: Requests (Owner) + Bench */}
          <div className={styles.rightColumn}>
            
            {/* Join Requests Panel */}
            {isOwner && team.requests && team.requests.length > 0 && (
                <div className={`glass-panel ${styles.requestsPanel}`}>
                    <h2 className={styles.requestsTitle}>
                        📩 Join Requests <span className={styles.requestCount}>{team.requests.length}</span>
                    </h2>
                    <ul className={styles.requestList}>
                        {team.requests.map(req => (
                            <li key={req.id} className={styles.requestItem}>
                                <img src={req.avatar} alt={req.name} className={styles.requestAvatar} />
                                <div className={styles.requestInfo}>
                                    <div className={styles.requestName}>{req.name}</div>
                                    <div className={styles.requestDate}>{new Date(req.requestedAt).toLocaleDateString()}</div>
                                </div>
                                <div className={styles.requestActions}>
                                    <button 
                                        onClick={() => handleAcceptRequest(req.id, 'Bench')} 
                                        className={`${styles.actionBtn} ${styles.acceptBtn}`}
                                        title="Accept to Bench"
                                    >
                                        ✅
                                    </button>
                                    <button 
                                        onClick={() => handleRejectRequest(req.id)}
                                        className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                        title="Reject"
                                    >
                                        ❌
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Bench / Roster (Drop Target 2) */}
            <div 
                onDragOver={handleDragOverBench}
                onDrop={handleDropToBench}
            >
                <div className={`glass-panel ${styles.benchPanel}`} style={{ borderStyle: isOwner ? 'dashed' : 'solid' }}>
                <h2 className={styles.sectionTitle}>Bench / Roster</h2>
                
                <ul className={styles.benchList}>
                    {benchPlayers.length === 0 && <div className={styles.emptyBench}>Bench is empty.</div>}
                    
                    {benchPlayers.map(member => (
                    <li 
                        key={member.id} 
                        draggable={isOwner}
                        onDragStart={(e) => handleDragStart(e, member.id)}
                        onClick={() => handlePlayerClick(member)}
                        className={styles.memberItem}
                    >
                        <img src={member.avatar} className={styles.memberAvatar} alt={member.name} />
                        <div className={styles.headerInfo}>
                          <div className={styles.memberName}>{member.name}</div>
                          <div className={styles.memberRole}>{member.role}</div>
                        </div>
                        {isOwner && <span className={styles.dragHandle}>:::</span>}
                    </li>
                    ))}
                </ul>

                {isOwner && (
                    <div className={styles.addGuestSection}>
                    <h3 className={styles.addGuestTitle}>Add Guest Player</h3>
                    <form onSubmit={handleAddGuest} className={styles.guestForm}>
                        <input 
                          placeholder="Name" 
                          value={guestName}
                          onChange={e => setGuestName(e.target.value)}
                          className={styles.guestInput}
                          required
                        />
                        <button type="submit" className={`btn-primary ${styles.guestBtn}`}>Add to Bench</button>
                    </form>
                    </div>
                )}
                </div>
            </div>
          </div>
        </div>

        {/* Win History Section (Moved to Bottom) */}
        {team.wins && team.wins.length > 0 && (
          <div className={`glass-panel ${styles.winHistoryPanel}`}>
             
             {/* Tournament Wins Header */}
             {team.wins.some(w => w.category === 'Tournament') && (
               <div className={styles.winHistorySection}>
                  <h2 className={`${styles.winTitle} ${styles.winHeaderTournament}`}>
                    🏆 Tournament Championships <span className={`${styles.winCount} ${styles.winCountGold}`}>{team.wins.filter(w=>w.category==='Tournament').length}</span>
                  </h2>
                  <div className={styles.winGrid}>
                    {team.wins.filter(w=>w.category==='Tournament').map(win => (
                      <div key={win.id} className={`${styles.winCard} ${styles.tournamentWinCard}`}>
                         <div className={styles.winDescription}>{win.description}</div>
                         <div className={styles.winDate}>
                           {new Date(win.date).toLocaleDateString()}
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
             )}

             {/* Match Wins Header */}
             {team.wins.some(w => w.category !== 'Tournament') && (
               <div className={styles.winHistorySection}>
                  <h2 className={`${styles.winTitle} ${styles.winHeaderMatch}`}>
                    ⚔️ Match Victories <span className={`${styles.winCount} ${styles.winCountSilver}`}>{team.wins.filter(w=>w.category!=='Tournament').length}</span>
                  </h2>
                  <div className={styles.winGrid}>
                    {team.wins.filter(w=>w.category!=='Tournament').map(win => (
                      <div key={win.id} className={styles.winCard}>
                         <div className={styles.winDescription}>{win.description}</div>
                         <div className={styles.winCategory}>{win.category}</div>
                         <div className={styles.winDate}>
                           {new Date(win.date).toLocaleDateString()}
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
             )}
          </div>
        )}

      </div>

      {/* Athlete Info Modal */}
      {showPlayerModal && selectedPlayer && (
        <div className={styles.modalOverlay} onClick={() => setShowPlayerModal(false)}>
          <div 
            className={`glass-panel ${styles.playerModal}`} 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowPlayerModal(false)}
              className={styles.closeModal}
            >
              ×
            </button>

            <div className={styles.playerProfile}>
              <div 
                onClick={() => window.location.href = `/profile?id=${selectedPlayer.id}`}
                className={styles.avatarLink}
                title="View Full Profile"
              >
                <img 
                  src={selectedPlayer.avatar} 
                  alt={selectedPlayer.name} 
                  className={styles.playerAvatar}
                />
                <h2 className={styles.playerName}>
                    {selectedPlayer.name}
                </h2>
              </div>

              <div className={styles.playerTagline}>
                 {selectedPlayer.sport || 'Athlete'} | {selectedPlayer.positions || selectedPlayer.role || 'Member'}
              </div>
              <p className={styles.playerBio}>
                "{selectedPlayer.bio || `Representing ${team.name}`}"
              </p>

              {/* Physical Stats Grid */}
              <div className={styles.statsGrid}>
                <div className={styles.statBlock}>
                  <div className={styles.statHeader}>Height</div>
                  <div className={styles.statVal}>{selectedPlayer.height || '--'}</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statHeader}>Weight</div>
                  <div className={styles.statVal}>{selectedPlayer.weight || '--'}</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statHeader}>Speed</div>
                  <div className={styles.statVal}>{selectedPlayer.speed || '--'}</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statHeader}>Vertical</div>
                  <div className={styles.statVal}>{selectedPlayer.vertical || '--'}</div>
                </div>
              </div>

              {/* Career Summary */}
              <div className={styles.careerHighlights}>
                <h3 className={styles.careerTitle}>
                  🏆 Career Highlights ({selectedPlayer.careerWins?.length || 0} Wins)
                </h3>
                {selectedPlayer.careerWins?.length > 0 ? (
                  <div className={styles.careerList}>
                    {selectedPlayer.careerWins.slice(0, 5).map(win => (
                      <div key={win.id} className={styles.careerItem}>
                        <span className={styles.highlightName}>{win.description}</span>
                        <span className={styles.highlightTeam}>{win.teamName}</span>
                      </div>
                    ))}
                    {selectedPlayer.careerWins.length > 5 && (
                      <div className={styles.memberRole} style={{ textAlign: 'center', marginTop: '0.5rem' }}>+ {selectedPlayer.careerWins.length - 5} more wins</div>
                    )}
                  </div>
                ) : (
                  <p className={styles.emptyHighlights}>No victories recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
