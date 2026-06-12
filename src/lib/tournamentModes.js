export const BRACKET_MODES = {
  SHORT: "short",
  STANDARD: "standard",
};

export const BRACKET_MODE_OPTIONS = [
  {
    value: BRACKET_MODES.STANDARD,
    label: "Full tournament",
    badge: "Default",
    summary: "Single elimination with a 3rd-place match. Built for real events.",
    details: [
      "Main bracket plus bronze / consolation match",
      "Seeded or random draw",
      "Double-elimination and round robin — planned",
    ],
  },
  {
    value: BRACKET_MODES.SHORT,
    label: "Short tournament",
    badge: "Quick",
    summary: "Strict single elimination. One loss and you're out.",
    details: [
      "Minimum 4 teams, head-to-head every round",
      "Winners advance only after you record a result",
      "No consolation or second-chance brackets",
    ],
  },
];

export function normalizeBracketMode(value) {
  return value === BRACKET_MODES.SHORT ? BRACKET_MODES.SHORT : BRACKET_MODES.STANDARD;
}

export function isShortBracketMode(tournament) {
  return normalizeBracketMode(tournament?.bracket_mode) === BRACKET_MODES.SHORT;
}

export function isStandardBracketMode(tournament) {
  return !isShortBracketMode(tournament);
}

export function getBracketModeLabel(tournament) {
  return isShortBracketMode(tournament) ? "Short tournament" : "Full tournament";
}

export function getBracketModeMeta(mode) {
  const normalized = normalizeBracketMode(mode);
  return (
    BRACKET_MODE_OPTIONS.find((option) => option.value === normalized) ||
    BRACKET_MODE_OPTIONS[0]
  );
}
