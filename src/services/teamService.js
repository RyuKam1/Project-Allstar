import { supabase } from "@/lib/supabaseClient";

let getAllTeamsInFlight = null;
let getAllTeamsCache = null;
let getAllTeamsCacheAt = 0;
const TEAM_LIST_CACHE_TTL_MS = 15000;

export const teamService = {
  // Get all teams with their members and owner profile
  getAllTeams: async () => {
    if (getAllTeamsCache && (Date.now() - getAllTeamsCacheAt) < TEAM_LIST_CACHE_TTL_MS) {
      return getAllTeamsCache;
    }
    if (getAllTeamsInFlight) return getAllTeamsInFlight;
    getAllTeamsInFlight = (async () => {
    // Fetch teams
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*');

    if (error) {
        console.error("Error fetching teams:", error);
        return [];
    }
    const teamIds = (teams || []).map((t) => t.id);
    if (teamIds.length === 0) return [];

    const [membersRes, requestsRes, winsRes] = await Promise.all([
      supabase
        .from('team_members')
        .select(`
          *,
          profile:user_id ( id, name, avatar )
        `)
        .in('team_id', teamIds),
      supabase
        .from('team_requests')
        .select(`
          *,
          profile:user_id ( id, name, avatar )
        `)
        .in('team_id', teamIds),
      supabase
        .from('team_wins')
        .select('*')
        .in('team_id', teamIds)
    ]);

    const membersByTeam = {};
    const requestsByTeam = {};
    const winsByTeam = {};

    (membersRes.data || []).forEach((m) => {
      if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
      membersByTeam[m.team_id].push(m);
    });
    (requestsRes.data || []).forEach((r) => {
      if (!requestsByTeam[r.team_id]) requestsByTeam[r.team_id] = [];
      requestsByTeam[r.team_id].push(r);
    });
    (winsRes.data || []).forEach((w) => {
      if (!winsByTeam[w.team_id]) winsByTeam[w.team_id] = [];
      winsByTeam[w.team_id].push(w);
    });

    const teamsWithData = teams.map((team) => {
      const members = membersByTeam[team.id] || [];
      const requests = requestsByTeam[team.id] || [];
      const wins = winsByTeam[team.id] || [];
      return {
        ...team,
        ownerId: team.owner_id,
        members: members.map(m => ({
          id: m.user_id,
          name: m.profile?.name || m.user_id,
          avatar: m.profile?.avatar,
          role: m.role,
          position: m.position
        })),
        requests: requests.map(r => ({
          id: r.user_id,
          name: r.profile?.name,
          avatar: r.profile?.avatar,
          requestedAt: r.requested_at
        })),
        wins
      };
    });

    return teamsWithData;
    })();

    try {
      const data = await getAllTeamsInFlight;
      getAllTeamsCache = data;
      getAllTeamsCacheAt = Date.now();
      return data;
    } finally {
      getAllTeamsInFlight = null;
    }
  },

  // Create a new team
  createTeam: async (teamData, owner) => {
    // 1. Upload Logo if it's a base64 string (from FileReader)
    let logoUrl = teamData.logo;
    if (teamData.logo && teamData.logo.startsWith('data:image')) {
        logoUrl = await uploadImage(teamData.logo, 'team-logos');
    }

    // 2. Insert Team
    const { data: newTeam, error } = await supabase
        .from('teams')
        .insert({
            name: teamData.name,
            sport: teamData.sport,
            description: teamData.description,
            logo: logoUrl,
            owner_id: owner.id
        })
        .select()
        .single();
    
    if (error) throw new Error(error.message);

    // 3. Add Owner as Member
    await supabase.from('team_members').insert({
        team_id: newTeam.id,
        user_id: owner.id,
        role: 'Owner',
        position: 'Bench'
    });

    return newTeam; // Caller will likely reload list
  },

  // Helper: Join Team (Legacy/Direct)
  joinTeam: async (teamId, user) => {
    // Not used much anymore, but good for invites maybe
    return teamService.requestJoinTeam(teamId, user);
  },

  // Request to join
  requestJoinTeam: async (teamId, user) => {
    // Check if member
    const { data: isMember } = await supabase.from('team_members').select('id').eq('team_id', teamId).eq('user_id', user.id).single();
    if (isMember) throw new Error("Already a member");

    // Check if pending
    const { data: isPending } = await supabase.from('team_requests').select('id').eq('team_id', teamId).eq('user_id', user.id).single();
    if (isPending) throw new Error("Request already pending");

    const { error } = await supabase
        .from('team_requests')
        .insert({
            team_id: teamId,
            user_id: user.id,
            status: 'pending'
        });

    if (error) throw new Error(error.message);
    return true;
  },

  // Accept Request
  acceptJoinRequest: async (teamId, userId, targetPosition = 'Bench') => {
    // Transaction-like: Delete request, insert member
    const { error: delError } = await supabase
        .from('team_requests')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);
    
    if (delError) throw new Error(delError.message);

    const { error: insError } = await supabase
        .from('team_members')
        .insert({
            team_id: teamId,
            user_id: userId,
            position: targetPosition,
            role: 'Member'
        });
        
    if (insError) throw new Error(insError.message);
    return true;
  },

  // Reject Request
  rejectJoinRequest: async (teamId, userId) => {
    const { error } = await supabase
        .from('team_requests')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);
    
    if (error) throw new Error(error.message);
    return true;
  },

  // Update Member Position
  updateMemberPosition: async (teamId, memberId, newPosition) => {
    // If moving to a field slot, vacate whoever is there
    if (newPosition !== 'Bench') {
       // Find occupant
       const { data: occupant } = await supabase
           .from('team_members')
           .select('id, user_id')
           .eq('team_id', teamId)
           .eq('position', newPosition)
           .single();
       
       if (occupant && occupant.user_id !== memberId) {
           // Move them to bench
           await supabase
               .from('team_members')
               .update({ position: 'Bench' })
               .eq('id', occupant.id);
       }
    }

    const { error } = await supabase
        .from('team_members')
        .update({ position: newPosition })
        .eq('team_id', teamId)
        .eq('user_id', memberId);

     if (error) throw new Error(error.message);
  },

  addGuestMember: async (teamId, guestName) => {
    // We don't have "Guest" users in DB profiles usually. 
    // We'll insert a specialized row in team_members with a NULL user_id?
    // SQL schema defined user_id as NOT NULL references profiles. 
    // Plan B: Create a "Guest" profile on the fly? Or specific guest table?
    // For now, let's create a placeholder profile in the DB for guests? No, that messes up auth.
    // Let's assume for this Refactor: Guests are NOT supported fully unless we change schema.
    // Workaround: We will skip database for guests or warn.
    alert("Guest System pending schema update. Skipping.");
    return;
  },

  updateTeam: async (teamId, updates) => {
     if (updates.logo && updates.logo.startsWith('data:image')) {
         updates.logo = await uploadImage(updates.logo, 'team-logos');
     }
     
     const { error } = await supabase
        .from('teams')
        .update({
            name: updates.name,
            description: updates.description,
            logo: updates.logo
            // sport is usually immutable or needs care
        })
        .eq('id', teamId);

     if (error) throw new Error(error.message);
  },

  addWin: async (teamId, category, description) => {
     await supabase
        .from('team_wins')
        .insert({
            team_id: teamId,
            category,
            description
        });
  },

  // Delete a team
  deleteTeam: async (teamId) => {
    // Rely on Cascade Delete for members, requests, wins
    const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
    
    if (error) throw new Error(error.message);
  },

  getUserTeams: async (userId) => {
     // Get query through team_members
     const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);
     
     const teamIds = memberships.map(m => m.team_id);
     
     if (teamIds.length === 0) return [];

     // Then fetch actual teams
     const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);
        
     // We also need to fetch wins for these teams (for profile display)
     const teamsWithWins = await Promise.all(teams.map(async (t) => {
         const { data: wins } = await supabase.from('team_wins').select('*').eq('team_id', t.id);
         return { ...t, wins: wins || [] };
     }));

     return teamsWithWins;
  }
};

// Helper: Upload Base64 to Supabase Storage
async function uploadImage(base64Data, folder) {
    try {
        const base64Response = await fetch(base64Data);
        const blob = await base64Response.blob();
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;

        const { data, error } = await supabase.storage
            .from('allstar-assets')
            .upload(fileName, blob, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error("Upload error:", error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('allstar-assets')
            .getPublicUrl(fileName);
            
        return publicUrl;
    } catch (e) {
        console.error("Image upload failed", e);
        return null;
    }
}
