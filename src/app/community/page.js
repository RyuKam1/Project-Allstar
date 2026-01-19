"use client";
import React, { useState, useEffect, useRef } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { communityService } from "@/services/communityService";
import { teamService } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useAutoAnimate } from '@formkit/auto-animate/react';
import Link from 'next/link';
import styles from './community.module.css';

// --- Sub-component: Comment Section ---
function CommentSection({ postId, currentUserId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parent] = useAutoAnimate();

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await communityService.getComments(postId);
        setComments(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();

    // Subscribe to NEW comments for this post
    const channel = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_comments', filter: `post_id=eq.${postId}` },
        async (payload) => {
          // Fetch the full comment with author info
          const { data: fullComment, error } = await supabase
            .from('community_comments')
            .select('*, author:profiles(name, avatar)')
            .eq('id', payload.new.id)
            .single();

          if (fullComment && !error) {
            setComments(prev => [...prev, {
              id: fullComment.id,
              content: fullComment.content,
              timestamp: fullComment.created_at,
              authorId: fullComment.user_id,
              authorName: fullComment.author?.name,
              authorAvatar: fullComment.author?.avatar
            }]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await communityService.createComment(postId, currentUserId, newComment);
      setNewComment('');
    } catch (e) {
      alert("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.commentSection}>
      <div className={styles.commentList} ref={parent}>
        {loading ? (
          <div className={styles.commentLoading}>Loading comments...</div>
        ) : comments.map(c => (
          <div key={c.id} className={styles.commentItem}>
            <img src={c.authorAvatar || `https://ui-avatars.com/api/?name=${c.authorName}`} className={styles.commentAvatar} alt="" />
            <div className={styles.commentBody}>
              <div className={styles.commentHeader}>
                <span className={styles.commentAuthor}>{c.authorName}</span>
                <span className={styles.commentTime}>{new Date(c.timestamp).toLocaleDateString()}</span>
              </div>
              <p className={styles.commentText}>{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {currentUserId && (
        <form onSubmit={handleSubmit} className={styles.commentForm}>
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className={styles.commentInput}
          />
          <button type="submit" className={styles.commentSubmit} disabled={isSubmitting}>
            {isSubmitting ? '...' : '→'}
          </button>
        </form>
      )}
    </div>
  );
}

// --- Main Page Component ---
export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef(null);

  const [feedParent] = useAutoAnimate();

  // Active expanded comments
  const [expandedComments, setExpandedComments] = useState({});

  useEffect(() => {
    loadData();

    // REALTIME: New Posts
    const channel = supabase
      .channel('public:community_posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' },
        async (payload) => {
          const { data: newPostData, error } = await supabase
            .from('community_posts')
            .select(`*, author:profiles(name, avatar), likes:post_likes(user_id), comment_count:community_comments(count)`)
            .eq('id', payload.new.id)
            .single();

          if (newPostData && !error) {
            const formatted = {
              id: newPostData.id,
              content: newPostData.content,
              type: newPostData.type,
              image_url: newPostData.image_url,
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

    return () => { supabase.removeChannel(channel); };
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user) { alert("Please login to post"); return; }
    if (!postContent.trim() && !selectedImage) return;

    setIsPosting(true);
    try {
      await communityService.createPost(
        user.id,
        postContent,
        'General',
        selectedImage
      );
      setPostContent('');
      setSelectedImage(null);
      setImagePreview(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId) => {
    if (!user) { alert("Please login to like posts"); return; }

    // --- OPTIMISTIC UPDATE ---
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    const post = posts[postIndex];
    const isLiked = post.likedBy?.includes(user.id);

    const newLikedBy = isLiked
      ? post.likedBy.filter(id => id !== user.id)
      : [...(post.likedBy || []), user.id];

    const newPosts = [...posts];
    newPosts[postIndex] = {
      ...post,
      likedBy: newLikedBy,
      likes: post.likes + (isLiked ? -1 : 1)
    };
    setPosts(newPosts);

    // --- DB SYNC ---
    try {
      await communityService.toggleLike(postId, user.id);
    } catch (e) {
      // Revert on failure
      setPosts(posts);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getLeaderboard = () => {
    const userStats = {};
    teams.forEach(team => {
      if (team.wins && Array.isArray(team.wins)) {
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
        <div className={styles.header}>
          <h1>The <span className="primary-gradient-text">Huddle</span></h1>
          <p>Connect with athletes, share victories, and find your next teammate.</p>
        </div>

        <div className={styles.tabs}>
          {[{ name: 'All', icon: '🌟' }, { name: 'Teams', icon: '👥' }, { name: 'Events', icon: '🎪' }].map(tab => (
            <button key={tab.name} onClick={() => setActiveTab(tab.name)} className={`${styles.tab} ${activeTab === tab.name ? styles.tabActive : ''}`}>
              <span style={{ marginRight: '8px' }}>{tab.icon}</span>{tab.name}
            </button>
          ))}
        </div>

        <div className={styles.communityLayout}>
          <div ref={feedParent}>
            {user && (
              <div className={`glass-panel ${styles.postComposer}`}>
                <form onSubmit={handleCreatePost}>
                  <div className={styles.composerContent}>
                    <img src={user.avatar} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} className={styles.composerAvatar} alt="" />
                    <div style={{ flex: 1 }}>
                      <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Share your wins, find teammates..."
                        className={styles.composerTextarea}
                      />

                      {imagePreview && (
                        <div className={styles.imagePreviewContainer}>
                          <img src={imagePreview} className={styles.imagePreview} alt="Preview" />
                          <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className={styles.removeImage}>✕</button>
                        </div>
                      )}

                      <div className={styles.composerActions}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button type="button" onClick={() => fileInputRef.current?.click()} className={styles.iconAction}>📷</button>
                          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" style={{ display: 'none' }} />
                          <span className={styles.iconAction} style={{ opacity: 0.5 }}>🏆 📍</span>
                        </div>
                        <button type="submit" className="btn-primary" style={{ padding: '8px 24px', fontSize: '0.9rem' }} disabled={isPosting}>
                          {isPosting ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading posts...</div>
            ) : (
              <div className={styles.feed} ref={feedParent}>
                {posts.map(post => (
                  <div key={post.id} className={`glass-panel ${styles.post}`}>
                    <div className={styles.postHeader}>
                      <Link href={`/profile?id=${post.authorId}`}><img src={post.authorAvatar} className={styles.postAuthorAvatar} alt="" /></Link>
                      <div style={{ flex: 1 }}>
                        <Link href={`/profile?id=${post.authorId}`} style={{ textDecoration: 'none' }}><div className={styles.postAuthorName}>{post.authorName}</div></Link>
                        <div className={styles.postTime}>{getTimeAgo(post.timestamp)}</div>
                      </div>
                    </div>

                    <p className={styles.postContent}>{post.content}</p>

                    {post.image_url && (
                      <div className={styles.postImageContainer}>
                        <img src={post.image_url} className={styles.postImage} alt="Post content" />
                      </div>
                    )}

                    <div className={styles.postActions}>
                      <button onClick={() => handleLike(post.id)} className={`${styles.likeButton} ${post.likedBy?.includes(user?.id) ? styles.likeButtonActive : ''}`}>
                        {post.likedBy?.includes(user?.id) ? '❤️' : '🤍'} {post.likes}
                      </button>
                      <button onClick={() => toggleComments(post.id)} className={styles.actionButton}>
                        💬 {post.comments} Comments
                      </button>
                    </div>

                    {expandedComments[post.id] && (
                      <CommentSection postId={post.id} currentUserId={user?.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.sidebar}>
            {/* ... Sidebar content remains same ... */}
            <div className={`glass-panel ${styles.sidebarCard}`}>
              <h3 className={styles.sidebarTitle}>🏆 Top Athletes</h3>
              <div className={styles.leaderboardList}>
                {leaderboard.map((athlete, index) => (
                  <div key={athlete.name} className={styles.leaderboardItem}>
                    <div className={styles.rankBadge}>{index + 1}</div>
                    <img src={athlete.avatar || `https://ui-avatars.com/api/?name=${athlete.name}`} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{athlete.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{athlete.wins} wins</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
