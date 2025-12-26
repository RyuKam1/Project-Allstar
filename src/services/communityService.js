const STORAGE_KEY = 'allstar_community_posts';

// Seed Posts
const seedPosts = [
    {
        id: 'post_1',
        authorId: 'Sarah_J',
        authorName: 'Sarah Jenkins',
        authorAvatar: `https://ui-avatars.com/api/?name=Sarah+Jenkins&background=random`,
        content: "Just finished a killer session at the Thunderdome! The new court layout feels amazing. Who's ready for next Tuesday? 🏀",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        likes: 12,
        comments: 3,
        type: 'General',
        likedBy: []
    },
    {
        id: 'post_2',
        authorId: 'Mike_R',
        authorName: 'Mike Ross',
        authorAvatar: `https://ui-avatars.com/api/?name=Mike+Ross&background=random`,
        content: "New PR today! 315lb Bench Press. Grind never stops. 💪 #FitnessGoals",
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        likes: 24,
        comments: 5,
        type: 'Brag',
        likedBy: []
    }
];

export const communityService = {
  getAllPosts: async () => {
    if (typeof window === 'undefined') return seedPosts;
    
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seedPosts));
        stored = JSON.stringify(seedPosts);
    }
    return JSON.parse(stored).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  createPost: async (userId, userName, userAvatar, content, type = 'General') => {
    const posts = await communityService.getAllPosts();
    const newPost = {
        id: 'post_' + Date.now(),
        authorId: userId,
        authorName: userName,
        authorAvatar: userAvatar,
        content,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0,
        type,
        likedBy: []
    };
    posts.unshift(newPost);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    return newPost;
  },

  toggleLike: async (postId, userId) => {
    const posts = await communityService.getAllPosts();
    const index = posts.findIndex(p => p.id === postId);
    if (index !== -1) {
        const post = posts[index];
        if (!post.likedBy) post.likedBy = [];
        
        const likedIndex = post.likedBy.indexOf(userId);
        if (likedIndex === -1) {
            post.likedBy.push(userId);
            post.likes += 1;
        } else {
            post.likedBy.splice(likedIndex, 1);
            post.likes -= 1;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        return post;
    }
    return null;
  }
};
