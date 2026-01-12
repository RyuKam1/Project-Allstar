"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import BracketView from "@/components/Tournament/BracketView";
import { tournamentService } from "@/services/tournamentService";
import { useAuth } from "@/context/AuthContext";
import { useParams } from 'next/navigation';
import styles from './tournaments.module.css';

export default function TournamentDetails() {
  const params = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) loadTour();
  }, [params?.id]);

  const loadTour = async () => {
    const data = await tournamentService.getTournament(params.id);
    setTournament(data);
    setLoading(false);
  };

  const handleUpdate = async (matchId, result) => {
    const updated = await tournamentService.updateMatch(tournament.id, matchId, result);
    setTournament(updated);
  };

  if (loading) return <div>Loading...</div>;
  if (!tournament) return <div>Not Found</div>;

  const isAdmin = user && user.id === tournament.creatorId;

  return (
    <main className={styles.main}>
      <Navbar />
      <div className="container">
         <div className={styles.header}>
           <h1 className={styles.title}>{tournament.name}</h1>
           <div className={styles.subtitle}>{tournament.sport} Championship</div>
           {tournament.winner && (
             <div className={`glass-panel ${styles.winnerCard}`}>
               🏆 <span style={{ color: '#888' }}>WINNER:</span> 
                <span className={styles.winnerName}>{tournament.winner.name}</span> 🏆
             </div>
           )}
         </div>
         
         <div className={`glass-panel ${styles.bracketContainer}`}>
           <BracketView tournament={tournament} isAdmin={isAdmin} onUpdateResult={handleUpdate} />
         </div>
         
         {isAdmin && !tournament.winner && (
           <p className={styles.adminTip}>
             <strong>Admin Controls:</strong> Click a team in the bracket to advance them to the next round.
           </p>
         )}
      </div>
    </main>
  );
}
