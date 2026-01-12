"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { useAuth } from '@/context/AuthContext';
import { uploadCompressedImage } from '@/lib/imageOptimizer';
import { useRouter, useSearchParams } from 'next/navigation';
import { teamService } from "@/services/teamService";
import { authService } from "@/services/authService";
import styles from './profile.module.css';

export default function ProfilePage() {
  const { user: authUser, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get('id');

  const [isEditing, setIsEditing] = useState(false);
  const [userTeams, setUserTeams] = useState([]);
  const [careerWins, setCareerWins] = useState([]);
  const [isMetric, setIsMetric] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile Data State (Separated from Auth User)
  const [profileUser, setProfileUser] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Local state for editing
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    sport: '',
    positions: '',
    height: '',
    weight: '',
    speed: '',
    vertical: '',
    avatar: ''
  });
  
  // Store raw file for upload
  const [avatarFile, setAvatarFile] = useState(null);

  // Determine if viewing own profile
  const isOwnProfile = !profileId || (authUser && authUser.id === profileId);

  useEffect(() => {
    // Wait for auth to load before deciding to redirect
    if (authLoading) return;

    const loadData = async () => {
      setIsLoadingProfile(true);
      
      let targetUser = null;

      if (isOwnProfile) {
        if (!authUser) {
           // Not logged in and no ID -> Redirect Login
           router.push('/login');
           return;
        }
        targetUser = authUser;
      } else {
        // Fetch public profile
        targetUser = await authService.getUserProfile(profileId);
      }

      if (targetUser) {
        setProfileUser(targetUser);
        setFormData({
            name: targetUser.name,
            bio: targetUser.bio || '',
            sport: targetUser.sport || '',
            positions: targetUser.positions || '',
            height: targetUser.height || '',
            weight: targetUser.weight || '',
            speed: targetUser.speed || '',
            vertical: targetUser.vertical || '',
            avatar: targetUser.avatar
        });
        
        // Load History
        const teams = await teamService.getUserTeams(targetUser.id);
        setUserTeams(teams);
        
        const wins = [];
        teams.forEach(t => {
          if (t.wins) {
            t.wins.forEach(w => {
              wins.push({ ...w, teamName: t.name, teamSport: t.sport });
            });
          }
        });
        wins.sort((a,b) => new Date(b.date) - new Date(a.date));
        setCareerWins(wins);
      }
      setIsLoadingProfile(false);
    };

    loadData();
  }, [authUser, authLoading, profileId, isOwnProfile, router]);

  const handleSave = async () => {
    if (!isOwnProfile) return; // Security check

    setIsSaving(true);
    let finalAvatarUrl = formData.avatar;

    // Upload new avatar if selected
    if (avatarFile) {
        console.log("Starting upload...");
        const url = await uploadCompressedImage(avatarFile, 'allstar-assets', 'avatars');
        if (url) {
            console.log("Upload successful:", url);
            finalAvatarUrl = url;
        } else {
            console.error("Upload returned null");
            alert("Failed to upload image. Saving other changes.");
        }
    }

    const result = await updateUser({ ...formData, avatar: finalAvatarUrl });
    
    if (result.success) {
        setIsEditing(false);
        setAvatarFile(null);
        // Update local display immediately
        setProfileUser(prev => ({ ...prev, ...formData, avatar: finalAvatarUrl }));
    } else {
        alert("Failed to save profile: " + result.error);
    }
    
    setIsSaving(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file); // Store for upload
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading || !user) return <div className={styles.main} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={`container ${styles.container}`}>
        
        <div className={styles.profileGrid}>
          
          {/* Left Column: Profile Card & Stats */}
          <div className={styles.leftColumn}>
            
            {/* Identity Card */}
            <div className={`glass-panel ${styles.glassPanel} ${styles.identityCard}`}>
              <div className={styles.avatarContainer}>
                <img 
                  src={isEditing && formData.avatar ? formData.avatar : profileUser.avatar} 
                  alt="Profile" 
                  className={styles.avatarImage}
                />
              </div>

              {isEditing && isOwnProfile ? (
                  <div style={{ marginBottom: '1rem' }}>
                     <label htmlFor="avatar-upload" className={styles.uploadLabel}>Change Photo</label>
                     <input id="avatar-upload" type="file" accept="image/*" onChange={handleImageUpload} className={styles.hidden} />
                  </div>
              ) : null}

              {isEditing && isOwnProfile ? (
                 <div className={styles.editForm}>
                    <input 
                      placeholder="Name"
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className={styles.input}
                    />
                     <textarea 
                      placeholder="Bio"
                      value={formData.bio} 
                      onChange={e => setFormData({...formData, bio: e.target.value})}
                      className={styles.textarea}
                    />
                 </div>
              ) : (
                <>
                  <h1 className={styles.userName}>{profileUser.name}</h1>
                  <p className={styles.userBio}>{profileUser.bio || 'Top Athlete'}</p>
                </>
              )}
            </div>

   {/* Physical Stats */}
            <div className={`glass-panel ${styles.glassPanel}`}>
               <div className={styles.statsHeader}>
                  <h3>Attributes</h3>
                  <div className={styles.toggleContainer}>
                    <button 
                      onClick={() => setIsMetric(false)}
                      className={`${styles.toggleButton} ${!isMetric ? styles.toggleButtonActive : ''}`}
                    >
                      Imperial
                    </button>
                    <button 
                      onClick={() => setIsMetric(true)}
                       className={`${styles.toggleButton} ${isMetric ? styles.toggleButtonActive : ''}`}
                    >
                      Metric
                    </button>
                  </div>
               </div>
               
               {isEditing && isOwnProfile ? (
                 <div className={styles.statsGridEdit}>
                    <div>
                      <label className={styles.label}>{isMetric ? 'Height (cm)' : 'Height (ft/in)'}</label>
                      <input 
                        placeholder={isMetric ? "e.g. 188" : "e.g. 6'2"}
                        value={formData.height} 
                        onChange={e => setFormData({...formData, height: e.target.value})}
                        className={styles.input}
                      />
                    </div>
                    <div>
                      <label className={styles.label}>{isMetric ? 'Weight (kg)' : 'Weight (lbs)'}</label>
                      <input 
                        placeholder={isMetric ? "e.g. 85" : "e.g. 190"}
                        value={formData.weight} 
                        onChange={e => setFormData({...formData, weight: e.target.value})}
                        className={styles.input}
                      />
                    </div>
                    <div>
                      <label className={styles.label}>{isMetric ? 'Speed (km/h)' : 'Speed (mph)'}</label>
                      <input 
                        placeholder={isMetric ? "e.g. 30" : "e.g. 20"}
                        value={formData.speed} 
                        onChange={e => setFormData({...formData, speed: e.target.value})}
                        className={styles.input}
                      />
                    </div>
                     <div>
                      <label className={styles.label}>{isMetric ? 'Vertical (cm)' : 'Vertical (in)'}</label>
                      <input 
                        placeholder={isMetric ? "e.g. 75" : "e.g. 30"}
                        value={formData.vertical} 
                        onChange={e => setFormData({...formData, vertical: e.target.value})}
                        className={styles.input}
                      />
                    </div>
                     <div className={styles.span2}>
                      <label className={styles.label}>Primary Sport</label>
                      <input 
                        placeholder="e.g. Basketball"
                        value={formData.sport} 
                        onChange={e => setFormData({...formData, sport: e.target.value})}
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.span2}>
                      <label className={styles.label}>Positions (comma sep)</label>
                      <input 
                        placeholder="e.g. PG, SG"
                        value={formData.positions} 
                        onChange={e => setFormData({...formData, positions: e.target.value})}
                        className={styles.input}
                      />
                    </div>
                 </div>
               ) : (
                 <div className={styles.statsGridDisplay}>
                    <div>
                       <div className={styles.label}>{isMetric ? 'Height (cm)' : 'Height'}</div>
                       <div className={styles.value}>{profileUser.height || '-'}</div>
                    </div>
                    <div>
                       <div className={styles.label}>{isMetric ? 'Weight (kg)' : 'Weight'}</div>
                       <div className={styles.value}>{profileUser.weight || '-'}</div>
                    </div>
                    <div>
                       <div className={styles.label}>{isMetric ? 'Speed (km/h)' : 'Speed'}</div>
                       <div className={styles.value}>{profileUser.speed || '-'}</div>
                    </div>
                    <div>
                       <div className={styles.label}>{isMetric ? 'Vertical (cm)' : 'Vertical'}</div>
                       <div className={styles.value}>{profileUser.vertical || '-'}</div>
                    </div>
                    <div className={styles.span2}>
                       <div className={styles.label}>Sport & Positions</div>
                       <div className={`${styles.value} ${styles.highlight}`}>
                         {profileUser.sport} <span className={styles.separator}>|</span> {profileUser.positions || 'Any'}
                       </div>
                    </div>
                 </div>
               )}
               
               <div className={styles.actions}>
                  {isOwnProfile && (
                    isEditing ? (
                       <div className={styles.buttonGroup}>
                         <button onClick={() => setIsEditing(false)} className={`${styles.button} ${styles.buttonCancel}`} disabled={isSaving}>Cancel</button>
                         <button onClick={handleSave} className={`${styles.button} ${styles.buttonSave}`} disabled={isSaving}>
                           {isSaving ? 'Saving...' : 'Save Changes'}
                         </button>
                       </div>
                    ) : (
                      <button onClick={() => setIsEditing(true)} className={`${styles.button} ${styles.buttonEdit}`}>Edit Attributes</button>
                   )
                  )}
               </div>
            </div>

          </div>

          {/* Right Column: Career History */}
          <div className={styles.rightColumn}>
             
             {/* Career Highlights */}
             <div className={`glass-panel ${styles.glassPanel}`}>
               <h2 className={styles.sectionTitle}>
                 🏆 Career History 
                 <span className={styles.winCount}>{careerWins.length} Wins</span>
               </h2>

               {careerWins.length === 0 ? (
                 <div className={styles.emptyState}>
                   No wins recorded yet. Join a team and start competing!
                 </div>
               ) : (
                 <div className={styles.historyList}>
                   {careerWins.map(win => (
                     <div key={win.id} className={`${styles.historyItem} ${win.category === 'Tournament' ? styles.tournamentItem : styles.matchItem}`}>
                        <div>
                          <div className={`${styles.historyTitle} ${win.category === 'Tournament' ? styles.tournamentText : styles.matchText}`}>
                            {win.description}
                          </div>
                          <div className={styles.historySubtitle}>
                            with <span className={styles.teamName}>{win.teamName}</span> ({win.teamSport})
                          </div>
                        </div>
                        <div className={styles.historyMeta}>
                           <div className={styles.metaCategory}>{win.category}</div>
                           <div className={styles.metaDate}>{new Date(win.date).toLocaleDateString()}</div>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>

             {/* Active Teams */}
             <div className={`glass-panel ${styles.glassPanel}`}>
               <h3 style={{ margin: '0 0 1.5rem' }}>Current Teams</h3>
               {userTeams.length === 0 ? (
                 <p style={{ color: '#666' }}>Not a member of any teams yet.</p>
               ) : (
                 <div className={styles.teamsGrid}>
                   {userTeams.map(t => (
                     <div 
                        key={t.id} 
                        onClick={() => router.push(`/teams/${t.id}`)}
                        className={styles.teamCard}
                     >
                       <div className={styles.teamCardName}>{t.name}</div>
                       <div className={styles.teamCardSport}>{t.sport}</div>
                     </div>
                   ))}
                 </div>
               )}
             </div>

          </div>
        </div>
      </div>
    </main>
  );
}
