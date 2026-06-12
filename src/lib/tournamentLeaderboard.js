/**
 * Derive the tournament champion from bracket matches.
 * @param {Array<{ round: number, winner_id?: string, winner_local_id?: string, winner?: object, team1?: object, team2?: object }>} matches
 */
export function getTournamentChampion(matches = []) {
  if (!matches.length) return null;

  const maxRound = Math.max(...matches.map((m) => m.round));
  const finals = matches.filter((m) => m.round === maxRound);
  const decided = finals.find((m) => m.winner);
  if (decided?.winner) return decided.winner;

  const withWinner = finals.find((m) => m.winner_id || m.winner_local_id);
  if (!withWinner) return null;

  const winnerRef = withWinner.winner_id || withWinner.winner_local_id;
  return (
    [withWinner.team1, withWinner.team2].find((t) => t?.id === winnerRef) ||
    null
  );
}

/**
 * Build a win/loss leaderboard for single-elimination brackets.
 * Best performers (most wins, fewest losses) rank highest.
 *
 * @param {Array<{ id: string, name: string, logo?: string }>} teams
 * @param {Array<{ team1?: object, team2?: object, winner_id?: string, winner_local_id?: string }>} matches
 * @param {{ id: string } | null} [champion]
 */
export function buildTournamentLeaderboard(teams = [], matches = [], champion = null) {
  const resolvedChampion = champion ?? getTournamentChampion(matches);
  const stats = new Map();

  for (const team of teams) {
    stats.set(team.id, {
      team,
      wins: 0,
      losses: 0,
      played: 0,
    });
  }

  for (const match of matches) {
    const { team1, team2 } = match;
    const winnerId = match.winner_id || match.winner_local_id;
    if (!winnerId) continue;

    for (const side of [team1, team2]) {
      if (!side?.id || !stats.has(side.id)) continue;

      const entry = stats.get(side.id);
      entry.played += 1;
      if (winnerId === side.id) entry.wins += 1;
      else entry.losses += 1;
    }
  }

  const entries = [...stats.values()].map((entry) => {
    const isChampion = resolvedChampion?.id === entry.team.id;
    const isEliminated = entry.losses > 0;
    const isActive = entry.played > 0 && !isEliminated;
    const isWaiting = entry.played === 0;

    let status = 'Waiting';
    if (isChampion) status = 'Champion';
    else if (isEliminated) status = 'Eliminated';
    else if (isActive) status = 'Active';

    return {
      ...entry,
      status,
      isChampion,
    };
  });

  entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return a.team.name.localeCompare(b.team.name, undefined, { sensitivity: 'base' });
  });

  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
