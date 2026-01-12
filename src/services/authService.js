import { supabase } from "@/lib/supabaseClient";

export const authService = {
  // Login with Supabase
  login: async (email, password) => {
    if (!email || !password) throw new Error("Email and password are required");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);

    // Fetch full profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
        // Fallback if profile doesn't exist yet (rare race condition or migration issue)
        return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || 'User'
        };
    }

    return profile;
  },

  // Register with Supabase
  register: async (name, email, password) => {
    if (!name || !email || !password) throw new Error("All fields are required");

    // 1. Sign Up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }, // Metadata for initial auth user
      },
    });

    if (error) return { success: false, error: error.message };

    // 2. Create Profile (Trigger usually handles this, but we'll do manual for safety/completeness)
    // Note: If you set up a Postgres Trigger to auto-create profiles, this might fail with duplicate key,
    // which is fine, we just ignore it.
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

    if (!existingProfile) {
        const newProfile = {
            id: data.user.id,
            email: email,
            name: name,
            bio: 'Ready to play!',
            sport: 'Any',
            avatar: `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff`,
        };

        const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile);

        if (insertError) {
             console.error("Error creating profile:", insertError);
             // Verify if it was just created by trigger
        }
    }

    return { success: true, user: data.user };
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    return true;
  },

  // Get Current User (Session)
  getCurrentUser: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Get fresh profile data
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
    return profile || session.user;
  },

  // Update Profile
  updateProfile: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Get All Users (Public Directory)
  getAllUsers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
};
