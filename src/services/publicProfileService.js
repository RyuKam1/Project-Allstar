import { supabase } from "@/lib/supabaseClient";

export async function getPublicProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles_public")
    .select("id, name, avatar, sport, role, bio, created_at")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function getPublicProfilesMap(userIds = []) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles_public")
    .select("id, name, avatar, sport, role, bio, created_at")
    .in("id", ids);

  if (error) throw new Error(error.message);
  return new Map((data || []).map((profile) => [profile.id, profile]));
}

