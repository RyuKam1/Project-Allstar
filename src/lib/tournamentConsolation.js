import { buildRoundStructure } from "./tournamentBracket.js";

export function getMainBracketMatches(matches = []) {
  return matches.filter((match) => (match.bracket_phase || "main") === "main");
}

export function getConsolationMatches(matches = []) {
  return matches.filter((match) => match.bracket_phase === "consolation");
}

export function getMainMaxRound(mainMatches = []) {
  if (mainMatches.length === 0) return 0;
  return Math.max(...mainMatches.map((match) => Number(match.round) || 0));
}

/** Round before the championship — semifinals in a classic bracket. */
export function getSemifinalRound(mainMatches = []) {
  const maxRound = getMainMaxRound(mainMatches);
  if (maxRound < 2) return null;
  return maxRound - 1;
}

/**
 * Bronze match when the semifinal round has exactly two head-to-head games (4 or 8-team style).
 */
export function buildConsolationRows(tournamentId, mainRows = []) {
  const mainOnly = mainRows.filter((row) => (row.bracket_phase || "main") === "main");
  const r1MatchCount = mainOnly.filter((row) => row.round === 1).length;
  if (r1MatchCount < 2) return [];

  const structure = buildRoundStructure(r1MatchCount);
  const maxRound = structure[structure.length - 1]?.round ?? 0;
  const semiRound = maxRound - 1;
  const semiMatchCount = mainOnly.filter((row) => row.round === semiRound).length;
  if (semiMatchCount !== 2) return [];

  return [
    {
      tournament_id: tournamentId,
      round: 1,
      bracket_phase: "consolation",
      match_identifier: "c_1_0",
    },
  ];
}

export function getConsolationSlotForSemifinal(matchIdentifier) {
  const num = Number(String(matchIdentifier).split("_").pop());
  if (!Number.isFinite(num)) return null;
  return num % 2 === 0 ? "team1" : "team2";
}

export function getThirdPlaceFinisher(consolationMatches = []) {
  const decided = consolationMatches.find((match) => match.winner_id);
  if (!decided) return null;
  return (
    [decided.team1, decided.team2].find((team) => team?.id === decided.winner_id) ||
    null
  );
}
