"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { communityService } from "@/services/communityService";
import { teamService } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [fetchedPosts, fetchedTeams] = await Promise.all([
      communityService.getAllPosts(),
      teamService.getAllTeams()
    ]);
    setPosts(fetchedPosts);
    setTeams(fetchedTeams);
    setLoading(false);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to post");
      return;
    }
    if (!postContent.trim()) return;

    await communityService.createPost(
      user.id,
      user.name,
      user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`,
      postContent
    );
    setPostContent('');
    loadData();
  };

  const handleLike = async (postId) => {
    if (!user) {
      alert("Please login to like posts");
      return;
    }
    await communityService.toggleLike(postId, user.id);
    loadData();
  };

  const getTimeAgo = (timestamp) => {
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
      if (team.wins) {
        team.members.forEach(member => {
          if (!member.isGuest) {
            if (!userStats[member.id]) {
              userStats[member.id] = { name: member.name, wins: 0, avatar: member.avatar };
            }
            userStats[member.id].wins += team.wins.length;
          }
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
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            The <span className="primary-gradient-text">Huddle</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Connect with athletes, share victories, and find your next teammate.
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
          {['All', 'Teams', 'Events'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                border: 'none',
                color: activeTab === tab ? 'white' : 'var(--text-muted)',
                padding: '8px 20px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Main Feed */}
          <div>
            {/* Post Composer */}
            {user && (
              <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <form onSubmit={handleCreatePost}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <img 
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                      alt={user.name}
                      style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Share your wins, find teammates, or just say hi..."
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '12px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '12px',
                          color: 'white',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          fontSize: '0.95rem'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>📷</button>
                          <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>🏆</button>
                          <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>📍</button>
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
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {posts.map(post => (
                  <div key={post.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                    {/* Post Header */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <img 
                        src={post.authorAvatar} 
                        alt={post.authorName}
                        style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{post.authorName}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{getTimeAgo(post.timestamp)}</div>
                      </div>
                      {post.type && (
                        <span style={{ 
                          background: 'rgba(255,255,255,0.1)', 
                          padding: '4px 12px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem',
                          color: 'var(--color-accent)'
                        }}>
                          {post.type}
                        </span>
                      )}
                    </div>

                    {/* Post Content */}
                    <p style={{ lineHeight: '1.6', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                      {post.content}
                    </p>

                    {/* Post Actions */}
                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                      <button 
                        onClick={() => handleLike(post.id)}
                        style={{ 
                          background: post.likedBy?.includes(user?.id) ? 'rgba(255,100,100,0.2)' : 'transparent', 
                          border: '1px solid var(--border-glass)', 
                          color: post.likedBy?.includes(user?.id) ? '#ff6b6b' : 'white', 
                          padding: '8px 16px', 
                          borderRadius: '20px', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {post.likedBy?.includes(user?.id) ? '❤️' : '🤍'} {post.likes}
                      </button>
                      <button style={{ 
                        background: 'transparent', 
                        border: '1px solid var(--border-glass)', 
                        color: 'white', 
                        padding: '8px 16px', 
                        borderRadius: '20px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        💬 {post.comments || 0}
                      </button>
                      <button style={{ 
                        background: 'transparent', 
                        border: '1px solid var(--border-glass)', 
                        color: 'white', 
                        padding: '8px 16px', 
                        borderRadius: '20px', 
                        cursor: 'pointer'
                      }}>
                        🔗 Share
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Global Leaderboard */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏆 Top Athletes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {leaderboard.map((athlete, index) => (
                  <div key={athlete.name} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    padding: '0.5rem',
                    background: index === 0 ? 'rgba(255,215,0,0.1)' : 'transparent',
                    borderRadius: '8px'
                  }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
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
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>🔥 Trending Teams</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {trendingTeams.map(team => (
                  <li key={team.id} style={{ 
                    padding: '12px 0', 
                    borderBottom: '1px solid var(--border-glass)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}>
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
                    }}>
                      View
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Stats */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>📊 Community Stats</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Teams</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{teams.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Posts</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{posts.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
