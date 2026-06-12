import { assignTeamRefToRow } from "./tournamentTeamRefs.js";

export const OFFICIAL_BRACKET_SIZES = [4, 8, 16];
/** Real single-elim brackets start at four teams (article + athlete expectation). */
export const MIN_TOURNAMENT_TEAMS = 4;
export const MAX_TOURNAMENT_TEAMS = 32;

/** @deprecated Use isOfficialBracketSize or isValidFreeTeamCount */
export const VALID_BRACKET_SIZES = OFFICIAL_BRACKET_SIZES;

export function isOfficialBracketSize(total) {
  return OFFICIAL_BRACKET_SIZES.includes(total);
}

/** @deprecated Use isOfficialBracketSize */
export function isValidBracketSize(total) {
  return isOfficialBracketSize(total);
}

export function isValidFreeTeamCount(total) {
  return total >= MIN_TOURNAMENT_TEAMS && total <= MAX_TOURNAMENT_TEAMS;
}

/**
 * Human-readable roster validation for creation and roster editing UI.
 * @param {{ count: number, tournamentType?: "free"|"official" }} options
 */
export function getBracketTeamCountStatus({ count, tournamentType = "free" }) {
  const total = Number(count) || 0;

  if (tournamentType === "official") {
    if (isOfficialBracketSize(total)) {
      return { valid: true, message: `${total} teams — ready for an official bracket.` };
    }
    if (total < MIN_TOURNAMENT_TEAMS) {
      const needed = MIN_TOURNAMENT_TEAMS - total;
      return {
        valid: false,
        message: `Add ${needed} more team${needed === 1 ? "" : "s"} (minimum ${MIN_TOURNAMENT_TEAMS}).`,
      };
    }
    if (total > 16) {
      return { valid: false, message: "Official brackets support up to 16 teams." };
    }

    const nextSize = OFFICIAL_BRACKET_SIZES.find((size) => size > total);
    const prevSize = [...OFFICIAL_BRACKET_SIZES].reverse().find((size) => size < total);
    if (nextSize && prevSize) {
      return {
        valid: false,
        message: `${total} teams — use exactly 4, 8, or 16. Add ${nextSize - total} or remove ${total - prevSize}.`,
      };
    }
    if (nextSize) {
      return {
        valid: false,
        message: `${total} teams — add ${nextSize - total} more for ${nextSize}.`,
      };
    }
    return {
      valid: false,
      message: `${total} teams — pick exactly 4, 8, or 16 registered teams.`,
    };
  }

  if (total < MIN_TOURNAMENT_TEAMS) {
    const needed = MIN_TOURNAMENT_TEAMS - total;
    return {
      valid: false,
      message: `Add ${needed} more team${needed === 1 ? "" : "s"} to reach the minimum of ${MIN_TOURNAMENT_TEAMS}.`,
    };
  }
  if (total > MAX_TOURNAMENT_TEAMS) {
    return { valid: false, message: `Maximum ${MAX_TOURNAMENT_TEAMS} teams per bracket.` };
  }

  return {
    valid: true,
    message:
      total % 2 === 0
        ? `${total} teams — ready to build the bracket.`
        : `${total} teams — one team sits out when the bracket is applied.`,
  };
}

export function canRemoveTeamFromBracket(currentCount) {
  return currentCount > MIN_TOURNAMENT_TEAMS;
}

export function tournamentHasStarted(matches = []) {
  return matches.some((match) => match.winner_id);
}

export function nextPowerOfTwo(n) {
  let value = 1;
  while (value < n) value *= 2;
  return value;
}

export function shuffleTeams(teams) {
  const arr = [...teams];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Preview-only: last team sits out when count is odd before apply. */
export function getPreviewExcludedTeamId(teams = []) {
  if (teams.length % 2 === 0 || teams.length === 0) return null;
  return teams[teams.length - 1]?.id ?? null;
}

export function pickRandomExcludedTeamId(teams = []) {
  if (teams.length % 2 === 0 || teams.length === 0) return null;
  const index = Math.floor(Math.random() * teams.length);
  return teams[index]?.id ?? null;
}

export function splitParticipants(teams = [], excludedTeamId = null) {
  if (teams.length < MIN_TOURNAMENT_TEAMS) {
    throw new Error(`At least ${MIN_TOURNAMENT_TEAMS} teams are required`);
  }

  if (teams.length % 2 === 0) {
    return { participants: teams, excludedTeamId: null };
  }

  const resolvedExcludedId = excludedTeamId ?? pickRandomExcludedTeamId(teams);
  return {
    participants: teams.filter((team) => team.id !== resolvedExcludedId),
    excludedTeamId: resolvedExcludedId,
  };
}

/** @returns {Array<{ round: number, matchCount: number }>} */
export function buildRoundStructure(r1MatchCount) {
  const rounds = [{ round: 1, matchCount: r1MatchCount }];
  let previousRoundMatches = r1MatchCount;

  while (previousRoundMatches > 1) {
    const matchCount = Math.floor(previousRoundMatches / 2);
    rounds.push({ round: rounds.length + 1, matchCount });
    const carry = previousRoundMatches % 2;
    previousRoundMatches = matchCount + carry;
  }

  return rounds;
}

/**
 * Maps each match identifier to the next match slot its winner occupies.
 * Carried winners skip rounds until they meet their next opponent.
 */
export function buildBracketAdvanceMap(r1MatchCount) {
  const destinations = new Map();
  let sources = Array.from({ length: r1MatchCount }, (_, i) => `m_1_${i}`);
  let round = 1;

  while (sources.length > 1) {
    const nextRound = round + 1;
    const nextSources = [];
    let nextMatchIndex = 0;

    for (let i = 0; i < sources.length; i += 2) {
      if (i + 1 < sources.length) {
        const nextId = `m_${nextRound}_${nextMatchIndex}`;
        destinations.set(sources[i], { nextId, slot: "team1" });
        destinations.set(sources[i + 1], { nextId, slot: "team2" });
        nextSources.push(nextId);
        nextMatchIndex += 1;
      } else {
        nextSources.push(sources[i]);
      }
    }

    sources = nextSources;
    round = nextRound;
  }

  return destinations;
}

/** Classic bracket seed numbers for a power-of-two field (e.g. 8 → [1,8,4,5,2,7,3,6]). */
export function generateBracketSeedPositions(size) {
  if (!isOfficialBracketSize(size)) {
    throw new Error(`Seed positions require 4, 8, or 16 teams (got ${size})`);
  }

  let seeds = [1];
  while (seeds.length < size) {
    const max = seeds.length * 2 + 1;
    const next = [];
    seeds.forEach((seed) => {
      next.push(seed);
      next.push(max - seed);
    });
    seeds = next;
  }
  return seeds;
}

/** Rank teams best → worst using win history when available. */
export function orderTeamsByRecord(teams = []) {
  return [...teams].sort((a, b) => {
    const winsA = a.win_count ?? a.wins?.length ?? 0;
    const winsB = b.win_count ?? b.wins?.length ?? 0;
    if (winsB !== winsA) return winsB - winsA;
    return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  });
}

/** Reorder ranked teams into standard bracket slot order (1 vs 8, 4 vs 5, …). */
export function applyStandardBracketSeeding(rankedTeams = []) {
  const n = rankedTeams.length;
  if (isOfficialBracketSize(n)) {
    return generateBracketSeedPositions(n).map((seed) => rankedTeams[seed - 1]);
  }
  return rankedTeams;
}

export function resolveSeedOrder(participants = [], seedTeamIds = []) {
  const byId = new Map(participants.map((team) => [team.id, team]));
  const ordered = seedTeamIds.map((id) => byId.get(id)).filter(Boolean);
  participants.forEach((team) => {
    if (!ordered.some((entry) => entry.id === team.id)) ordered.push(team);
  });
  return ordered;
}

/**
 * @param {"random"|"seeded"} mode
 * @param {string[]} [seedTeamIds] creator-defined seed order (best first)
 */
export function resolveBracketTeamOrder(participants = [], { mode = "random", seedTeamIds = null } = {}) {
  if (mode === "seeded") {
    const ranked = seedTeamIds?.length
      ? resolveSeedOrder(participants, seedTeamIds)
      : orderTeamsByRecord(participants);
    return applyStandardBracketSeeding(ranked);
  }
  return shuffleTeams(participants);
}

/**
 * Build a single-elimination bracket:
 * - Round 1 pairs every participant with another team (no byes).
 * - Later rounds are empty until winners are recorded.
 *
 * @param {string} tournamentId
 * @param {Array<{ id: string }>} shuffledParticipants even-length, pre-shuffled
 */
export function buildFlexibleBracketMatchRows(tournamentId, shuffledParticipants) {
  const n = shuffledParticipants.length;
  if (n < MIN_TOURNAMENT_TEAMS) {
    throw new Error(`At least ${MIN_TOURNAMENT_TEAMS} teams are required for a bracket`);
  }
  if (n % 2 !== 0) {
    throw new Error("Participant count must be even");
  }

  const r1MatchCount = n / 2;
  const rows = [];

  for (let i = 0; i < r1MatchCount; i += 1) {
    const row = {
      tournament_id: tournamentId,
      round: 1,
      match_identifier: `m_1_${i}`,
      score1: 0,
      score2: 0,
    };
    assignTeamRefToRow(row, "team1", shuffledParticipants[i * 2].id);
    assignTeamRefToRow(row, "team2", shuffledParticipants[i * 2 + 1].id);
    rows.push(row);
  }

  const structure = buildRoundStructure(r1MatchCount);
  for (let index = 1; index < structure.length; index += 1) {
    const { round, matchCount } = structure[index];
    for (let i = 0; i < matchCount; i += 1) {
      rows.push({
        tournament_id: tournamentId,
        round,
        match_identifier: `m_${round}_${i}`,
      });
    }
  }

  return rows;
}

/** Official tournaments: 4/8/16 teams, seeded by record with standard 1-vs-8 pairing. */
export function buildOfficialBracketMatchRows(tournamentId, teams) {
  if (!isOfficialBracketSize(teams.length)) {
    throw new Error(`Official brackets need 4, 8, or 16 teams (got ${teams.length})`);
  }
  const seeded = applyStandardBracketSeeding(orderTeamsByRecord(teams));
  return buildFlexibleBracketMatchRows(tournamentId, seeded);
}

export function getRoundOneMatchCountFromTeams(teams = []) {
  const { participants } = splitParticipants(teams);
  return participants.length / 2;
}

export function getRoundOneMatchCountFromMatches(matches = []) {
  return matches.filter((match) => Number(match.round) === 1).length;
}
