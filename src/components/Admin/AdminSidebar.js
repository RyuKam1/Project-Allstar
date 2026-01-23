import React from 'react';

const AdminSidebar = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'users', icon: '👥', label: 'Users' },
        { id: 'venues', icon: '📍', label: 'Venues' },
        { id: 'teams', icon: '🛡️', label: 'Teams' },
        { id: 'tournaments', icon: '🏆', label: 'Tournaments' },
        { id: 'claims', icon: '📝', label: 'Claims' },
    ];

    return (
        <div style={{ 
            width: '260px', 
            background: 'rgba(0,0,0,0.6)', 
            borderRight: '1px solid var(--border-glass)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            <h2 style={{ marginBottom: '20px', paddingLeft: '10px' }}>
                Admin <span className="primary-gradient-text" style={{fontSize: '1rem'}}>Panel</span>
            </h2>
            
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className="hover-bg"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        padding: '12px 15px',
                        background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: activeTab === tab.id ? 'black' : 'var(--text-secondary)',
                        fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        fontSize: '1rem'
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
                    {tab.label}
                </button>
            ))}

            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-glass)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="/" style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '15px',
                     padding: '12px 15px',
                     color: 'var(--text-muted)',
                     textDecoration: 'none',
                     borderRadius: '8px',
                     transition: 'all 0.2s'
                }} className="hover-bg">
                    <span>🏠</span> Home
                </a>
                <a href="/profile" style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '15px',
                     padding: '12px 15px',
                     color: 'var(--text-muted)',
                     textDecoration: 'none',
                     borderRadius: '8px',
                     transition: 'all 0.2s'
                }} className="hover-bg">
                    <span>👤</span> My Profile
                </a>
            </div>
        </div>
    );
};

export default AdminSidebar;
