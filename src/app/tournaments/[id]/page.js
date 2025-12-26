"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import BracketView from "@/components/Tournament/BracketView";
import { tournamentService } from "@/services/tournamentService";
import { useAuth } from "@/context/AuthContext";
import { useParams } from 'next/navigation';

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
    <main style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <Navbar />
      <div className="container" style={{ paddingTop: '140px' }}>
         <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
           <h1 style={{ fontSize: '3rem', margin: 0 }}>{tournament.name}</h1>
           <div style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>{tournament.sport} Championship</div>
           {tournament.winner && (
             <div className="glass-panel" style={{ display: 'inline-block', padding: '1rem 2rem', marginTop: '2rem', border: '2px solid gold' }}>
               🏆 WINNER: <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{tournament.winner.name}</span> 🏆
             </div>
           )}
         </div>
         
         <div className="glass-panel" style={{ overflowX: 'auto' }}>
           <BracketView tournament={tournament} isAdmin={isAdmin} onUpdateResult={handleUpdate} />
         </div>
         
         {isAdmin && !tournament.winner && (
           <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
             Admin Controls: Click a team in the bracket to advance them to the next round.
           </p>
         )}
      </div>
    </main>
  );
}
