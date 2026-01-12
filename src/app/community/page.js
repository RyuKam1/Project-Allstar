"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { communityService } from "@/services/communityService";
import { teamService } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Link from 'next/link';
import styles from './community.module.css';

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    loadData();

    // SETUP REALTIME LISTENER
    // This allows smooth updates: when ANYONE posts, it pops up here.
    const channel = supabase
      .channel('public:community_posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, 
        async (payload) => {
          // Fetch the full post details (need author name/avatar which isn't in payload)
          // We could cheat and append payload, but better to fetch single fresh row
           const { data: newPostData, error } = await supabase
            .from('community_posts')
            .select(`*, author:profiles(name, avatar), likes:post_likes(user_id)`)
            .eq('id', payload.new.id)
            .single();
           
           if (newPostData && !error) {
               const formatted = {
                  id: newPostData.id,
                  content: newPostData.content,
                  type: newPostData.type,
                  authorId: newPostData.user_id,
                  authorName: newPostData.author?.name || 'Unknown',
                  authorAvatar: newPostData.author?.avatar,
                  timestamp: newPostData.created_at,
                  likes: 0,
                  likedBy: [],
                  comments: 0
               };
               setPosts(prev => [formatted, ...prev]);
           }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const [fetchedPosts, fetchedTeams] = await Promise.all([
        communityService.getAllPosts(),
        teamService.getAllTeams()
        ]);
        setPosts(fetchedPosts);
        setTeams(fetchedTeams);
    } catch(e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user) { alert("Please login to post"); return; }
    if (!postContent.trim()) return;

    try {
        await communityService.createPost(
        user.id,
        user.name,
        null, 
        postContent
        );
        setPostContent('');
        // No need to reload! Realtime will catch our own post too.
    } catch (err) {
        alert(err.message); // Handles Rate Limit Error
    }
  };

  const handleLike = async (postId) => {
    if (!user) {
      alert("Please login to like posts");
      return;
    }
    await communityService.toggleLike(postId, user.id);
    // Optimistic update handled by Realtime? 
    // Actually, toggleLike triggers a DB change. 
    // If we have a Realtime listener on 'post_likes' table, we could update count.
    // But our current listener is only on INSERT to 'community_posts'.
    // So we should probably reload or locally toggle. 
    // For simplicity, let's reload data to get fresh counts.
    loadData();
  };

  const getTimeAgo = (timestamp) => {
     // ... (remains same) ...
     const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
     if (seconds < 60) return 'Just now';
     if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
     if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
     return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Get leaderboard (top 5 users by wins)
  const getLeaderboard = () => {
    const userStats = {};
    teams.forEach(team => {
      // Ensure wins exists (it was added in recent teamService update)
      if (team.wins && Array.isArray(team.wins)) {
        // We credit wins to ALL members of the team
        team.members.forEach(member => {
            if (!userStats[member.id]) {
              userStats[member.id] = { name: member.name, wins: 0, avatar: member.avatar };
            }
            userStats[member.id].wins += team.wins.length;
        });
      }
    });
    return Object.values(userStats).sort((a, b) => b.wins - a.wins).slice(0, 5);
  };

  const leaderboard = getLeaderboard();
  const trendingTeams = teams.slice(0, 5);

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <Navbar />
      
      <div className="container" style={{ paddingTop: '120px' }}>
         {/* Header */}
        <div className={styles.header}>
          <h1>
            The <span className="primary-gradient-text">Huddle</span>
          </h1>
          <p>
            Connect with athletes, share victories, and find your next teammate.
          </p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
           {['All', 'Teams', 'Events'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.communityLayout}>
          {/* Main Feed */}
          <div>
            {/* Post Composer */}
            {user && (
              <div className={`glass-panel ${styles.postComposer}`}>
                <form onSubmit={handleCreatePost}>
                   <div className={styles.composerContent}>
                    <img 
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                      alt={user.name}
                      style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                      className={styles.composerAvatar}
                    />
                    <div style={{ flex: 1 }}>
                      <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Share your wins, find teammates, or just say hi..."
                        className={styles.composerTextarea}
                      />
                      <div className={styles.composerActions}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                           <span style={{ fontSize: '1.2rem', opacity: 0.5 }}>📷 🏆 📍</span>
                        </div>
                        <button 
                          type="submit" 
                          className="btn-primary"
                          style={{ padding: '8px 24px', fontSize: '0.9rem' }}
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Posts Feed */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading posts...</div>
            ) : (
              <div className={styles.feed}>
                {posts.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No posts yet. Be the first!</div>}
                
                {posts.map(post => (
                  <div key={post.id} className={`glass-panel ${styles.post}`}>
                    
                    {/* Post Header with LINK */}
                    <div className={styles.postHeader}>
                      <Link href={`/profile?id=${post.authorId}`}>
                          <img 
                            src={post.authorAvatar} 
                            alt={post.authorName}
                            className={styles.postAuthorAvatar}
                          />
                      </Link>
                      <div style={{ flex: 1 }}>
                        <Link href={`/profile?id=${post.authorId}`} style={{ textDecoration: 'none' }}>
                            <div className={styles.postAuthorName}>{post.authorName}</div>
                        </Link>
                        <div className={styles.postTime}>{getTimeAgo(post.timestamp)}</div>
                      </div>
                      {post.type && post.type !== 'General' && (
                        <span className={styles.postTag}>
                          {post.type}
                        </span>
                      )}
                    </div>

                    {/* Post Content */}
                    <p className={styles.postContent}>
                      {post.content}
                    </p>

                    {/* Post Actions */}
                    <div className={styles.postActions}>
                      <button 
                        onClick={() => handleLike(post.id)}
                        className={`${styles.likeButton} ${post.likedBy?.includes(user?.id) ? styles.likeButtonActive : ''}`}
                      >
                        {post.likedBy?.includes(user?.id) ? '❤️' : '🤍'} {post.likes}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Sidebar */}
          <div className={styles.sidebar}>
            {/* Global Leaderboard */}
            <div className={`glass-panel ${styles.sidebarCard}`}>
              <h3 className={styles.sidebarTitle}>
                🏆 Top Athletes
              </h3>
              <div className={styles.leaderboardList}>
                {leaderboard.map((athlete, index) => (
                  <div key={athlete.name} className={styles.leaderboardItem} style={{ 
                    background: index === 0 ? 'rgba(255,215,0,0.05)' : 'transparent'
                  }}>
                    <div className={styles.rankBadge} style={{ 
                      background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(255,255,255,0.1)',
                      color: index < 3 ? '#000' : '#fff'
                    }}>
                      {index + 1}
                    </div>
                    <img 
                      src={athlete.avatar || `https://ui-avatars.com/api/?name=${athlete.name}&background=random`}
                      alt={athlete.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{athlete.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{athlete.wins} wins</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Teams */}
            <div className={`glass-panel ${styles.sidebarCard}`}>
              <h3 className={styles.sidebarTitle}>🔥 Trending Teams</h3>
              <ul className={styles.trendingList}>
                {trendingTeams.map(team => (
                  <li key={team.id} className={styles.trendingItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img 
                        src={team.logo || `https://ui-avatars.com/api/?name=${team.name}&background=random`}
                        alt={team.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{team.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.sport}</div>
                      </div>
                    </div>
                    <button style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      border: 'none', 
                      color: 'white', 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      cursor: 'pointer', 
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}
                    onClick={() => router.push(`/teams/${team.id}`)}
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Stats */}
            <div className={`glass-panel ${styles.sidebarCard}`}>
              <h3 className={styles.sidebarTitle}>📊 Community Stats</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statRow}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Teams</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{teams.length}</span>
                </div>
                <div className={styles.statRow}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Posts</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{posts.length}</span>
                </div>
                <div className={styles.statRow}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Athletes</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{leaderboard.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
