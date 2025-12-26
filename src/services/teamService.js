const STORAGE_KEY = 'allstar_teams';

export const teamService = {
  // Get all teams
  getAllTeams: async () => {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 300));
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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
      createdAt: new Date().toISOString()
    };

    teams.push(newTeam);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    return newTeam;
  },

  // Add a member (User on platform)
  joinTeam: async (teamId, user) => {
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
