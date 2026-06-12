import { sanitizeText } from "@/lib/security/inputSanitizer";

export function normalizeTeamName(name) {
  const cleaned = sanitizeText(name, 60);
  if (!cleaned) return "";
  return cleaned.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Ensure bracket rosters never contain duplicate display names.
 * Registered teams with the same name cannot both join; custom names cannot
 * collide with any team already in the bracket.
 */
export function validateBracketRoster({ teams = [], customNames = [], allowCustom = true }) {
  const errors = [];
  const nameKeys = new Set();
  const ids = new Set();

  for (const team of teams) {
    if (!team?.id) continue;
    if (ids.has(team.id)) {
      errors.push(`"${team.name}" is selected more than once.`);
      continue;
    }
    ids.add(team.id);

    const key = normalizeTeamName(team.name);
    if (!key) continue;
    if (nameKeys.has(key)) {
      errors.push(`Team name "${team.name}" is already in this bracket. Pick a different team.`);
    } else {
      nameKeys.add(key);
    }
  }

  if (allowCustom) {
    const seenCustom = new Set();
    for (const raw of customNames) {
      const name = sanitizeText(raw, 60);
      if (!name) continue;
      const key = normalizeTeamName(name);
      if (seenCustom.has(key)) {
        errors.push(`Custom team "${name}" is listed more than once.`);
        continue;
      }
      seenCustom.add(key);
      if (nameKeys.has(key)) {
        errors.push(`"${name}" matches a team already in this bracket.`);
      } else {
        nameKeys.add(key);
      }
    }
  }

  return { ok: errors.length === 0, errors, nameKeys };
}

export function isTeamNameTakenInBracket(name, { teams = [], customNames = [] }) {
  const key = normalizeTeamName(name);
  if (!key) return false;
  for (const t of teams) {
    if (normalizeTeamName(t.name) === key) return true;
  }
  for (const n of customNames) {
    if (normalizeTeamName(n) === key) return true;
  }
  return false;
}

export function canSelectRegisteredTeam(team, { teams = [], customNames = [] }) {
  if (teams.some((t) => t.id === team.id)) return true;
  const key = normalizeTeamName(team.name);
  if (!key) return true;
  const taken = new Set();
  teams.forEach((t) => {
    const k = normalizeTeamName(t.name);
    if (k) taken.add(k);
  });
  customNames.forEach((n) => {
    const k = normalizeTeamName(n);
    if (k) taken.add(k);
  });
  return !taken.has(key);
}
