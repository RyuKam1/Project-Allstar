const STORAGE_KEY = 'allstar_teams';

export const teamService = {
  // Get all teams
  getAllTeams: async () => {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 300));
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(STORAGE_KEY);
    const teams = stored ? JSON.parse(stored) : [];
    
    // Migration: ensure 'requests' array exists
    teams.forEach(t => {
      if (!t.requests) t.requests = [];
    });
    
    return teams;
  },

  // Create a new team
  createTeam: async (teamData, owner) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const teams = await teamService.getAllTeams();
    
    // Basic validation
    if (!teamData.name || !teamData.sport) throw new Error("Name and Sport required");

    const newTeam = {
      id: 't_' + Date.now(),
      name: teamData.name,
      sport: teamData.sport,
      description: teamData.description || '',
      logo: teamData.logo || null, // Base64 string or null
      ownerId: owner.id,
      wins: [], // { category: 'Tournament', name: 'Summer Cup' }
      members: [
        { 
          id: owner.id, 
          name: owner.name, 
          avatar: owner.avatar, 
          role: 'Owner',
          position: 'Bench' // Start as Bench, user drags to position
        }
      ],
      customGuests: [],
      requests: [], // Array of user objects requesting to join
      createdAt: new Date().toISOString()
    };

    teams.push(newTeam);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    return newTeam;
  },

  // Add a member (User on platform)
  joinTeam: async (teamId, user) => {
    // Legacy direct join - keeping for now but might deprecate
    await new Promise(resolve => setTimeout(resolve, 400));
    const teams = await teamService.getAllTeams();
    const teamIndex = teams.findIndex(t => t.id === teamId);
    
    if (teamIndex === -1) throw new Error("Team not found");
    
    // Check if already member
    if (teams[teamIndex].members.some(m => m.id === user.id)) {
      throw new Error("User already in team");
    }

    teams[teamIndex].members.push({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      role: 'Member',
      position: 'Bench'
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    return teams[teamIndex];
  },

  // Request to join a team
  requestJoinTeam: async (teamId, user) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const teams = await teamService.getAllTeams();
    const teamIndex = teams.findIndex(t => t.id === teamId);
    
    if (teamIndex === -1) throw new Error("Team not found");
    
    // Check if already member
    if (teams[teamIndex].members.some(m => m.id === user.id)) {
      throw new Error("You are already in this team");
    }

    // Check if already requested
    if (teams[teamIndex].requests.some(r => r.id === user.id)) {
      throw new Error("Request already pending");
    }

    teams[teamIndex].requests.push({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      requestedAt: new Date().toISOString()
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    return teams[teamIndex];
  },

  // Accept a join request
  acceptJoinRequest: async (teamId, userId, targetPosition = 'Bench') => {
    const teams = await teamService.getAllTeams();
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) throw new Error("Team not found");

    const requestIndex = teams[teamIndex].requests.findIndex(r => r.id === userId);
    if (requestIndex === -1) throw new Error("Request not found");

    const request = teams[teamIndex].requests[requestIndex];

    // Remove from requests
    teams[teamIndex].requests.splice(requestIndex, 1);

    // Add to members
    teams[teamIndex].members.push({
      id: request.id,
      name: request.name,
      avatar: request.avatar,
      role: 'Member',
      position: targetPosition
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    return teams[teamIndex];
  },

  // Reject a join request
  rejectJoinRequest: async (teamId, userId) => {
    const teams = await teamService.getAllTeams();
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) throw new Error("Team not found");

    const requestIndex = teams[teamIndex].requests.findIndex(r => r.id === userId);
    if (requestIndex !== -1) {
        teams[teamIndex].requests.splice(requestIndex, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    }
    return teams[teamIndex];
  },

  // Cancel my own request
  cancelJoinRequest: async (teamId, userId) => {
    return teamService.rejectJoinRequest(teamId, userId);
  },

  // Add a guest member
  addGuestMember: async (teamId, guestName) => {
    const teams = await teamService.getAllTeams();
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) throw new Error("Team not found");

    const newGuest = {
      id: 'g_' + Date.now(),
      name: guestName,
      isGuest: true,
      avatar: `https://ui-avatars.com/api/?name=${guestName}&background=random`,
      role: 'Guest',
      position: 'Bench'
    };

    teams[teamIndex].members.push(newGuest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    return teams[teamIndex];
  },

  // Update member position
  updateMemberPosition: async (teamId, memberId, newPosition) => {
    const teams = await teamService.getAllTeams();
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) throw new Error("Team not found");

    const memberIndex = teams[teamIndex].members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) throw new Error("Member not found");

    // If moving to a field slot, check if someone else is already there
    // If so, swap them to Bench (or just overwrite? Swap is friendlier)
    if (newPosition !== 'Bench') {
        const existingOccupantIndex = teams[teamIndex].members.findIndex(m => m.position === newPosition);
        if (existingOccupantIndex !== -1 && existingOccupantIndex !== memberIndex) {
            teams[teamIndex].members[existingOccupantIndex].position = 'Bench';
        }
    }

    teams[teamIndex].members[memberIndex].position = newPosition;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    return teams[teamIndex];
  },

  // Get User's Teams
  getUserTeams: async (userId) => {
    const teams = await teamService.getAllTeams();
    return teams.filter(t => t.members.some(m => m.id === userId));
  },

  // Admin: Delete Team
  deleteTeam: async (teamId) => {
    const teams = await teamService.getAllTeams();
    const filtered = teams.filter(t => t.id !== teamId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  // Admin: Update Team
  updateTeam: async (teamId, updates) => {
    const teams = await teamService.getAllTeams();
    const index = teams.findIndex(t => t.id === teamId);
    if (index !== -1) {
      teams[index] = { ...teams[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
      return teams[index];
    }
    return null;
  },

  // Add a Win Record
  addWin: async (teamId, category, description) => {
    const teams = await teamService.getAllTeams();
    const index = teams.findIndex(t => t.id === teamId);
    if (index !== -1) {
      if (!teams[index].wins) teams[index].wins = [];
      teams[index].wins.push({ 
        id: 'w_' + Date.now(), 
        category,     // e.g. 'Tournament', 'Single Match'
        description,  // e.g. 'Summer Cup 2024'
        date: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
      return teams[index];
    }
    return null;
  }
};
