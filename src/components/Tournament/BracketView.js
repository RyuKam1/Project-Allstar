"use client";
import React from 'react';

export default function BracketView({ tournament, onUpdateResult, isAdmin }) {
  const rounds = [];
  const matches = tournament.matches;
  
  // Group by round
  matches.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });

  return (
    <div style={{ display: 'flex', gap: '4rem', overflowX: 'auto', padding: '2rem 0' }}>
      {rounds.map((roundMatches, rIdx) => {
        if (!roundMatches) return null;
        return (
          <div key={rIdx} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '2rem' }}>
             <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>
               {rIdx === rounds.length - 1 ? 'Final' : `Round ${rIdx}`}
             </h3>
             {roundMatches.map(match => (
               <MatchCard 
                 key={match.id} 
                 match={match} 
                 isAdmin={isAdmin} 
                 onUpdate={(result) => onUpdateResult(match.id, result)} 
               />
             ))}
          </div>
        )
      })}
    </div>
  );
}

function MatchCard({ match, isAdmin, onUpdate }) {
  const t1 = match.team1;
  const t2 = match.team2;

  const handleWin = (team) => {
    if (!isAdmin || match.winnerId) return;
    const confirmWin = confirm(`Declare ${team.name} as winner?`);
    if (confirmWin) {
      onUpdate({ winnerId: team.id, score1: 0, score2: 0 }); // Score logic simplified
    }
  };

  return (
    <div className="glass-panel" style={{ width: '250px', padding: '10px', position: 'relative' }}>
      {/* Connector lines could go here via CSS pseudo elements */}
      <div style={{ padding: '8px', background: match.winnerId === t1?.id ? 'rgba(16, 185, 129, 0.2)' : 'transparent', borderLeft: `4px solid ${match.winnerId === t1?.id ? '#10B981' : 'transparent'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{t1 ? t1.name : 'TBD'}</span>
          {isAdmin && !match.winnerId && t1 && t2 && <button onClick={() => handleWin(t1)} style={{ fontSize: '0.7rem', cursor: 'pointer' }}>Win</button>}
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />
      <div style={{ padding: '8px', background: match.winnerId === t2?.id ? 'rgba(16, 185, 129, 0.2)' : 'transparent', borderLeft: `4px solid ${match.winnerId === t2?.id ? '#10B981' : 'transparent'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
           <span>{t2 ? t2.name : 'TBD'}</span>
           {isAdmin && !match.winnerId && t1 && t2 && <button onClick={() => handleWin(t2)} style={{ fontSize: '0.7rem', cursor: 'pointer' }}>Win</button>}
        </div>
      </div>
    </div>
  );
}
