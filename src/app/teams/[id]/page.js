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
    <main style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <Navbar />
      
      <div className="container" style={{ paddingTop: '120px' }}>
        
        {/* Header */}
        <div className={`glass-panel ${styles.teamHeader}`}>
          
          {/* Logo Section */}
          <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
             <img 
               src={team.logo || `https://ui-avatars.com/api/?name=${team.name}&background=random&size=200`} 
               alt={team.name} 
               style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)' }}
             />
             {isOwner && (
               <>
                 <label 
                   htmlFor="team-logo-upload"
                   style={{ 
                     position: 'absolute', bottom: 0, right: 0, 
                     background: 'var(--color-primary)', color: 'white', 
                     width: '32px', height: '32px', borderRadius: '50%', 
                     display: 'flex', alignItems: 'center', justifyContent: 'center', 
                     cursor: 'pointer', border: '2px solid #222'
                   }}
                   title="Change Logo"
                 >
                   ✏️
                 </label>
                 <input 
                   id="team-logo-upload" 
                   type="file" 
                   accept="image/*" 
                   onChange={handleLogoUpdate} 
                   style={{ display: 'none' }}
                 />
               </>
             )}
          </div>

          <div style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{team.name}</h1>
              <span style={{ background: '#333', padding: '4px 10px', borderRadius: '4px', border: '1px solid #555' }}>{team.sport}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{team.description}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem', paddingLeft: '2rem', borderLeft: '1px solid var(--border-glass)' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{team.members.length}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Members</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
               <h2 style={{ margin: 0 }}>Starting Lineup</h2>
               {isOwner && <span style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>Drag players to positions</span>}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Join Requests Panel */}
            {isOwner && team.requests && team.requests.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--color-primary)' }}>
                    <h2 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                        📩 Join Requests <span style={{ background: 'var(--color-primary)', color: 'white', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px' }}>{team.requests.length}</span>
                    </h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {team.requests.map(req => (
                            <li key={req.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img src={req.avatar} alt={req.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                <div style={{ flexGrow: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{req.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#888' }}>{new Date(req.requestedAt).toLocaleDateString()}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button 
                                        onClick={() => handleAcceptRequest(req.id, 'Bench')} 
                                        style={{ background: '#4CAF50', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px' }}
                                        title="Accept to Bench"
                                    >
                                        ✅
                                    </button>
                                    <button 
                                        onClick={() => handleRejectRequest(req.id)}
                                        style={{ background: '#f44336', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px' }}
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
                <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px', border: isOwner ? '2px dashed var(--border-glass)' : '1px solid var(--border-glass)' }}>
                <h2 style={{ margin: '0 0 1.5rem' }}>Bench / Roster</h2>
                
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {benchPlayers.length === 0 && <div style={{ fontStyle: 'italic', color: '#666' }}>Bench is empty.</div>}
                    
                    {benchPlayers.map(member => (
                    <li 
                        key={member.id} 
                        draggable={isOwner}
                        onDragStart={(e) => handleDragStart(e, member.id)}
                        onClick={() => handlePlayerClick(member)}
                        style={{ 
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '10px', 
                        background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                        cursor: 'pointer', border: '1px solid transparent'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                    >
                        <img src={member.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt={member.name} />
                        <div style={{ flexGrow: 1 }}>
                        <div style={{ fontWeight: '600' }}>{member.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{member.role}</div>
                        </div>
                        {isOwner && <span style={{ fontSize: '1.2rem', color: '#666' }}>:::</span>}
                    </li>
                    ))}
                </ul>

                {isOwner && (
                    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                    <h3>Add Guest Player</h3>
                    <form onSubmit={handleAddGuest} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input 
                        placeholder="Name" 
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: 'white' }}
                        required
                        />
                        <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Add to Bench</button>
                    </form>
                    </div>
                )}
                </div>
            </div>
          </div>
        </div>

        {/* Win History Section (Moved to Bottom) */}
        {team.wins && team.wins.length > 0 && (
          <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
             
             {/* Tournament Wins Header */}
             {team.wins.some(w => w.category === 'Tournament') && (
               <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FFD700' }}>
                    🏆 Tournament Championships <span style={{ fontSize: '1rem', background: '#FFD700', color: 'black', padding: '2px 8px', borderRadius: '12px' }}>{team.wins.filter(w=>w.category==='Tournament').length}</span>
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {team.wins.filter(w=>w.category==='Tournament').map(win => (
                      <div key={win.id} style={{ 
                        background: 'rgba(255,215,0, 0.1)', 
                        border: '1px solid rgba(255,215,0,0.3)', 
                        padding: '1rem', 
                        borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', gap: '0.3rem'
                      }}>
                         <div style={{ fontWeight: 'bold', color: '#FFD700' }}>{win.description}</div>
                         <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: 'auto' }}>
                           {new Date(win.date).toLocaleDateString()}
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
             )}

             {/* Match Wins Header */}
             {team.wins.some(w => w.category !== 'Tournament') && (
               <div>
                  <h2 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
                    ⚔️ Match Victories <span style={{ fontSize: '1rem', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>{team.wins.filter(w=>w.category!=='Tournament').length}</span>
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {team.wins.filter(w=>w.category!=='Tournament').map(win => (
                      <div key={win.id} style={{ 
                        background: 'rgba(255,255,255, 0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        padding: '1rem', 
                        borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', gap: '0.3rem'
                      }}>
                         <div style={{ fontWeight: 'bold', color: 'white' }}>{win.description}</div>
                         <div style={{ fontSize: '0.8rem', color: '#888' }}>{win.category}</div>
                         <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 'auto' }}>
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
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }} onClick={() => setShowPlayerModal(false)}>
          <div 
            className="glass-panel" 
            style={{ width: '100%', maxWidth: '450px', padding: '2rem', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowPlayerModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              ×
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <img 
                src={selectedPlayer.avatar} 
                alt={selectedPlayer.name} 
                style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--color-primary)', objectFit: 'cover', marginBottom: '1rem' }} 
              />
              <h2 style={{ margin: 0, fontSize: '2rem' }}>{selectedPlayer.name}</h2>
              <div style={{ color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '0.2rem' }}>
                 {selectedPlayer.sport || 'Athlete'} | {selectedPlayer.positions || selectedPlayer.role || 'Member'}
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
                {selectedPlayer.bio || `Representing ${team.name}`}
              </p>

              {/* Physical Stats Grid */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', 
                background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Height</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedPlayer.height || '--'}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Weight</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedPlayer.weight || '--'}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Speed</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedPlayer.speed || '--'}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vertical</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedPlayer.vertical || '--'}</div>
                </div>
              </div>

              {/* Career Summary */}
              <div style={{ width: '100%', textAlign: 'left' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                  🏆 Career Highlights ({selectedPlayer.careerWins?.length || 0} Wins)
                </h3>
                {selectedPlayer.careerWins?.length > 0 ? (
                  <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedPlayer.careerWins.slice(0, 5).map(win => (
                      <div key={win.id} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold' }}>{win.description}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{win.teamName}</span>
                      </div>
                    ))}
                    {selectedPlayer.careerWins.length > 5 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textAlign: 'center' }}>+ {selectedPlayer.careerWins.length - 5} more wins</div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>No victories recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
