import React from 'react';

const StatCard = ({ label, value, icon, change, color = 'var(--color-primary)' }) => (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ 
            width: '60px', height: '60px', borderRadius: '12px', 
            background: color, opacity: 0.9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem'
        }}>
            {icon}
        </div>
        <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>{label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', lineHeight: 1 }}>{value}</div>
            {/* Optional change indicator logic here */}
        </div>
    </div>
);

const DashboardStats = ({ stats }) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <StatCard icon="👥" label="Total Users" value={stats.usersCount} color="#3b82f6" />
            <StatCard icon="📍" label="Venues" value={stats.venuesCount} color="#8b5cf6" />
            <StatCard icon="🛡️" label="Teams" value={stats.teamsCount} color="#ec4899" />
            <StatCard icon="🏆" label="Tournaments" value={stats.tournamentsCount} color="#f59e0b" />
            <StatCard icon="📝" label="Pending Claims" value={stats.claimsCount} color="#10b981" />
        </div>
    );
};

export default DashboardStats;
