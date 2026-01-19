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
  register: async (name, email, password, accountType = 'player') => {
    if (!name || !email || !password) throw new Error("All fields are required");

    // 1. Sign Up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          account_type: accountType // Important: This metadata is read by the Trigger!
        },
      },
    });

    if (error) return { success: false, error: error.message };

    // 2. Profile Creation is now handled by Postgres Trigger (supabase_triggers.sql)
    // We wait a brief moment for the trigger to fire before returning, just in case user logs in immediately.
    await new Promise(r => setTimeout(r, 1000));

    return { success: true, user: data.user };
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    return true;
  },

  // Get Current User (Session)
  getCurrentUser: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;

    // Get fresh profile data
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    // Fallback: If profile missing (Trigger delay?), return session info
    if (profileError || !profile) {
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || 'User',
        avatar: `https://ui-avatars.com/api/?name=${session.user.user_metadata?.name || 'User'}&background=random`,
        sport: 'Any'
      };
    }

    return profile;
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
  },

  // Get User Public Profile by ID
  getUserProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  }
};
