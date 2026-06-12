import { isLocalTeamId } from "./localCustomTeamsStorage.js";

export function assignTeamRefToRow(row, slot, teamId) {
  const prefix = slot === "team1" ? "team1" : "team2";
  if (isLocalTeamId(teamId)) {
    row[`${prefix}_local_id`] = teamId;
    row[`${prefix}_id`] = null;
  } else {
    row[`${prefix}_id`] = teamId;
    row[`${prefix}_local_id`] = null;
  }
}

export function buildSlotUpdate(slot, teamId) {
  const prefix = slot === "team1" ? "team1" : "team2";
  if (isLocalTeamId(teamId)) {
    return { [`${prefix}_local_id`]: teamId, [`${prefix}_id`]: null };
  }
  return { [`${prefix}_id`]: teamId, [`${prefix}_local_id`]: null };
}

export function getMatchWinnerRef(match) {
  return match?.winner_id || match?.winner_local_id || null;
}

export function getMatchSideRef(match, side) {
  if (side === 1) return match?.team1_id || match?.team1_local_id || null;
  return match?.team2_id || match?.team2_local_id || null;
}

export function buildWinnerUpdate(winnerId) {
  if (isLocalTeamId(winnerId)) {
    return { winner_id: null, winner_local_id: winnerId };
  }
  return { winner_id: winnerId, winner_local_id: null };
}

export function isRegisteredTeamRef(teamId) {
  return Boolean(teamId) && !isLocalTeamId(teamId);
}
