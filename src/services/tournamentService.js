import { supabase } from "@/lib/supabaseClient";
import { teamService } from "./teamService";
import { sanitizeText } from "@/lib/security/inputSanitizer";
import { resolveSportSelection } from "@/lib/sportsCatalog";
import { validateBracketRoster } from "@/lib/tournamentTeamRules";
import {
  buildConsolationRows,
  getConsolationSlotForSemifinal,
  getMainBracketMatches,
  getSemifinalRound,
} from "@/lib/tournamentConsolation";
import { BRACKET_MODES, normalizeBracketMode } from "@/lib/tournamentModes";
import { isLocalTeamId, clearLocalCustomTeams } from "@/lib/localCustomTeamsStorage";
import {
  buildSlotUpdate,
  buildWinnerUpdate,
  getMatchSideRef,
  getMatchWinnerRef,
  isRegisteredTeamRef,
} from "@/lib/tournamentTeamRefs";
import {
  buildBracketAdvanceMap,
  buildFlexibleBracketMatchRows,
  buildOfficialBracketMatchRows,
  getRoundOneMatchCountFromMatches,
  isOfficialBracketSize,
  isValidFreeTeamCount,
  MAX_TOURNAMENT_TEAMS,
  MIN_TOURNAMENT_TEAMS,
  orderTeamsByRecord,
  resolveBracketTeamOrder,
  splitParticipants,
} from "@/lib/tournamentBracket";

let getPublicTournamentsInFlight = null;
let getPublicTournamentsCache = null;
let getPublicTournamentsCacheAt = 0;
const TOURNAMENT_LIST_CACHE_TTL_MS = 15000;

function invalidateTournamentCache() {
  getPublicTournamentsCache = null;
  getPublicTournamentsCacheAt = 0;
}

function getRegisteredWinnerTeam(match, winnerRef) {
  if (!winnerRef || !isRegisteredTeamRef(winnerRef)) return null;
  if (match.team1?.id === winnerRef) return match.team1;
  if (match.team2?.id === winnerRef) return match.team2;
  return null;
}

const VALID_BRACKET_SIZES_LOCAL = [4, 8, 16];
export const VALID_BRACKET_SIZES = VALID_BRACKET_SIZES_LOCAL;

function assertVerifiedBusiness(creator) {
  const role = creator?.role;
  const status = creator?.business_verification_status;
  if (role === "admin" || role === "business" || status === "verified") return;
  throw new Error("Verified business account required to create official tournaments");
}

async function hydrateTournaments(rows = []) {
  const tournamentIds = rows.map((t) => t.id);
  if (tournamentIds.length === 0) return [];

  const [matchesRes, teamJoinsRes] = await Promise.all([
    supabase
      .from("matches")
      .select(`
        *,
        team1:team1_id(id, name, logo),
        team2:team2_id(id, name, logo),
        winner:winner_id(id, name, logo)
      `)
      .in("tournament_id", tournamentIds)
      .order("match_identifier"),
    supabase
      .from("tournament_teams")
      .select("tournament_id, team_id, team:teams(*)")
      .in("tournament_id", tournamentIds),
  ]);

  const matchesByTournament = {};
  const teamsByTournament = {};
  (matchesRes.data || []).forEach((m) => {
    if (!matchesByTournament[m.tournament_id]) matchesByTournament[m.tournament_id] = [];
    matchesByTournament[m.tournament_id].push(m);
  });
  (teamJoinsRes.data || []).forEach((j) => {
    if (!teamsByTournament[j.tournament_id]) teamsByTournament[j.tournament_id] = [];
    teamsByTournament[j.tournament_id].push(j.team);
  });

  return rows.map((t) => ({
    ...t,
    matches: matchesByTournament[t.id] || [],
    teams: teamsByTournament[t.id] || [],
  }));
}

async function assertFreeTournamentCreator(tournamentId, userId) {
  const { data: tour, error } = await supabase
    .from("tournaments")
    .select("id, creator_id, sport, tournament_type")
    .eq("id", tournamentId)
    .single();

  if (error || !tour) throw new Error("Tournament not found");
  if ((tour.tournament_type || "free") !== "free") {
    throw new Error("Custom teams are only available in friendly tournaments");
  }
  if (tour.creator_id !== userId) {
    throw new Error("Only the tournament creator can manage custom teams");
  }
  return tour;
}

async function assertTournamentNotStarted(tournamentId) {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, winner_id")
    .eq("tournament_id", tournamentId);

  if (error) throw new Error(error.message);
  if ((matches || []).some((m) => m.winner_id)) {
    throw new Error("Tournament has started. Reset the bracket to change teams or results.");
  }
}

async function markBracketChanged(tournamentId) {
  await supabase.from("tournaments").update({ bracket_status: "changed" }).eq("id", tournamentId);
}

async function markBracketSynced(tournamentId) {
  await supabase.from("tournaments").update({ bracket_status: "synced" }).eq("id", tournamentId);
}

async function advanceMatchWinner(tournamentId, match, r1MatchCount) {
  const winnerRef = getMatchWinnerRef(match);
  if (!winnerRef || !r1MatchCount) return;

  const destination = buildBracketAdvanceMap(r1MatchCount).get(match.match_identifier);
  if (!destination) return;

  const { data: nextMatch } = await supabase
    .from("matches")
    .select("id, team1_id, team2_id, team1_local_id, team2_local_id")
    .eq("tournament_id", tournamentId)
    .eq("match_identifier", destination.nextId)
    .single();

  if (!nextMatch) return;

  await supabase
    .from("matches")
    .update(buildSlotUpdate(destination.slot, winnerRef))
    .eq("id", nextMatch.id);
}

function withMainPhase(rows = []) {
  return rows.map((row) => ({ ...row, bracket_phase: "main" }));
}

function buildAllBracketRows(tournamentId, mainRows, bracketMode) {
  const rows = withMainPhase(mainRows);
  if (normalizeBracketMode(bracketMode) === BRACKET_MODES.STANDARD) {
    return [...rows, ...buildConsolationRows(tournamentId, rows)];
  }
  return rows;
}

async function advanceLoserToConsolation(tournamentId, match, mainMatches) {
  if ((match.bracket_phase || "main") !== "main" || !getMatchWinnerRef(match)) return;

  const semiRound = getSemifinalRound(mainMatches);
  if (!semiRound || Number(match.round) !== semiRound) return;

  const winnerRef = getMatchWinnerRef(match);
  const team1Ref = getMatchSideRef(match, 1);
  const team2Ref = getMatchSideRef(match, 2);
  const loserRef = winnerRef === team1Ref ? team2Ref : team1Ref;
  if (!loserRef) return;

  const slot = getConsolationSlotForSemifinal(match.match_identifier);
  if (!slot) return;

  const { data: bronzeMatch } = await supabase
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("match_identifier", "c_1_0")
    .eq("bracket_phase", "consolation")
    .single();

  if (!bronzeMatch) return;

  await supabase
    .from("matches")
    .update(buildSlotUpdate(slot, loserRef))
    .eq("id", bronzeMatch.id);
}

async function fetchTournamentBracketMode(tournamentId) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("bracket_mode")
    .eq("id", tournamentId)
    .single();

  if (error) {
    if (error.message?.includes("bracket_mode") || error.code === "42703") {
      return BRACKET_MODES.STANDARD;
    }
    throw new Error(error.message);
  }
  return normalizeBracketMode(data?.bracket_mode);
}

async function fetchTeamWinCounts(teamIds = []) {
  if (teamIds.length === 0) return {};

  const { data, error } = await supabase
    .from("team_wins")
    .select("team_id")
    .in("team_id", teamIds);

  if (error) throw new Error(error.message);

  const counts = {};
  (data || []).forEach((row) => {
    counts[row.team_id] = (counts[row.team_id] || 0) + 1;
  });
  return counts;
}

async function attachWinCounts(teams = []) {
  const counts = await fetchTeamWinCounts(teams.map((team) => team.id));
  return teams.map((team) => ({
    ...team,
    win_count: counts[team.id] || 0,
  }));
}

async function regenerateFlexibleBracket(
  tournamentId,
  teams,
  { mode = "random", seedTeamIds = null, bracketMode = BRACKET_MODES.STANDARD } = {},
) {
  const { participants } = splitParticipants(teams);
  const ordered = resolveBracketTeamOrder(participants, { mode, seedTeamIds });
  const rows = buildAllBracketRows(
    tournamentId,
    buildFlexibleBracketMatchRows(tournamentId, ordered),
    bracketMode,
  );

  const { error: deleteError } = await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId);

  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase.from("matches").insert(rows);
  if (insertError) throw new Error(insertError.message);
}

async function regenerateOfficialBracket(tournamentId, teams, bracketMode = BRACKET_MODES.STANDARD) {
  if (!isOfficialBracketSize(teams.length)) {
    throw new Error(`Official brackets need 4, 8, or 16 teams (currently ${teams.length})`);
  }

  const ranked = orderTeamsByRecord(await attachWinCounts(teams));
  const rows = buildAllBracketRows(
    tournamentId,
    buildOfficialBracketMatchRows(tournamentId, ranked),
    bracketMode,
  );
  const { error: deleteError } = await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId);

  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase.from("matches").insert(rows);
  if (insertError) throw new Error(insertError.message);
}

async function fetchRegisteredTournamentTeams(tournamentId) {
  const { data, error } = await supabase
    .from("tournament_teams")
    .select("team:teams(*)")
    .eq("tournament_id", tournamentId);

  if (error) throw new Error(error.message);
  return (data || []).map((row) => row.team).filter((team) => team && !team.is_guest);
}

function buildBracketParticipants(registeredTeams = [], localCustomTeams = []) {
  return [
    ...registeredTeams,
    ...localCustomTeams.map((team) => ({
      id: team.id,
      name: team.name,
      is_local: true,
    })),
  ];
}

async function fetchAllBracketParticipants(tournamentId, localCustomTeams = []) {
  const registeredTeams = await fetchRegisteredTournamentTeams(tournamentId);
  return buildBracketParticipants(registeredTeams, localCustomTeams);
}

/** @deprecated Use fetchRegisteredTournamentTeams */
async function fetchTournamentTeams(tournamentId) {
  return fetchRegisteredTournamentTeams(tournamentId);
}

async function insertBracketTournament({
  name,
  sport,
  creatorId,
  tournamentType,
  existingTeams,
  localCustomTeams = [],
  coverImageUrl = null,
  bracketMode = BRACKET_MODES.STANDARD,
}) {
  const row = {
    name,
    sport,
    creator_id: creatorId,
    status: "Active",
    tournament_type: tournamentType,
    bracket_mode: normalizeBracketMode(bracketMode),
  };
  if (coverImageUrl) row.cover_image_url = coverImageUrl;

  const { data: newTour, error } = await supabase
    .from("tournaments")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const teamLinks = existingTeams.map((t) => ({
    tournament_id: newTour.id,
    team_id: t.id,
  }));
  if (teamLinks.length > 0) {
    const { error: linkError } = await supabase.from("tournament_teams").insert(teamLinks);
    if (linkError) {
      await supabase.from("tournaments").delete().eq("id", newTour.id);
      throw new Error(linkError.message);
    }
  }

  const participants = buildBracketParticipants(existingTeams, localCustomTeams);

  if (tournamentType === "free") {
    await regenerateFlexibleBracket(newTour.id, participants, {
      mode: "random",
      bracketMode: normalizeBracketMode(bracketMode),
    });
  } else {
    const ranked = orderTeamsByRecord(await attachWinCounts(participants));
    const matchesToInsert = buildAllBracketRows(
      newTour.id,
      buildOfficialBracketMatchRows(newTour.id, ranked),
      bracketMode,
    );
    await supabase.from("matches").insert(matchesToInsert);
  }

  await markBracketSynced(newTour.id);
  invalidateTournamentCache();
  return newTour;
}

function normalizeLocalCustomTeams(rawTeams = []) {
  const seen = new Set();
  return rawTeams
    .map((team) => ({
      id: team?.id,
      name: sanitizeText(team?.name, 60),
    }))
    .filter((team) => {
      if (!team.id || !team.name || !isLocalTeamId(team.id)) return false;
      const key = team.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function prepareBracketPayload(data, { allowCustom }) {
  const name = sanitizeText(data.name, 120);
  if (!name) throw new Error("Tournament name is required");

  const sport = resolveSportSelection(data.sport, data.customSport);
  const existingTeams = data.teams || [];
  const localCustomTeams = allowCustom ? normalizeLocalCustomTeams(data.localCustomTeams) : [];
  const customNames = localCustomTeams.map((team) => team.name);

  if (!allowCustom && (data.localCustomTeams || data.customTeams || []).length > 0) {
    throw new Error("Official tournaments use registered teams only");
  }

  const rosterCheck = validateBracketRoster({
    teams: existingTeams,
    customNames,
    allowCustom,
  });
  if (!rosterCheck.ok) {
    throw new Error(rosterCheck.errors[0]);
  }

  const totalCount = existingTeams.length + localCustomTeams.length;
  if (allowCustom) {
    if (!isValidFreeTeamCount(totalCount)) {
      throw new Error(
        `Friendly brackets support ${MIN_TOURNAMENT_TEAMS}–${MAX_TOURNAMENT_TEAMS} teams total`,
      );
    }
  } else if (!VALID_BRACKET_SIZES_LOCAL.includes(totalCount)) {
    throw new Error("Pick 4, 8, or 16 registered teams for an official bracket");
  }

  return { name, sport, existingTeams, localCustomTeams };
}

export const tournamentService = {
  /** Official tournaments only — safe for public events / bracket hub listings. */
  getPublicTournaments: async () => {
    if (
      getPublicTournamentsCache &&
      Date.now() - getPublicTournamentsCacheAt < TOURNAMENT_LIST_CACHE_TTL_MS
    ) {
      return getPublicTournamentsCache;
    }
    if (getPublicTournamentsInFlight) return getPublicTournamentsInFlight;

    getPublicTournamentsInFlight = (async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, sport, status, tournament_type, cover_image_url, created_at")
        .eq("tournament_type", "official")
        .order("created_at", { ascending: false });

      if (error) return [];
      return hydrateTournaments(data || []);
    })();

    try {
      const rows = await getPublicTournamentsInFlight;
      getPublicTournamentsCache = rows;
      getPublicTournamentsCacheAt = Date.now();
      return rows;
    } finally {
      getPublicTournamentsInFlight = null;
    }
  },

  /** @deprecated Prefer getPublicTournaments or getTournamentById. */
  getAllTournaments: async () => tournamentService.getPublicTournaments(),

  getTournament: async (id) => tournamentService.getTournamentById(id),

  getTournamentById: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (error || !data) return null;

    const type = data.tournament_type || "free";
    if (type === "free") {
      if (!user) return null;
      if (user.id !== data.creator_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role !== "admin") return null;
      }
    }

    const [hydrated] = await hydrateTournaments([data]);
    return hydrated || null;
  },

  listOfficialMine: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("creator_id", user.id)
      .eq("tournament_type", "official")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  /** Offline brackets created by the signed-in user (not shown on public events). */
  listOfflineMine: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, name, sport, status, tournament_type, cover_image_url, created_at")
      .eq("creator_id", user.id)
      .eq("tournament_type", "free")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  createTournament: async (data, creator) => {
    const { name, sport, existingTeams, localCustomTeams } = prepareBracketPayload(data, {
      allowCustom: true,
    });

    return insertBracketTournament({
      name,
      sport,
      creatorId: creator.id,
      tournamentType: "free",
      existingTeams,
      localCustomTeams,
      coverImageUrl: data.coverImageUrl || null,
      bracketMode: data.bracketMode,
    });
  },

  createOfficialTournament: async (data, creator) => {
    assertVerifiedBusiness(creator);
    const { name, sport, existingTeams, localCustomTeams } = prepareBracketPayload(data, {
      allowCustom: false,
    });

    return insertBracketTournament({
      name,
      sport,
      creatorId: creator.id,
      tournamentType: "official",
      existingTeams,
      localCustomTeams,
      coverImageUrl: data.coverImageUrl || null,
      bracketMode: data.bracketMode,
    });
  },

  updateMatch: async (tournamentId, matchId, result) => {
    const { data: tour } = await supabase
      .from("tournaments")
      .select("tournament_type, bracket_mode")
      .eq("id", tournamentId)
      .single();
    const isFriendly = (tour?.tournament_type || "free") === "free";
    const bracketMode = normalizeBracketMode(tour?.bracket_mode);

    const { data: match, error } = await supabase
      .from("matches")
      .update({
        ...buildWinnerUpdate(result.winnerId),
        score1: result.score1,
        score2: result.score2,
      })
      .eq("id", matchId)
      .select(`*, team1:team1_id(*), team2:team2_id(*)`)
      .single();

    if (error) throw new Error(error.message);

    const { data: tournamentMatches, error: matchesError } = await supabase
      .from("matches")
      .select("id, round, match_identifier, bracket_phase, team1_id, team2_id, team1_local_id, team2_local_id, winner_id, winner_local_id")
      .eq("tournament_id", tournamentId);

    if (matchesError) throw new Error(matchesError.message);

    const mainMatches = getMainBracketMatches(tournamentMatches || []);
    const r1MatchCount = getRoundOneMatchCountFromMatches(mainMatches);
    const advanceMap = buildBracketAdvanceMap(r1MatchCount);
    const hasNextRound = advanceMap.has(match.match_identifier);
    const winnerRef = getMatchWinnerRef(match);

    if (winnerRef && isRegisteredTeamRef(winnerRef)) {
      const winnerTeam = getRegisteredWinnerTeam(match, winnerRef);
      if (winnerTeam && !winnerTeam.is_guest) {
        const team1Ref = getMatchSideRef(match, 1);
        const isTeam1Winner = winnerRef === team1Ref;
        const loserTeam = isTeam1Winner ? match.team2 : match.team1;
        const loserName = loserTeam?.name;

        await teamService.addWin(
          winnerRef,
          isFriendly ? "Friendly" : "Match",
          `Defeated ${loserName || "Opponent"} (Round ${match.round})`
        );
      }
    }

    if (hasNextRound) {
      await advanceMatchWinner(tournamentId, match, r1MatchCount);
    } else if (winnerRef && isRegisteredTeamRef(winnerRef)) {
      const winnerTeam = getRegisteredWinnerTeam(match, winnerRef);
      if (winnerTeam && !winnerTeam.is_guest) {
        await teamService.addWin(
          winnerRef,
          isFriendly ? "Friendly" : "Tournament",
          isFriendly ? "Friendly tournament champion" : "Champion"
        );
      }
    }

    if (
      bracketMode === BRACKET_MODES.STANDARD &&
      (match.bracket_phase || "main") === "main"
    ) {
      await advanceLoserToConsolation(tournamentId, match, mainMatches);
    }

    invalidateTournamentCache();
  },

  notifyLocalTeamListChanged: async (tournamentId, user) => {
    await assertFreeTournamentCreator(tournamentId, user.id);
    await assertTournamentNotStarted(tournamentId);
    await markBracketChanged(tournamentId);
    invalidateTournamentCache();
  },

  applyBracketChanges: async (tournamentId, user, options = {}) => {
    await assertFreeTournamentCreator(tournamentId, user.id);
    await assertTournamentNotStarted(tournamentId);

    const { mode = "random", seedTeamIds = null, localCustomTeams = [] } = options;
    const participants = await fetchAllBracketParticipants(tournamentId, localCustomTeams);
    if (participants.length < MIN_TOURNAMENT_TEAMS) {
      throw new Error(`Add at least ${MIN_TOURNAMENT_TEAMS} teams before applying bracket changes.`);
    }

    const bracketMode = await fetchTournamentBracketMode(tournamentId);
    await regenerateFlexibleBracket(tournamentId, participants, { mode, seedTeamIds, bracketMode });
    await markBracketSynced(tournamentId);
    invalidateTournamentCache();
    return tournamentService.getTournamentById(tournamentId);
  },

  resetBracket: async (tournamentId, user, options = {}) => {
    await assertFreeTournamentCreator(tournamentId, user.id);

    const { mode = "random", seedTeamIds = null, localCustomTeams = [] } = options;
    const participants = await fetchAllBracketParticipants(tournamentId, localCustomTeams);
    if (participants.length < MIN_TOURNAMENT_TEAMS) {
      throw new Error(`Need at least ${MIN_TOURNAMENT_TEAMS} teams to reset the bracket.`);
    }

    const bracketMode = await fetchTournamentBracketMode(tournamentId);
    await regenerateFlexibleBracket(tournamentId, participants, { mode, seedTeamIds, bracketMode });
    await markBracketSynced(tournamentId);
    invalidateTournamentCache();
    return tournamentService.getTournamentById(tournamentId);
  },

  deleteTournament: async (id) => {
    const { data: joins } = await supabase
      .from("tournament_teams")
      .select("team_id, team:teams(id, is_guest)")
      .eq("tournament_id", id);

    const guestIds = (joins || [])
      .map((row) => row.team)
      .filter((team) => team?.is_guest)
      .map((team) => team.id);

    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (error) throw new Error(error.message);

    if (guestIds.length > 0) {
      await supabase.from("teams").delete().in("id", guestIds);
    }

    clearLocalCustomTeams(id);
    invalidateTournamentCache();
    return true;
  },
};
