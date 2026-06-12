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
  // accountType is 'player' | 'business'. Business signups do NOT receive the
  // business role here — that is granted only on verification. Instead we record
  // the intent and opt the user into business onboarding (status 'pending').
  register: async (name, email, password, accountType = 'player') => {
    if (!name || !email || !password) throw new Error("All fields are required");

    const isBusinessIntent = accountType === 'business';

    // 1. Sign Up. Role is always created as 'user' by the DB trigger; the
    // account_type metadata is informational only and never grants privileges.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          account_type: isBusinessIntent ? 'business' : 'user'
        },
      },
    });

    if (error) return { success: false, error: error.message };

    // 2. Profile Creation is handled by a Postgres Trigger. Wait briefly for it.
    await new Promise(r => setTimeout(r, 1000));

    // 3. If the user wants a business account and a session already exists
    // (email confirmation disabled), opt them into onboarding (none -> pending).
    // Otherwise the /business/onboarding page performs this opt-in after login.
    if (isBusinessIntent && data.session) {
      try {
        await supabase.rpc('request_business_account');
      } catch (e) {
        console.warn('Business onboarding opt-in deferred to onboarding page', e);
      }
    }

    return { success: true, user: data.user, businessIntent: isBusinessIntent };
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
      .select('id, name, avatar, sport, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  // Get User Public Profile by ID
  getUserProfile: async (userId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const isOwnProfile = user?.id === userId;
    const source = isOwnProfile ? 'profiles' : 'profiles_public';
    const fields = isOwnProfile
      ? 'id, name, avatar, sport, role, business_verification_status, created_at, bio, height, weight, speed, vertical'
      : 'id, name, avatar, sport, is_verified_business, created_at, bio';

    const { data, error } = await supabase
      .from(source)
      .select(fields)
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  }
};
