"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Layout/Navbar";
import FieldLayout from "@/components/Tournament/FieldLayout";
import Icon from "@/components/UI/Icon";
import { tournamentService } from "@/services/tournamentService";
import { useAuth } from "@/context/AuthContext";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import {
  addGuestPlayer,
  guestPlayersToFieldMembers,
  loadGuestRoster,
  moveGuestPlayer,
  removeGuestPlayer,
  saveGuestRoster,
} from "@/lib/guestTeamRosterStorage";
import {
  isLocalTeamId,
  loadLocalCustomTeams,
  mergeTournamentWithLocalData,
  renameLocalCustomTeam,
  toLocalTeamRecord,
} from "@/lib/localCustomTeamsStorage";
import { Breadcrumbs, EmptyState, Skeleton, Tag, Button } from "@/components/UI/primitives";
import styles from "./custom-team-roster.module.css";

function getTeamInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

export default function CustomTeamRosterPage() {
  const params = useParams();
  const { user } = useAuth();
  const { notify } = useNotificationCenter();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const team = useMemo(() => {
    if (isLocalTeamId(params.teamId)) {
      return (
        loadLocalCustomTeams(params.id)
          .map(toLocalTeamRecord)
          .find((entry) => entry.id === params.teamId) || null
      );
    }
    return tournament?.teams?.find((entry) => entry.id === params.teamId) || null;
  }, [tournament, params.id, params.teamId]);

  const isCreator = user && tournament && user.id === tournament.creator_id;
  const canEdit = Boolean(isCreator);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await tournamentService.getTournamentById(params.id);
        setTournament(mergeTournamentWithLocalData(data || null));
      } catch {
        setTournament(null);
      } finally {
        setLoading(false);
      }
    }
    if (params?.id) load();
  }, [params?.id]);

  useEffect(() => {
    if (!params?.id || !params?.teamId) return;
    const roster = loadGuestRoster(params.id, params.teamId);
    setPlayers(roster.players);
  }, [params?.id, params?.teamId]);

  useEffect(() => {
    if (team) setRenameValue(team.name);
  }, [team?.id, team?.name]);

  const persistPlayers = (nextPlayers) => {
    setPlayers(nextPlayers);
    saveGuestRoster(params.id, params.teamId, { players: nextPlayers });
  };

  const members = useMemo(() => guestPlayersToFieldMembers(players), [players]);
  const benchPlayers = members.filter((member) => member.position === "Bench");

  const handleAddPlayer = (event) => {
    event.preventDefault();
    if (!canEdit) return;
    const trimmed = playerName.trim();
    if (!trimmed) return;
    persistPlayers(addGuestPlayer(players, trimmed));
    setPlayerName("");
    notify(`Added ${trimmed} to the bench.`, "success");
  };

  const handleDropPlayer = (playerId, newPosition) => {
    if (!canEdit) return;
    persistPlayers(moveGuestPlayer(players, playerId, newPosition));
  };

  const handleDropToBench = (event) => {
    event.preventDefault();
    if (!canEdit) return;
    const playerId = event.dataTransfer.getData("playerId");
    if (playerId) {
      persistPlayers(moveGuestPlayer(players, playerId, "Bench"));
    }
  };

  const handleDragStart = (event, playerId) => {
    if (!canEdit) return;
    event.dataTransfer.setData("playerId", playerId);
  };

  const handleRemovePlayer = () => {
    if (!canEdit || !selectedPlayer) return;
    persistPlayers(removeGuestPlayer(players, selectedPlayer.id));
    setSelectedPlayer(null);
    notify("Player removed.", "info");
  };

  const handleRename = async (event) => {
    event.preventDefault();
    if (!canEdit || !team) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === team.name) return;

    setRenaming(true);
    try {
      if (isLocalTeamId(team.id)) {
        renameLocalCustomTeam(params.id, team.id, trimmed);
        await tournamentService.notifyLocalTeamListChanged(params.id, user);
        const updated = await tournamentService.getTournamentById(params.id);
        setTournament(mergeTournamentWithLocalData(updated));
      }
      setRenameValue(trimmed);
      notify("Team name updated on this device.", "success");
    } catch (err) {
      notify(err.message || "Could not rename team.", "error");
    } finally {
      setRenaming(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <Navbar />
        <div className={`container ${styles.pageTop}`}>
          <Skeleton width="30%" height={14} style={{ marginBottom: "1rem" }} />
          <Skeleton height={120} style={{ marginBottom: "1.5rem", borderRadius: "12px" }} />
          <Skeleton height={320} style={{ borderRadius: "12px" }} />
        </div>
      </main>
    );
  }

  if (!tournament || !team || (!team.is_local && !team.is_guest)) {
    return (
      <main className={styles.main}>
        <Navbar />
        <div className={`container ${styles.notFoundWrap}`}>
          <EmptyState
            icon="users"
            title="Custom team not found"
            description="This pickup squad may have been removed from the tournament."
            actionLabel="Back to tournament"
            actionHref={`/tournaments/${params.id}`}
          />
        </div>
      </main>
    );
  }

  const breadcrumbRoot =
    (tournament.tournament_type || "free") === "free"
      ? { label: "My tournaments", href: "/profile/tournaments" }
      : { label: "Tournaments", href: "/tournaments" };

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={`container ${styles.pageTop}`}>
        <Link href={`/tournaments/${params.id}`} className={styles.backLink}>
          ← Back to tournament
        </Link>

        <Breadcrumbs
          items={[
            breadcrumbRoot,
            { label: tournament.name, href: `/tournaments/${params.id}` },
            { label: team.name },
          ]}
        />

        {!canEdit && (
          <p className={styles.readOnlyBanner}>
            Viewing a local pickup roster. Only the tournament creator can edit players and positions.
          </p>
        )}

        <div className={`glass-panel ticket-card ${styles.header}`}>
          <div className={styles.teamMark} aria-hidden="true">
            {getTeamInitial(team.name)}
          </div>
          <div className={styles.headerMain}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{team.name}</h1>
              <Tag className={styles.tag}>Custom team</Tag>
              <Tag className={styles.tag}>{tournament.sport}</Tag>
            </div>
            <p className={styles.description}>
              Local pickup roster for this friendly bracket — saved in your browser, not on the public
              Teams directory.
            </p>
            {canEdit && (
              <form className={styles.renameForm} onSubmit={handleRename}>
                <input
                  type="text"
                  value={renameValue}
                  maxLength={60}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className={styles.renameInput}
                  aria-label="Team name"
                />
                <Button type="submit" loading={renaming} disabled={renaming || !renameValue.trim()}>
                  Save name
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className={styles.layout}>
          <div>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Lineup</h2>
              {canEdit && <span className={styles.ownerHint}>Drag players onto positions</span>}
            </div>
            <FieldLayout
              sport={tournament.sport}
              players={members}
              onDropPlayer={handleDropPlayer}
              isOwner={canEdit}
              onPlayerClick={setSelectedPlayer}
            />
          </div>

          <div onDragOver={(e) => e.preventDefault()} onDrop={handleDropToBench}>
            <div className={`glass-panel ${styles.benchPanel}`}>
              <h2 className={styles.sectionTitle}>Bench / Roster</h2>
              <ul className={styles.benchList}>
                {benchPlayers.length === 0 && (
                  <li className={styles.emptyBench}>No bench players yet.</li>
                )}
                {benchPlayers.map((member) => (
                  <li
                    key={member.id}
                    draggable={canEdit}
                    onDragStart={(e) => handleDragStart(e, member.id)}
                    onClick={() => setSelectedPlayer(member)}
                    className={styles.memberItem}
                  >
                    <img src={member.avatar} alt="" className={styles.memberAvatar} />
                    <div>
                      <div className={styles.memberName}>{member.name}</div>
                      <div className={styles.memberRole}>Guest player</div>
                    </div>
                    {canEdit && <span className={styles.dragHandle}>:::</span>}
                  </li>
                ))}
              </ul>

              {canEdit && (
                <form className={styles.addPlayerForm} onSubmit={handleAddPlayer}>
                  <input
                    type="text"
                    value={playerName}
                    maxLength={40}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Player name"
                    className={styles.addPlayerInput}
                    aria-label="Player name"
                  />
                  <Button type="submit" disabled={!playerName.trim()}>
                    Add player
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedPlayer && (
        <div className={styles.playerModalOverlay} onClick={() => setSelectedPlayer(null)}>
          <div
            className={`glass-panel ${styles.playerModal}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-player-title"
          >
            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={() => setSelectedPlayer(null)}
              aria-label="Close"
            >
              <Icon name="x" size={16} />
            </button>
            <h2 id="guest-player-title" className={styles.modalPlayerName}>
              {selectedPlayer.name}
            </h2>
            <p className={styles.modalPlayerMeta}>
              Position: {selectedPlayer.position === "Bench" ? "Bench" : selectedPlayer.position}
            </p>
            {canEdit && (
              <Button
                fullWidth
                className={styles.removePlayerBtn}
                onClick={handleRemovePlayer}
              >
                Remove player
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
