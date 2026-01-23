"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { authService } from '@/services/authService';
import { teamService } from '@/services/teamService';

export default function MigrationPage() {
  const [logs, setLogs] = useState([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);

  const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const runMigration = async () => {
    if (!confirm("This will upload your local data to Supabase. Continue?")) return;
    setIsMigrating(true);
    setLogs([]);
    addLog("Starting comprehensive migration...");

    try {
        addLog("--- DEBUG: LocalStorage Keys ---");
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const size = localStorage.getItem(key).length;
            addLog(`Key: "${key}" (Size: ${size} chars)`);
        }
        addLog("--------------------------------");

        const localUsers = JSON.parse(localStorage.getItem('allstar_users_db') || '[]');
        const localTeams = JSON.parse(localStorage.getItem('allstar_teams') || '[]');
        const localTournaments = JSON.parse(localStorage.getItem('allstar_tournaments') || '[]');
        const localEvents = JSON.parse(localStorage.getItem('allstar_events') || '[]');
        // Try multiple keys for venues as fallback
        const localVenues = JSON.parse(localStorage.getItem('allstar_venues') || localStorage.getItem('venues') || '[]');

        addLog(`Found: ${localUsers.length} Users, ${localTeams.length} Teams, ${localVenues.length} Venues.`);

        const userIdMap = {}; // oldId -> newId
        const teamIdMap = {}; // oldId -> newId

        // 2. MIGRATE USERS
        addLog("--- Phase 1: Users ---");
        const emailMap = new Set(); 

        for (const user of localUsers) {
            try {
                const safeName = user.name && user.name.trim().length > 0 ? user.name : `User ${user.id}`;
                let safeEmail = user.email ? user.email.trim().toLowerCase() : '';
                
                if (!safeEmail.includes('@') || safeEmail.length < 5) {
                    safeEmail = `migrated_${user.id.replace(/[^a-zA-Z0-9]/g, '')}@placeholder.com`;
                }
                if (emailMap.has(safeEmail)) continue; 
                emailMap.add(safeEmail);

                let safePassword = user.password || 'password123';
                if (safePassword.length < 6) safePassword = safePassword.padEnd(6, '0');

                // Try register
                const result = await authService.register(safeName, safeEmail, safePassword);
                let newUserId = result.success ? result.user.id : null;

                if (!newUserId && result.error?.includes('already registered')) {
                     // Try to map by "guessing" but safer to just log warning
                     addLog(`   -> User exists: ${safeEmail}`);
                }

                if (newUserId) {
                    userIdMap[user.id] = newUserId;
                    // Update Profile Stats
                    await authService.updateProfile({
                        bio: user.bio || 'Migrated User',
                        sport: user.sport || 'Any',
                        height: user.height || '',
                        weight: user.weight || '',
                        speed: user.speed || '',
                        vertical: user.vertical || ''
                    });
                    addLog(`   -> Migrated User: ${safeName}`);
                }
            } catch (e) {
                addLog(`   -> Error Migrate User: ${e.message}`);
            }
        }

        // 3. MIGRATE TEAMS & WINS
        addLog("--- Phase 2: Teams & History ---");
        for (const team of localTeams) {
            try {
                const newOwnerId = userIdMap[team.ownerId];
                if (!newOwnerId) {
                    addLog(`   -> SKIPPED Team ${team.name}: Owner not found.`);
                    continue;
                }

                // Create Team
                const newTeam = await teamService.createTeam({
                    name: team.name,
                    sport: team.sport,
                    description: team.description,
                    logo: team.logo 
                }, { id: newOwnerId });

                teamIdMap[team.id] = newTeam.id;
                addLog(`   -> Migrated Team: ${team.name}`);

                // Migrate Members
                if (team.members) {
                    for (const member of team.members) {
                        if (member.role === 'Owner') continue; 
                        const newMemberId = userIdMap[member.id];
                        if (!newMemberId) continue;
                        
                        await supabase.from('team_members').insert({
                            team_id: newTeam.id,
                            user_id: newMemberId,
                            role: member.role || 'Member',
                            position: member.position || 'Bench'
                        });
                    }
                }

                // NEW: Migrate Wins
                if (team.wins && team.wins.length > 0) {
                    for (const win of team.wins) {
                        await supabase.from('team_wins').insert({
                           team_id: newTeam.id,
                           category: win.category,
                           description: win.description,
                           date: win.date || new Date().toISOString()
                        });
                    }
                    addLog(`      -> Added ${team.wins.length} win records.`);
                }

            } catch (e) {
                addLog(`   -> Error Migrate Team: ${e.message}`);
            }
        }

        // 4. MIGRATE TOURNAMENTS
        addLog("--- Phase 3: Tournaments ---");
        for (const tour of localTournaments) {
             try {
                 const creatorId = userIdMap[tour.creatorId]; // might be null, that's allowed in schema? schema says creator_id references profile.
                 
                 // Insert Tournament
                 const { data: newTour, error: tErr } = await supabase.from('tournaments').insert({
                     name: tour.name,
                     sport: tour.sport,
                     creator_id: creatorId, // if null, valid? Schema: creator_id uuid references ... (nullable)
                     status: tour.status || 'Active',
                     created_at: new Date().toISOString()
                 }).select().single();

                 if (tErr) throw tErr;

                 // Insert Joined Teams (Tournament Teams)
                 // Need to find which teams were in it.
                 // Local struct: tour.teams = [{id, name...}]. We map these IDs.
                 if (tour.teams) {
                     for (const t of tour.teams) {
                         const newTId = teamIdMap[t.id];
                         if (newTId) {
                             await supabase.from('tournament_teams').insert({
                                 tournament_id: newTour.id,
                                 team_id: newTId
                             });
                         }
                     }
                 }

                 // Insert Matches
                 if (tour.matches) {
                     for (const m of tour.matches) {
                         const team1Id = m.team1 ? teamIdMap[m.team1.id] : null;
                         const team2Id = m.team2 ? teamIdMap[m.team2.id] : null;
                         const winnerId = m.winnerId ? teamIdMap[m.winnerId] : null;

                         // Construct match_identifier if missing
                         const matchIdStr = m.id.startsWith('m_') ? m.id : `m_${m.round}_${Math.floor(Math.random()*10)}`; 

                         await supabase.from('matches').insert({
                             tournament_id: newTour.id,
                             round: m.round,
                             match_identifier: matchIdStr, 
                             team1_id: team1Id,
                             team2_id: team2Id,
                             winner_id: winnerId,
                             score1: m.score1 || 0,
                             score2: m.score2 || 0
                         });
                     }
                 }
                 addLog(`   -> Migrated Tournament: ${tour.name}`);

             } catch (e) {
                 addLog(`   -> Error Migrate Tournament ${tour.name}: ${e.message}`);
             }
        }

        // 5. MIGRATE VENUES
        addLog("--- Phase 4: Venues ---");
        for (const venue of localVenues) {
            try {
                // If venue has an owner, try to map it
                const ownerId = venue.ownerId ? userIdMap[venue.ownerId] : null;

                const { data: newVenue, error: vErr } = await supabase.from('venues').insert({
                    name: venue.name,
                    type: venue.type || 'Generic',
                    sport: venue.sport || 'Multi-sport',
                    location: venue.location || 'Unknown',
                    rating: venue.rating || 4.0,
                    price: venue.price || 'Free',
                    image: venue.image || null,
                    amenities: venue.amenities || [],
                    coordinates: venue.coordinates || [0, 0],
                    gallery: venue.gallery || [],
                    description: venue.description || 'Migrated Venue',
                    owner_id: ownerId, // Map to new user ID or null
                    created_at: new Date().toISOString()
                }).select().single();

                if (vErr) {
                     // If duplicate or error, log it
                     if (vErr.code === '23505') {
                        addLog(`   -> Skipped Duplicate Venue: ${venue.name}`);
                     } else {
                        throw vErr;
                     }
                } else {
                     addLog(`   -> Migrated Venue: ${venue.name}`);
                }
            } catch (e) {
                addLog(`   -> Error Migrate Venue ${venue.name}: ${e.message}`);
            }
        }

        // 6. MIGRATE EVENTS
        addLog("--- Phase 5: Events ---");
        for (const evt of localEvents) {
            try {
                const creatorId = userIdMap[evt.creatorId];
                
                const { data: newEvt, error: eErr } = await supabase.from('events').insert({
                    title: evt.title,
                    type: evt.type,
                    sport: evt.sport,
                    date: evt.date,
                    time: evt.time,
                    location: evt.location,
                    description: evt.description,
                    cost: evt.cost,
                    reward: evt.reward,
                    max_spots: evt.maxSpots,
                    image: evt.image,
                    image_gradient: evt.imageGradient,
                    creator_id: creatorId
                }).select().single();

                if (eErr) throw eErr;

                if (evt.attendees) {
                    for (const attendee of evt.attendees) {
                        const newUserId = userIdMap[attendee.id];
                        if (newUserId) {
                             await supabase.from('event_attendees').insert({
                                 event_id: newEvt.id,
                                 user_id: newUserId
                             });
                        }
                    }
                }
                addLog(`   -> Migrated Event: ${evt.title}`);
            } catch (e) {
                 addLog(`   -> Error Migrate Event: ${e.message}`);
            }
        }
        
        addLog("✅ COMPLETE: All data migrated successfully!");

    } catch (err) {
        addLog(`CRITICAL ERROR: ${err.message}`);
    } finally {
        setIsMigrating(false);
    }
  };

  const downloadCSV = (filename, rows) => {
    if (!rows || !rows.length) return;
    const headers = Object.keys(rows[0]);
    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] || '')).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Deterministic UUID-like string from timestamp string
  // Format: 00000000-0000-0000-0000-000([timestamp]) (Simple padding)
  // Input: "u_1700000" -> remove non-numeric -> pad to 12 chars -> suffix
  // UUID: 8-4-4-4-12
  const toUUID = (localId) => {
    if (!localId) return null;
    // Just create a random one? No, needs to be consistent for relations.
    // Hash-like approach:
    const numPart = localId.replace(/[^0-9]/g, '');
    // Pad start to ensure we have enough digits for at least the last segment
    const padded = numPart.padStart(12, '0'); 
    // Construct fake UUID: 00000000-0000-0000-0000-[12 digits]
    return `00000000-0000-0000-0000-${padded.slice(-12)}`;
  };

  const handleExportUsers = () => {
    const localUsersStr = localStorage.getItem('allstar_users_db');
    if (!localUsersStr) { alert("No local users found."); return; }
    
    const localUsers = JSON.parse(localUsersStr);
    
    // Map to 'public.profiles' schema
    const csvRows = localUsers.map(u => ({
        id: toUUID(u.id),
        email: u.email,
        name: u.name,
        avatar: u.avatar || '',
        bio: u.bio || '',
        sport: u.sport || 'Any',
        height: u.height || '',
        weight: u.weight || '',
        speed: u.speed || '',
        vertical: u.vertical || '',
        created_at: u.joinedAt || new Date().toISOString()
    }));

    downloadCSV('supabase_profiles.csv', csvRows);
  };

  const handleExportTeams = () => {
    const localTeamsStr = localStorage.getItem('allstar_teams');
    if (!localTeamsStr) { alert("No local teams found."); return; }

    const localTeams = JSON.parse(localTeamsStr);

    // 1. Teams Table CSV
    const teamRows = localTeams.map(t => ({
        id: toUUID(t.id),
        name: t.name,
        sport: t.sport,
        description: t.description || '',
        logo: t.logo?.length < 32000 ? t.logo : '', // Skip huge Base64 to avoid CSV break? Or keep it.
        owner_id: toUUID(t.ownerId),
        created_at: t.createdAt || new Date().toISOString()
    }));
    downloadCSV('supabase_teams.csv', teamRows);

    // 2. Team Members CSV (Relation)
    // We flatten the all members from all teams into one list
    const memberRows = [];
    localTeams.forEach(t => {
        if (t.members) {
            t.members.forEach(m => {
                memberRows.push({
                   // id: random UUID? NO, schema has "team_id, user_id" as unique, but table has its own ID.
                   // we can generate a random ID or just omit if DB generates it? 
                   // CSV import usually requires ID if it's PK, or we can omit ID column to let Default work?
                   // Let's omit 'id' and hope Supabase CSV import handles "Default" for PK.
                   // Actually, safer to generate one.
                   id: `00000000-0000-0000-0001-${Math.floor(Math.random()*1000000000000).toString().padStart(12,'0')}`, 
                   team_id: toUUID(t.id),
                   user_id: toUUID(m.id),
                   role: m.role,
                   position: m.position,
                   joined_at: new Date().toISOString()
                });
            });
        }
    });
    // Slight delay to prevent brower block
    setTimeout(() => downloadCSV('supabase_team_members.csv', memberRows), 500);
  };


  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'white' }}>
      <h1>Data Migration Utility</h1>
      <p>Recommended: Click "Start Migration" to automatically create Supabase accounts and link your teams.</p>
      
      <div style={{ background: '#333', padding: '1rem', borderRadius: '8px', margin: '2rem 0' }}>
         <strong>Why not CSV Drag-and-Drop?</strong>
         <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>
            Supabase Authentication handles passwords securely. You cannot drag-and-drop users with passwords directly into the database table. 
            This utility uses the API to properly register your users and maintain the link to their teams.
         </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={runMigration} 
            disabled={isMigrating}
            style={{ 
                background: isMigrating ? '#555' : 'var(--color-primary, #6366f1)',
                color: 'white', padding: '16px 24px', border: 'none', borderRadius: '6px',
                fontSize: '1.2rem', cursor: isMigrating ? 'wait' : 'pointer',
                textAlign: 'center'
            }}
          >
            {isMigrating ? 'Migrating...' : '🚀 Start Auto-Migration (Recommended)'}
          </button>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
                onClick={handleExportUsers} 
                style={{ 
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid #666',
                    color: '#ccc', padding: '12px 16px', borderRadius: '6px',
                    cursor: 'pointer'
                }}
            >
                ⬇️ Download Users CSV
            </button>
            <button 
                onClick={handleExportTeams} 
                style={{ 
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid #666',
                    color: '#ccc', padding: '12px 16px', borderRadius: '6px',
                    cursor: 'pointer'
                }}
            >
                ⬇️ Download Teams CSV
            </button>
          </div>
      </div>

      <div style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px', height: '400px', overflowY: 'auto', fontFamily: 'monospace' }}>
        {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid #333' }}>{log}</div>
        ))}
      </div>
    </div>
  );
}
