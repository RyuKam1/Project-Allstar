import { supabase } from "@/lib/supabaseClient";

export const communityService = {
  // Get all posts (Joined with profiles for author info)
  getAllPosts: async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!community_posts_user_id_fkey(name, avatar),
        likes:post_likes(user_id),
        comment_count:community_comments(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Format for frontend
    return data.map(post => ({
      id: post.id,
      content: post.content,
      type: post.type,
      image_url: post.image_url,
      authorId: post.user_id, // For linking to profile
      authorName: post.author?.name || 'Unknown',
      authorAvatar: post.author?.avatar || 'https://ui-avatars.com/api/?background=random',
      timestamp: post.created_at,
      likes: post.likes ? post.likes.length : 0,
      likedBy: post.likes ? post.likes.map(l => l.user_id) : [],
      comments: post.comment_count?.[0]?.count || 0
    }));
  },

  // Upload post image to storage
  uploadPostImage: async (file) => {
    if (!file) return null;
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('allstar-assets')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('allstar-assets')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (err) {
        console.error("Image upload failed:", err);
        return null;
    }
  },

  // Create new post
  createPost: async (userId, content, type = 'General', imageFile = null) => {
    let image_url = null;
    if (imageFile) {
        image_url = await communityService.uploadPostImage(imageFile);
    }

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        content,
        type,
        image_url
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // --- Comments ---
  getComments: async (postId) => {
    const { data, error } = await supabase
        .from('community_comments')
        .select(`
            *,
            author:profiles(name, avatar)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(c => ({
        id: c.id,
        content: c.content,
        timestamp: c.created_at,
        authorId: c.user_id,
        authorName: c.author?.name || 'Unknown',
        authorAvatar: c.author?.avatar
    }));
  },

  createComment: async (postId, userId, content) => {
    const { data, error } = await supabase
        .from('community_comments')
        .insert({
            post_id: postId,
            user_id: userId,
            content
        })
        .select(`
            *,
            author:profiles(name, avatar)
        `)
        .single();

    if (error) throw error;
    return {
        id: data.id,
        content: data.content,
        timestamp: data.created_at,
        authorId: data.user_id,
        authorName: data.author?.name || 'Unknown',
        authorAvatar: data.author?.avatar
    };
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
