import { supabase } from "@/lib/supabaseClient";
import { sanitizeText } from "@/lib/security/inputSanitizer";
import { getPublicProfilesMap } from "./publicProfileService";
import {
  deleteLocationImageStorage,
  enrichCommunityPostRow,
  uploadCompressedCommunityImage,
} from "@/lib/storageImages";

export const communityService = {
  getAllPosts: async () => {
    const { data, error } = await supabase
      .from("community_posts")
      .select(`
        *,
        likes:post_likes(user_id),
        comment_count:community_comments(count)
      `)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    const profileMap = await getPublicProfilesMap((data || []).map((post) => post.user_id));

    return data.map((post) => {
      const enriched = enrichCommunityPostRow(post);
      return {
        id: enriched.id,
        content: enriched.content,
        type: enriched.type,
        image_url: enriched.image_url,
        authorId: enriched.user_id,
        authorName: profileMap.get(enriched.user_id)?.name || "Unknown",
        authorAvatar:
          profileMap.get(enriched.user_id)?.avatar ||
          "https://ui-avatars.com/api/?background=random",
        timestamp: enriched.created_at,
        likes: enriched.likes ? enriched.likes.length : 0,
        likedBy: enriched.likes ? enriched.likes.map((l) => l.user_id) : [],
        comments: enriched.comment_count?.[0]?.count || 0,
      };
    });
  },

  uploadPostImage: async (file) => {
    if (!file) return null;
    try {
      const uploaded = await uploadCompressedCommunityImage(file, { prefix: "p" });
      return uploaded;
    } catch (err) {
      console.error("Image upload failed:", err);
      return null;
    }
  },

  createPost: async (userId, content, type = "General", imageFile = null) => {
    const safeContent = sanitizeText(content, 2000);
    if (!safeContent && !imageFile) {
      throw new Error("Post content cannot be empty");
    }

    let imagePayload = {
      image_url: null,
      image_object_key: null,
      image_storage_bucket: null,
      image_mime_type: null,
      image_byte_size: null,
    };

    if (imageFile) {
      const uploaded = await communityService.uploadPostImage(imageFile);
      if (!uploaded) {
        throw new Error("Failed to upload post image");
      }
      imagePayload = {
        image_url: null,
        image_object_key: uploaded.objectKey,
        image_storage_bucket: uploaded.bucket,
        image_mime_type: uploaded.mimeType,
        image_byte_size: uploaded.byteSize,
      };
    }

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: userId,
        content: safeContent || "",
        type,
        ...imagePayload,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return enrichCommunityPostRow(data);
  },

  getComments: async (postId) => {
    const { data, error } = await supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    const profileMap = await getPublicProfilesMap((data || []).map((comment) => comment.user_id));
    return data.map((c) => ({
      id: c.id,
      content: c.content,
      timestamp: c.created_at,
      authorId: c.user_id,
      authorName: profileMap.get(c.user_id)?.name || "Unknown",
      authorAvatar: profileMap.get(c.user_id)?.avatar,
    }));
  },

  createComment: async (postId, userId, content) => {
    const safeContent = sanitizeText(content, 1200);
    if (!safeContent) throw new Error("Comment cannot be empty");

    const { data, error } = await supabase
      .from("community_comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content: safeContent,
      })
      .select("*")
      .single();

    if (error) throw error;
    const profileMap = await getPublicProfilesMap([data.user_id]);
    const profile = profileMap.get(data.user_id);
    return {
      id: data.id,
      content: data.content,
      timestamp: data.created_at,
      authorId: data.user_id,
      authorName: profile?.name || "Unknown",
      authorAvatar: profile?.avatar,
    };
  },

  toggleLike: async (postId, userId) => {
    const { data: existing } = await supabase
      .from("post_likes")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    }

    return true;
  },

  deletePostImageStorage: async (postRow) => {
    if (!postRow) return;
    await deleteLocationImageStorage({
      object_key: postRow.image_object_key,
      storage_bucket: postRow.image_storage_bucket,
      image_url: postRow.image_url,
    });
  },
};
