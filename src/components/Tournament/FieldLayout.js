"use client";
import React from 'react';

const FIELD_STYLES = {
  "Basketball": {
    // Hardwood floor, focused on Half Court
    background: 'linear-gradient(180deg, #d97736 0%, #c46210 100%)',
    border: '4px solid #333',
    lineColor: 'rgba(255,255,255,0.6)',
    slots: [
      { id: 'PG', label: 'PG', top: '82%', left: '50%' }, // Top of Key
      { id: 'SG', label: 'SG', top: '55%', left: '85%' }, // Right Wing (Deep)
      { id: 'SF', label: 'SF', top: '55%', left: '15%' }, // Left Wing (Deep)
      { id: 'PF', label: 'PF', top: '22%', left: '72%' }, // Right Low Block
      { id: 'C',  label: 'C',  top: '22%', left: '28%' }, // Left Low Block
    ]
  },
  "Soccer": {
    // Grass pitch, zoomed slightly to show formation clearly
    background: 'repeating-linear-gradient(0deg, #388E3C 0px, #388E3C 40px, #2E7D32 40px, #2E7D32 80px)',
    border: '4px solid white',
    lineColor: 'rgba(255,255,255,0.7)',
    slots: [
      { id: 'GK',  label: 'GK',  top: '90%', left: '50%' },
      { id: 'LB',  label: 'LB',  top: '70%', left: '15%' },
      { id: 'CB1', label: 'LCB', top: '75%', left: '40%' },
      { id: 'CB2', label: 'RCB', top: '75%', left: '60%' },
      { id: 'RB',  label: 'RB',  top: '70%', left: '85%' },
      { id: 'CDM', label: 'CDM', top: '55%', left: '50%' },
      { id: 'LM',  label: 'LW',  top: '35%', left: '15%' },
      { id: 'RM',  label: 'RW',  top: '35%', left: '85%' },
      { id: 'CAM', label: 'CAM', top: '40%', left: '50%' },
      { id: 'ST1', label: 'ST',  top: '15%', left: '50%' },
      { id: 'ST2', label: 'CF',  top: '25%', left: '50%' }, // Backup/Second striker
    ]
  },
  "Tennis": {
    background: '#4169E1',
    border: '4px solid white',
    lineColor: 'white',
    slots: [
      { id: 'P1', label: 'Server', top: '85%', left: '50%' }, // Baseline
    ]
  },
  "Volleyball": {
    background: '#F4A460',
    border: '4px solid white',
    lineColor: 'white',
    slots: [
      { id: 'P1', label: 'S', top: '85%', left: '80%' }, 
      { id: 'P6', label: 'L', top: '85%', left: '50%' }, 
      { id: 'P5', label: 'OH',top: '85%', left: '20%' }, 
      { id: 'P4', label: 'OH',top: '40%', left: '20%' }, 
      { id: 'P3', label: 'MB',top: '40%', left: '50%' }, 
      { id: 'P2', label: 'OPP',top: '40%', left: '80%' }, 
    ]
  },
  "Baseball": {
    background: 'radial-gradient(circle at 50% 100%, #C2B280 40%, #4CAF50 41%)', // Dirt diamond larger
    border: '4px solid #333',
    lineColor: 'rgba(255,255,255,0.5)',
    slots: [
       { id: 'C',  label: 'C',  top: '90%', left: '50%' },
       { id: 'P',  label: 'P',  top: '70%', left: '50%' },
       { id: '1B', label: '1B', top: '60%', left: '75%' },
       { id: '2B', label: '2B', top: '45%', left: '60%' },
       { id: 'SS', label: 'SS', top: '45%', left: '40%' },
       { id: '3B', label: '3B', top: '60%', left: '25%' },
       { id: 'LF', label: 'LF', top: '25%', left: '20%' },
       { id: 'CF', label: 'CF', top: '15%', left: '50%' },
       { id: 'RF', label: 'RF', top: '25%', left: '80%' },
    ]
  }
};

export default function FieldLayout({ sport, players, onDropPlayer, isOwner, onPlayerClick }) {
  const settings = FIELD_STYLES[sport] || FIELD_STYLES["Soccer"];
  const slots = settings.slots || [];

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, slotId) => {
    e.preventDefault();
    if (!isOwner) return;
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId) {
      onDropPlayer(playerId, slotId);
    }
  };
  
  const handleDragStart = (e, playerId) => {
    if (!isOwner) return;
    e.dataTransfer.setData("playerId", playerId);
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '600px', // Reverted to reasonable mobile width
      aspectRatio: '5/7', // Taller/Longer aspect ratio as requested
      background: settings.background,
      border: settings.border,
      borderRadius: '12px',
      position: 'relative',
      margin: '0 auto',
      boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)',
      overflow: 'hidden'
    }}>
      {/* ================= BASKETBALL MARKINGS (HALF COURT) ================= */}
      {sport === 'Basketball' && (
        <>
            {/* The Paint (Key) - 15ft depth approx 33% of 47ft */}
            <div style={{ position: 'absolute', top: '0', left: '35%', width: '30%', height: '33%', border: '2px solid rgba(255,255,255,0.5)', borderTop: 'none', background: 'rgba(0,0,0,0.1)' }} />
            {/* Free Throw Circle */}
            <div style={{ position: 'absolute', top: '33%', left: '35%', width: '30%', height: '18%', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%', transform: 'translateY(-50%)' }} />
            {/* 3 Point Arc - 23ft depth approx 50-60% */}
            <div style={{ position: 'absolute', top: '-10%', left: '5%', width: '90%', height: '60%', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '0 0 50% 50%', borderTop: 'none' }} />
            {/* Hoop / Backboard */}
            <div style={{ position: 'absolute', top: '4%', left: '45%', width: '10%', height: '2px', background: 'white' }} />
            <div style={{ position: 'absolute', top: '4.5%', left: '48.5%', width: '3%', height: '3%', border: '2px solid orange', borderRadius: '50%' }} />
        </>
      )}

      {/* ================= SOCCER MARKINGS (Formation View) ================= */}
      {sport === 'Soccer' && (
        <>
           {/* Center Circle (Top, assuming we see Attacking Half or Mid-to-Def) */}
           <div style={{ position: 'absolute', top: '-10%', left: '35%', width: '30%', height: '20%', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%' }} />
           <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '1px', background: 'rgba(255,255,255,0.5)' }} />
           
           {/* Penalty Box (Bottom) */}
           <div style={{ position: 'absolute', bottom: '0', left: '25%', width: '50%', height: '18%', border: '2px solid rgba(255,255,255,0.7)', borderBottom: 'none' }} />
           {/* 6 Yard Box */}
           <div style={{ position: 'absolute', bottom: '0', left: '40%', width: '20%', height: '6%', border: '2px solid rgba(255,255,255,0.7)', borderBottom: 'none' }} />
           {/* Penalty Spot */}
           <div style={{ position: 'absolute', bottom: '12%', left: '50%', width: '4px', height: '4px', background: 'white', borderRadius: '50%' }} />
        </>
      )}

      {/* ================= BASEBALL MARKINGS (Diamond Zoom) ================= */}
      {sport === 'Baseball' && (
        <>
           {/* Infield Diamond */}
           <div style={{ 
               position: 'absolute', 
               bottom: '0', 
               left: '50%', 
               width: '50%', 
               height: '50%', 
               background: '#C2B280', 
               transform: 'translate(-50%, 20%) rotate(45deg)',
               border: '2px solid rgba(255,255,255,0.5)',
               boxShadow: '0 0 20px rgba(0,0,0,0.5)'
           }} />
           {/* Pitcher's Mound */}
           <div style={{ position: 'absolute', bottom: '25%', left: '50%', width: '8%', height: '6%', background: '#C2B280', borderRadius: '50%', transform: 'translateX(-50%)', border: '1px solid white' }} />
        </>
      )}
      
      {/* Common Center Separation (Volleyball/Tennis) */}
      {(sport === 'Volleyball' || sport === 'Tennis') && (
          <div style={{ position: 'absolute', top: '30%', left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.8)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
      )}
      
      {/* Slots */}
      {slots.map((slot) => {
        const player = players.find(p => p.position === slot.id);

        return (
          <div 
            key={slot.id} 
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, slot.id)}
            style={{
              position: 'absolute',
              top: slot.top,
              left: slot.left,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '90px',
              height: '90px',
              zIndex: 10,
          }}>
            {player ? (
              <div 
                draggable={isOwner}
                onDragStart={(e) => handleDragStart(e, player.id)}
                onClick={() => onPlayerClick && onPlayerClick(player)}
                style={{ 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center' 
                }}
              >
                 <div style={{
                   width: '65px', height: '65px', borderRadius: '50%', overflow: 'hidden',
                   border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.4)', background: '#333'
                 }}>
                   <img src={player.avatar} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 </div>
                 <span style={{ 
                   background: 'rgba(0,0,0,0.8)', color: 'white', fontSize: '0.85rem', padding: '2px 8px',
                   borderRadius: '4px', marginTop: '4px', whiteSpace: 'nowrap', fontWeight: '600',
                   maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis'
                 }}>
                   {player.name}
                 </span>
                 <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px black', fontWeight: 'bold' }}>{slot.label}</span>
              </div>
            ) : (
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                border: '2px dashed rgba(255,255,255,0.6)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.15)'
              }}>
                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', textShadow: '0 1px 2px black' }}>{slot.label}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
