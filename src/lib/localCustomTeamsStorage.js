import { sanitizeText } from "./security/inputSanitizer.js";

const TEAMS_PREFIX = "allstar:local-custom-teams:";

export function isLocalTeamId(id) {
  return typeof id === "string" && id.startsWith("local-");
}

export function createLocalTeamId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function toLocalTeamRecord({ id, name }) {
  return {
    id,
    name,
    is_local: true,
    is_guest: true,
    logo: null,
  };
}

function teamsKey(tournamentId) {
  return `${TEAMS_PREFIX}${tournamentId}`;
}

function defaultTeamsPayload() {
  return { teams: [], updatedAt: null };
}

export function loadLocalCustomTeams(tournamentId) {
  if (typeof window === "undefined" || !tournamentId) return [];
  try {
    const raw = localStorage.getItem(teamsKey(tournamentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.teams)
      ? parsed.teams
          .map((team) => ({
            id: team.id,
            name: sanitizeText(team.name, 60),
          }))
          .filter((team) => team.id && team.name)
      : [];
  } catch {
    return [];
  }
}

export function saveLocalCustomTeams(tournamentId, teams = []) {
  if (typeof window === "undefined" || !tournamentId) return;
  localStorage.setItem(
    teamsKey(tournamentId),
    JSON.stringify({
      teams: teams.map((team) => ({
        id: team.id,
        name: sanitizeText(team.name, 60),
      })).filter((team) => team.id && team.name),
      updatedAt: Date.now(),
    }),
  );
}

export function clearLocalCustomTeams(tournamentId) {
  if (typeof window === "undefined" || !tournamentId) return;
  localStorage.removeItem(teamsKey(tournamentId));
}

export function addLocalCustomTeam(tournamentId, rawName) {
  const name = sanitizeText(rawName, 60);
  if (!name) throw new Error("Team name is required");

  const teams = loadLocalCustomTeams(tournamentId);
  const key = name.toLowerCase();
  if (teams.some((team) => team.name.toLowerCase() === key)) {
    throw new Error(`"${name}" is already in this bracket.`);
  }

  const created = { id: createLocalTeamId(), name };
  saveLocalCustomTeams(tournamentId, [...teams, created]);
  return created;
}

export function removeLocalCustomTeam(tournamentId, teamId) {
  const teams = loadLocalCustomTeams(tournamentId);
  saveLocalCustomTeams(
    tournamentId,
    teams.filter((team) => team.id !== teamId),
  );
}

export function renameLocalCustomTeam(tournamentId, teamId, rawName) {
  const name = sanitizeText(rawName, 60);
  if (!name) throw new Error("Team name is required");

  const teams = loadLocalCustomTeams(tournamentId);
  const key = name.toLowerCase();
  if (teams.some((team) => team.id !== teamId && team.name.toLowerCase() === key)) {
    throw new Error(`"${name}" matches a team already in this bracket.`);
  }

  saveLocalCustomTeams(
    tournamentId,
    teams.map((team) => (team.id === teamId ? { ...team, name } : team)),
  );
}

function resolveLocalTeam(localById, localId, fallbackName = "Custom team") {
  if (!localId) return null;
  return (
    localById.get(localId) ||
    toLocalTeamRecord({ id: localId, name: fallbackName })
  );
}

/** Attach local pickup teams and hydrate match slots stored as local IDs. */
export function mergeTournamentWithLocalData(tournament) {
  if (!tournament) return tournament;

  const localTeams = loadLocalCustomTeams(tournament.id).map(toLocalTeamRecord);
  const localById = new Map(localTeams.map((team) => [team.id, team]));

  const registeredTeams = (tournament.teams || []).filter(
    (team) => !team?.is_guest && !isLocalTeamId(team?.id),
  );
  const legacyGuestTeams = (tournament.teams || []).filter((team) => team?.is_guest);
  const mergedTeams = [...registeredTeams, ...legacyGuestTeams, ...localTeams];

  const matches = (tournament.matches || []).map((match) => {
    const next = { ...match };

    if (match.team1_local_id) {
      next.team1 = resolveLocalTeam(localById, match.team1_local_id);
    }
    if (match.team2_local_id) {
      next.team2 = resolveLocalTeam(localById, match.team2_local_id);
    }

    if (match.winner_local_id) {
      next.winner = resolveLocalTeam(localById, match.winner_local_id);
    } else if (match.winner_id && !next.winner) {
      next.winner =
        [next.team1, next.team2, match.team1, match.team2].find(
          (team) => team?.id === match.winner_id,
        ) || null;
    }

    return next;
  });

  return {
    ...tournament,
    teams: mergedTeams,
    matches,
  };
}
