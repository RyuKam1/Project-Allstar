import { supabase } from "@/lib/supabaseClient";

export const communityService = {
  // Get all posts (Joined with profiles for author info)
  getAllPosts: async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!community_posts_user_id_fkey(name, avatar),
        likes:post_likes(user_id)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Format for frontend
    return data.map(post => ({
      id: post.id,
      content: post.content,
      type: post.type,
      authorId: post.user_id, // For linking to profile
      authorName: post.author?.name || 'Unknown',
      authorAvatar: post.author?.avatar || 'https://ui-avatars.com/api/?background=random',
      timestamp: post.created_at,
      likes: post.likes ? post.likes.length : 0,
      likedBy: post.likes ? post.likes.map(l => l.user_id) : [],
      comments: 0 // Not implemented in DB yet
    }));
  },

  // Create new post
  createPost: async (userId, userName, userAvatar, content, type = 'General') => {
    // Note: userName/Avatar ignored, we rely on Relation to Profile for truth
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId, // RLS checks this matches auth.uid()
        content,
        type
      })
      .select()
      .single();

    if (error) {
        // Check if it's our custom rate limit error
        if (error.message.includes('posting too fast')) {
            throw new Error(error.message);
        }
        throw new Error(error.message);
    }
    return data;
  },

  // Toggle Like
  toggleLike: async (postId, userId) => {
    // Check if liked already
    const { data: existing } = await supabase
        .from('post_likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

    if (existing) {
        // Unlike
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    } else {
        // Like
        await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    }
    
    return true;
  }
};
