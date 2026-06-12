const STORAGE_PREFIX = "allstar:guest-roster:";

function storageKey(tournamentId, teamId) {
  return `${STORAGE_PREFIX}${tournamentId}:${teamId}`;
}

function defaultRoster() {
  return { players: [], updatedAt: null };
}

export function loadGuestRoster(tournamentId, teamId) {
  if (typeof window === "undefined") return defaultRoster();
  try {
    const raw = localStorage.getItem(storageKey(tournamentId, teamId));
    if (!raw) return defaultRoster();
    const parsed = JSON.parse(raw);
    return {
      players: Array.isArray(parsed.players) ? parsed.players : [],
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return defaultRoster();
  }
}

export function saveGuestRoster(tournamentId, teamId, roster) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    storageKey(tournamentId, teamId),
    JSON.stringify({
      players: roster.players || [],
      updatedAt: Date.now(),
    }),
  );
}

export function clearGuestRoster(tournamentId, teamId) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(tournamentId, teamId));
}

export function createGuestPlayer(name) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    name,
    position: "Bench",
  };
}

export function guestPlayersToFieldMembers(players = []) {
  return players.map((player) => ({
    id: player.id,
    name: player.name,
    position: player.position || "Bench",
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "Player")}&background=random&size=128`,
    role: "Guest",
    isGuest: true,
  }));
}

export function moveGuestPlayer(players, playerId, newPosition) {
  const moving = players.find((player) => player.id === playerId);
  if (!moving) return players;

  const oldPosition = moving.position;
  const occupant = players.find(
    (player) => player.id !== playerId && player.position === newPosition,
  );

  return players.map((player) => {
    if (player.id === playerId) {
      return { ...player, position: newPosition };
    }
    if (occupant && player.id === occupant.id) {
      const swapTo =
        oldPosition !== "Bench" && oldPosition !== newPosition ? oldPosition : "Bench";
      return { ...player, position: swapTo };
    }
    return player;
  });
}

export function removeGuestPlayer(players, playerId) {
  return players.filter((player) => player.id !== playerId);
}

export function addGuestPlayer(players, name) {
  return [...players, createGuestPlayer(name)];
}
