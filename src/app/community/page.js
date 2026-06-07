"use client";
import React, { useState, useEffect, useRef } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { communityService } from "@/services/communityService";
import { teamService } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import { supabase } from "@/lib/supabaseClient";
import { useAutoAnimate } from '@formkit/auto-animate/react';
import Link from 'next/link';
import Icon from '@/components/UI/Icon';
import {
  SkeletonCommunityFeed,
  SkeletonCommunitySidebar,
  SkeletonCommentList,
  EmptyState,
  Button,
} from '@/components/UI/primitives';
import { Stagger } from '@/components/UI/motion';
import styles from './community.module.css';

// --- Sub-component: Comment Section ---
function CommentSection({ postId, currentUserId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parent] = useAutoAnimate();
  const { notify } = useNotificationCenter();

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
          // Fetch the full comment and then resolve author via public profile view.
          const { data: fullComment, error } = await supabase
            .from('community_comments')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (fullComment && !error) {
            const { data: author } = await supabase
              .from('profiles_public')
              .select('name, avatar')
              .eq('id', fullComment.user_id)
              .maybeSingle();
            setComments(prev => [...prev, {
              id: fullComment.id,
              content: fullComment.content,
              timestamp: fullComment.created_at,
              authorId: fullComment.user_id,
              authorName: author?.name || 'Unknown',
              authorAvatar: author?.avatar
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
      notify("Failed to post comment", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.commentSection}>
      <div className={styles.commentList} ref={parent}>
        {loading ? (
          <SkeletonCommentList rows={3} />
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
  const { notify } = useNotificationCenter();
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
            .select(`*, likes:post_likes(user_id), comment_count:community_comments(count)`)
            .eq('id', payload.new.id)
            .single();

          if (newPostData && !error) {
            const { data: author } = await supabase
              .from('profiles_public')
              .select('name, avatar')
              .eq('id', newPostData.user_id)
              .maybeSingle();
            const formatted = {
              id: newPostData.id,
              content: newPostData.content,
              type: newPostData.type,
              image_url: newPostData.image_url,
              authorId: newPostData.user_id,
              authorName: author?.name || 'Unknown',
              authorAvatar: author?.avatar,
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
    if (!user) { notify("Please login to post", "warning"); return; }
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
      notify(err.message, "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId) => {
    if (!user) { notify("Please login to like posts", "warning"); return; }

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

  const filteredPosts = posts.filter((post) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Teams') return /team/i.test(post.type || '');
    if (activeTab === 'Events') return /event/i.test(post.type || '');
    return true;
  });

  const emptyTabCopy = {
    All: {
      title: 'No posts yet',
      description: 'Be the first to share a win, ask for teammates, or post about an upcoming game.',
    },
    Teams: {
      title: 'No team posts',
      description: 'Posts tagged for teams will show up here once athletes start sharing.',
    },
    Events: {
      title: 'No event posts',
      description: 'Event-related posts from the community will appear in this feed.',
    },
  };

  return (
    <main className={styles.pageMain}>
      <Navbar />

      <div className={`container ${styles.pageContainer}`}>
        <div className={styles.header}>
          <h1>The <span className="primary-gradient-text">Huddle</span></h1>
          <p>Connect with athletes, share victories, and find your next teammate.</p>
        </div>

        <div className={styles.tabs}>
          {[{ name: 'All', icon: 'star' }, { name: 'Teams', icon: 'users' }, { name: 'Events', icon: 'calendar' }].map(tab => (
            <button key={tab.name} onClick={() => setActiveTab(tab.name)} className={`${styles.tab} ${activeTab === tab.name ? styles.tabActive : ''}`}>
              <Icon name={tab.icon} size={16} className="icon-inline" aria-hidden="true" />
              {tab.name}
            </button>
          ))}
        </div>

        <div className={styles.contextBar}>
          <p className={styles.contextMeta}>
            Showing <strong>{filteredPosts.length}</strong> {filteredPosts.length === 1 ? 'post' : 'posts'}
            {activeTab !== 'All' ? ` in ${activeTab}` : ''}
          </p>
        </div>

        <div className={styles.communityLayout}>
          <div>
            {user && (
              <div className={`glass-panel ${styles.postComposer}`}>
                <form onSubmit={handleCreatePost}>
                  <div className={styles.composerContent}>
                    <img src={user.avatar} className={styles.composerAvatar} alt="" />
                    <div className={styles.composerBody}>
                      <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Share your wins, find teammates..."
                        className={styles.composerTextarea}
                      />

                      {imagePreview && (
                        <div className={styles.imagePreviewContainer}>
                          <img src={imagePreview} className={styles.imagePreview} alt="Preview" />
                          <button type="button" onClick={() => { setSelectedImage(null); setImagePreview(null); }} className={styles.removeImage} aria-label="Remove image">
                            <Icon name="x" size={14} />
                          </button>
                        </div>
                      )}

                      <div className={styles.composerActions}>
                        <div className={styles.composerTools}>
                          <button type="button" onClick={() => fileInputRef.current?.click()} className={styles.iconAction} aria-label="Add photo">
                            <Icon name="image" size={18} />
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" hidden />
                          <span className={`${styles.iconAction} ${styles.iconActionDisabled}`} aria-hidden="true" title="Coming soon">
                            <Icon name="trophy" size={18} />
                          </span>
                          <span className={`${styles.iconAction} ${styles.iconActionDisabled}`} aria-hidden="true" title="Coming soon">
                            <Icon name="location" size={18} />
                          </span>
                        </div>
                        <Button type="submit" size="small" loading={isPosting} disabled={isPosting || (!postContent.trim() && !selectedImage)}>
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <SkeletonCommunityFeed count={3} />
            ) : filteredPosts.length === 0 ? (
              <EmptyState
                icon={activeTab === 'Teams' ? 'users' : activeTab === 'Events' ? 'calendar' : 'message'}
                title={emptyTabCopy[activeTab].title}
                description={emptyTabCopy[activeTab].description}
                actionLabel={!user ? 'Sign in to post' : undefined}
                actionHref={!user ? '/login' : undefined}
              />
            ) : (
              <Stagger className={styles.feed} ref={feedParent}>
                {filteredPosts.map(post => (
                  <div key={post.id} className={`glass-panel ticket-card ${styles.post}`}>
                    <div className={styles.postHeader}>
                      <Link href={`/players/${post.authorId}`}>
                        <img src={post.authorAvatar} className={styles.postAuthorAvatar} alt="" />
                      </Link>
                      <div className={styles.postAuthorMeta}>
                        <Link href={`/players/${post.authorId}`} className={styles.postAuthorLink}>
                          <div className={styles.postAuthorName}>{post.authorName}</div>
                        </Link>
                        <div className={styles.postTime}>{getTimeAgo(post.timestamp)}</div>
                      </div>
                      {post.type && post.type !== 'General' && (
                        <span className={styles.postTag}>{post.type}</span>
                      )}
                    </div>

                    <p className={styles.postContent}>{post.content}</p>

                    {post.image_url && (
                      <div className={styles.postImageContainer}>
                        <img src={post.image_url} className={styles.postImage} alt="Post content" />
                      </div>
                    )}

                    <div className={styles.postActions}>
                      <button onClick={() => handleLike(post.id)} className={`${styles.likeButton} ${post.likedBy?.includes(user?.id) ? styles.likeButtonActive : ''}`} aria-pressed={post.likedBy?.includes(user?.id)}>
                        <Icon name={post.likedBy?.includes(user?.id) ? 'heart' : 'heartOutline'} size={16} className="icon-inline" /> {post.likes}
                      </button>
                      <button onClick={() => toggleComments(post.id)} className={styles.actionButton}>
                        <Icon name="message" size={16} className="icon-inline" /> {post.comments} Comments
                      </button>
                    </div>

                    {expandedComments[post.id] && (
                      <CommentSection postId={post.id} currentUserId={user?.id} />
                    )}
                  </div>
                ))}
              </Stagger>
            )}
          </div>

          <div className={styles.sidebar}>
            {loading ? (
              <SkeletonCommunitySidebar />
            ) : (
            <>
            <div className={`glass-panel ${styles.sidebarCard}`}>
              <h3 className={styles.sidebarTitle}>
                <Icon name="medal" size={18} className="icon-inline" /> Top Athletes
              </h3>
              <div className={styles.leaderboardList}>
                {leaderboard.map((athlete, index) => (
                  <div key={athlete.name} className={styles.leaderboardItem}>
                    <div className={styles.rankBadge}>{index + 1}</div>
                    <img src={athlete.avatar || `https://ui-avatars.com/api/?name=${athlete.name}`} className={styles.leaderboardAvatar} alt="" />
                    <div style={{ flex: 1 }}>
                      <div className={styles.leaderboardName}>{athlete.name}</div>
                      <div className={styles.leaderboardWins}>{athlete.wins} wins</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
