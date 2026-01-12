import { supabase } from "@/lib/supabaseClient";
import { teamService } from "./teamService";

export const tournamentService = {
  getAllTournaments: async () => {
    // Fetch tournaments
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*');

    if (error) return [];

    // For each, fetch matches & teams (simplified hydration for frontend)
    const hydrated = await Promise.all(tournaments.map(async (t) => {
        // Fetch Matches
        const { data: matches } = await supabase
            .from('matches')
            .select(`
                *,
                team1:team1_id(id, name, logo),
                team2:team2_id(id, name, logo),
                winner:winner_id(id, name, logo)
            `)
            .eq('tournament_id', t.id)
            .order('match_identifier'); // Order by ID logic

        // Fetch Joined Teams (via join table)
        const { data: teamJoins } = await supabase
            .from('tournament_teams')
            .select('team_id, team:teams(*)')
            .eq('tournament_id', t.id);

        return {
            ...t,
            matches: matches || [],
            teams: teamJoins ? teamJoins.map(j => j.team) : []
        };
    }));

    return hydrated;
  },

  getTournament: async (id) => {
    const all = await tournamentService.getAllTournaments();
    return all.find(t => t.id === id);
  },

  createTournament: async (data, creator) => {
    // 1. Create Tournament
    const { data: newTour, error } = await supabase
        .from('tournaments')
        .insert({
            name: data.name,
            sport: data.sport,
            creator_id: creator.id,
            status: 'Active'
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    // 2. Link Teams
    const teams = data.teams; 
    const teamLinks = teams.map(t => ({
        tournament_id: newTour.id,
        team_id: t.id
    }));
    await supabase.from('tournament_teams').insert(teamLinks);

    // 3. Create Matches (Round 1)
    const matchesToInsert = [];
    const count = teams.length;
    const round1Count = count / 2;

    for (let i = 0; i < round1Count; i++) {
        matchesToInsert.push({
            tournament_id: newTour.id,
            round: 1,
            match_identifier: `m_1_${i}`,
            team1_id: teams[i * 2].id,
            team2_id: teams[i * 2 + 1].id,
            score1: 0,
            score2: 0
        });
    }

    // Future Rounds (Empty)
    if (round1Count === 4) { // 8 teams
       matchesToInsert.push({ tournament_id: newTour.id, round: 2, match_identifier: 'm_2_0' });
       matchesToInsert.push({ tournament_id: newTour.id, round: 2, match_identifier: 'm_2_1' });
       matchesToInsert.push({ tournament_id: newTour.id, round: 3, match_identifier: 'm_3_0' }); // Final
    } else if (round1Count === 2) { // 4 teams
       matchesToInsert.push({ tournament_id: newTour.id, round: 2, match_identifier: 'm_2_0' }); // Final
    }

    await supabase.from('matches').insert(matchesToInsert);

    return newTour;
  },

  updateMatch: async (tournamentId, matchId, result) => {
     // matchId here corresponds to the UUID now, OR we need the helper to find it.
     // The frontend currently passes the Match Object ID (UUID from Supabase)
     
     // 1. Update Score & Winner
     const { data: match, error } = await supabase
        .from('matches')
        .update({
            winner_id: result.winnerId,
            score1: result.score1,
            score2: result.score2
        })
        .eq('id', matchId)
        .select(`*, team1:team1_id(*), team2:team2_id(*)`) // Need team names for win record
        .single();
     
     if (error) throw new Error(error.message);

     // 2. Record Win
     if (match.winner_id) {
        const isTeam1Winner = match.winner_id === match.team1_id;
        const loserName = isTeam1Winner ? match.team2?.name : match.team1?.name;
        
        await teamService.addWin(
            match.winner_id,
            'Match', 
            `Defeated ${loserName || 'Opponent'} (Round ${match.round})`
        );
     }

     // 3. Advance to Next Round logic
     const currentIdParts = match.match_identifier.split('_'); // m_1_0
     const round = parseInt(currentIdParts[1]);
     const num = parseInt(currentIdParts[2]);

     const nextRound = round + 1;
     const nextNum = Math.floor(num / 2);
     const nextIdentifier = `m_${nextRound}_${nextNum}`;

     // Find the next match row
     const { data: nextMatch } = await supabase
        .from('matches')
        .select('id, team1_id, team2_id')
        .eq('tournament_id', tournamentId)
        .eq('match_identifier', nextIdentifier)
        .single();

     if (nextMatch) {
        const isFirstSlot = num % 2 === 0;
        const updates = isFirstSlot ? { team1_id: match.winner_id } : { team2_id: match.winner_id };
        await supabase.from('matches').update(updates).eq('id', nextMatch.id);
     } else {
        // Tournament End?
        // Close tournament status if it was the final
        // For now simplest check:
        // await supabase.from('tournaments').update({ status: 'Completed', winner_team_id: match.winner_id })...
        
        if (match.winner_id) {
             await teamService.addWin(match.winner_id, 'Tournament', 'Champion');
        }
     }
  },

  deleteTournament: async (id) => {
    await supabase.from('tournaments').delete().eq('id', id);
    return true;
  }
};
