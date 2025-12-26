import { teamService } from "./teamService";

const STORAGE_KEY = 'allstar_tournaments';

export const tournamentService = {
  getAllTournaments: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  getTournament: async (id) => {
    const all = await tournamentService.getAllTournaments();
    return all.find(t => t.id === id);
  },

  createTournament: async (data, creator) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const all = await tournamentService.getAllTournaments();
    
    // Create initial matches based on team count (assuming 4 or 8 for simplicity)
    const teams = data.teams; // Array of team objects
    const matches = [];
    const round1Matches = teams.length / 2;

    for (let i = 0; i < round1Matches; i++) {
        matches.push({
            id: `m_1_${i}`,
            round: 1,
            team1: teams[i * 2],
            team2: teams[i * 2 + 1],
            winnerId: null,
            score1: 0,
            score2: 0
        });
    }

    // Placeholder for subsequent rounds (empty for now)
    if (round1Matches === 4) { // 8 teams -> 4 matches -> 2 matches -> 1 match
       matches.push({ id: `m_2_0`, round: 2, team1: null, team2: null, winnerId: null });
       matches.push({ id: `m_2_1`, round: 2, team1: null, team2: null, winnerId: null });
       matches.push({ id: `m_3_0`, round: 3, team1: null, team2: null, winnerId: null }); // Final
    } else if (round1Matches === 2) { // 4 teams -> 2 matches -> 1 match
       matches.push({ id: `m_2_0`, round: 2, team1: null, team2: null, winnerId: null }); // Final
    }

    const newTournament = {
      id: 'tour_' + Date.now(),
      name: data.name,
      sport: data.sport,
      creatorId: creator.id,
      status: 'Active',
      teams: teams,
      matches: matches,
      winner: null
    };

    all.push(newTournament);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return newTournament;
  },

  updateMatch: async (tournamentId, matchId, result) => {
    // result: { winnerId, score1, score2 }
    const all = await tournamentService.getAllTournaments();
    const tIndex = all.findIndex(t => t.id === tournamentId);
    if (tIndex === -1) throw new Error("Tournament not found");

    const tour = all[tIndex];
    const mIndex = tour.matches.findIndex(m => m.id === matchId);
    if (mIndex === -1) throw new Error("Match not found");

    // Update match
    const match = tour.matches[mIndex];
    match.winnerId = result.winnerId;
    match.score1 = result.score1;
    match.score2 = result.score2;

    // Record Match Win
    if (result.winnerId) {
        const isTeam1Winner = result.winnerId === match.team1.id;
        const winner = isTeam1Winner ? match.team1 : match.team2;
        const loser = isTeam1Winner ? match.team2 : match.team1;
        
        if (winner && loser) {
             await teamService.addWin(
                winner.id, 
                'Match', 
                `Defeated ${loser.name} in ${tour.name} (Round ${match.round})`
            );
        }
    }

    // Advance logic
    // Find next match to feed into
    // Simple logic: m_1_0 & m_1_1 -> m_2_0
    // m_1_2 & m_1_3 -> m_2_1
    const currentMatchNum = parseInt(match.id.split('_')[2]);
    const nextRound = match.round + 1;
    const nextMatchNum = Math.floor(currentMatchNum / 2);
    const nextMatchId = `m_${nextRound}_${nextMatchNum}`;

    const nextMatch = tour.matches.find(m => m.id === nextMatchId);
    
    if (nextMatch) {
       // Is this team1 or team2 slot?
       const isFirstSlot = currentMatchNum % 2 === 0;
       const winnerTeam = match.winnerId === match.team1.id ? match.team1 : match.team2;
       
       if (isFirstSlot) nextMatch.team1 = winnerTeam;
       else nextMatch.team2 = winnerTeam;
    } else {
       // No next match? Must be final!
       if (match.round === (tour.teams.length === 4 ? 2 : 3)) {
         tour.status = 'Completed';
         const winnerInfo = match.winnerId === match.team1.id ? match.team1 : match.team2;
         tour.winner = winnerInfo;
         
         // Award Win to Team
         if (winnerInfo) {
           await teamService.addWin(winnerInfo.id, 'Tournament', `Winner of ${tour.name}`);
         }
       }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return tour;
  },

  deleteTournament: async (id) => {
    const all = await tournamentService.getAllTournaments();
    const filtered = all.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  updateTournament: async (id, updates) => {
    const all = await tournamentService.getAllTournaments();
    const index = all.findIndex(t => t.id === id);
    if (index !== -1) {
       all[index] = { ...all[index], ...updates };
       localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
       return all[index];
    }
    return null;
  }
};
