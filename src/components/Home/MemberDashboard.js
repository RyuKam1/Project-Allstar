"use client";
import Link from 'next/link';

export default function MemberDashboard({ user }) {
  // Mock upcoming activity
  const nextMatch = {
    title: "Summer League Finals",
    time: "Tomorrow, 6:00 PM",
    location: "Downtown Arena",
    team: "Red Dragons"
  };

  return (
    <div className="container section">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Good Afternoon, {user.name || 'Athlete'}</h1>
        <p className="text-caption">Let's get back in the game.</p>
      </div>

      {/* Main Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '2rem' 
      }}>
        
        {/* Col 1: Next Activity (Hero Card) */}
        <div className="card card-elevated" style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, var(--color-brand), #4338ca)', color: 'white', border: 'none' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>NEXT MATCH</span>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{nextMatch.title}</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                   <span>📍 {nextMatch.location}</span>
                   <span>⏰ {nextMatch.time}</span>
                </div>
              </div>
              <button className="glass-panel" style={{ 
                padding: '0.5rem 1rem', borderRadius: '99px', 
                background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', cursor: 'pointer' 
              }}>
                View Details
              </button>
           </div>
        </div>

        {/* Col 2: Quick Actions */}
        <div className="card">
           <h3>Quick Actions</h3>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <Link href="/venues" className="btn-secondary" style={{ borderRadius: '12px', justifyContent: 'flex-start' }}>
                 🏟 Find Venue
              </Link>
              <Link href="/teams" className="btn-secondary" style={{ borderRadius: '12px', justifyContent: 'flex-start' }}>
                 👥 My Teams
              </Link>
              <Link href="/events" className="btn-secondary" style={{ borderRadius: '12px', justifyContent: 'flex-start' }}>
                 🏆 Events
              </Link>
              <Link href="/profile" className="btn-secondary" style={{ borderRadius: '12px', justifyContent: 'flex-start' }}>
                 ⚙ Settings
              </Link>
           </div>
        </div>

        {/* Col 3: Stats / Feed */}
        <div className="card">
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Recent Activity</h3>
              <a href="#" style={{ color: 'var(--color-brand)', textDecoration: 'none', fontSize: '0.9rem' }}>View All</a>
           </div>
           <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[1, 2, 3].map((_, i) => (
                <li key={i} style={{ 
                    padding: '0.75rem 0', 
                    borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
                    display: 'flex', gap: '1rem', alignItems: 'center'
                }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--color-surface-base)', borderRadius: '50%' }}></div>
                    <div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Won match vs Tigers</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>2 hours ago</div>
                    </div>
                </li>
              ))}
           </ul>
        </div>

      </div>
    </div>
  );
}
