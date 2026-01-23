"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import AdminSidebar from "@/components/Admin/AdminSidebar";
import DashboardStats from "@/components/Admin/DashboardStats";
import { authService } from "@/services/authService";
import { teamService } from "@/services/teamService";
import { tournamentService } from "@/services/tournamentService";
import { venueService } from "@/services/venueService";
import { businessService } from "@/services/businessService";
import { useRouter } from 'next/navigation';

// Placeholder for Detail Views (We can extract these to separate files if they grow)
/* eslint-disable react/display-name */

// Generic Table Component
const DataTable = ({ columns, data, onEdit, onDelete, actions }) => {
    const [search, setSearch] = useState('');
    const filteredData = data.filter(item => 
        Object.values(item).some(val => 
            String(val).toLowerCase().includes(search.toLowerCase())
        )
    );

    return (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between' }}>
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white', width: '300px' }}
                />
                <div style={{ color: 'var(--text-muted)' }}>{filteredData.length} entries</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <tr>
                            {columns.map(col => <th key={col.key} style={{ padding: '1rem' }}>{col.label}</th>)}
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((item, idx) => (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                {columns.map(col => (
                                    <td key={col.key} style={{ padding: '1rem' }}>
                                        {col.render ? col.render(item) : item[col.key]}
                                    </td>
                                ))}
                                <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    {actions && actions(item)}
                                    {onEdit && <button onClick={() => onEdit(item)} className="btn-icon">✏️</button>}
                                    {onDelete && <button onClick={() => onDelete(item)} className="btn-icon-danger">🗑️</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default function AdminPage() {
    const router = useRouter();
    // Default to 'dashboard' but wait for mount/searchParams to be sure
    const [activeTab, setActiveTabState] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ users: [], teams: [], tournaments: [], venues: [], claims: [] });
    const [currentUser, setCurrentUser] = useState(null);

    // Sync state with URL params manually to avoid hook complexity if we wanted, 
    // but using window.location or searchParams is standard.
    // We'll use a simple useEffect on mount to read URL, and router.push on change.
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab) setActiveTabState(tab);
        }
        loadData();
        checkUser();
    }, []);

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        router.push(`?tab=${tab}`, { scroll: false });
    };

    const checkUser = async () => {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // Use allSettled to prevent one failure from blocking all data
            const results = await Promise.allSettled([
                authService.getAllUsers(),
                teamService.getAllTeams(),
                tournamentService.getAllTournaments(),
                venueService.getAllVenues(),
                businessService.getAllClaims()
            ]);

            const [usersRes, teamsRes, tournRes, venuesRes, claimsRes] = results;

            // Log errors for debugging
            if (usersRes.status === 'rejected') console.error("Users load failed:", usersRes.reason);
            if (teamsRes.status === 'rejected') console.error("Teams load failed:", teamsRes.reason);
            if (tournRes.status === 'rejected') console.error("Tourn load failed:", tournRes.reason);
            if (venuesRes.status === 'rejected') console.error("Venues load failed:", venuesRes.reason);
            if (claimsRes.status === 'rejected') console.error("Claims load failed:", claimsRes.reason);

            setData({ 
                users: usersRes.status === 'fulfilled' ? usersRes.value : [], 
                teams: teamsRes.status === 'fulfilled' ? teamsRes.value : [], 
                tournaments: tournRes.status === 'fulfilled' ? tournRes.value : [], 
                venues: venuesRes.status === 'fulfilled' ? venuesRes.value : [], 
                claims: claimsRes.status === 'fulfilled' ? claimsRes.value : [] 
            });
        } catch (e) {
            console.error("Admin load critical error", e);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---
    const handleDelete = async (type, id) => {
        if (!confirm("Are you sure? This is irreversible.")) return;
        try {
            if (type === 'team') await teamService.deleteTeam(id);
            if (type === 'tournament') await tournamentService.deleteTournament(id);
            if (type === 'venue') await venueService.deleteVenue(id);
            // User deletion skipped for now per prev instructions constraint
            loadData(); // Refresh
        } catch (e) {
            alert("Error: " + e.message);
        }
    };

    const handleClaim = async (claimId, status) => {
        try {
            await businessService.resolveClaim(claimId, status);
            loadData();
        } catch (e) {
            alert("Error: " + e.message);
        }
    };

    // --- Renderers ---
    const renderContent = () => {
        if (loading) return <div className="loading-spinner"></div>;

        // Header for the panel content with Refresh Button
        const PanelHeader = ({ title }) => (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>{title}</h2>
                <button 
                    onClick={loadData}
                    className="hover-bg"
                    style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--border-glass)', 
                        borderRadius: '6px', 
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    🔄 Refresh Data
                </button>
            </div>
        );

        switch (activeTab) {
            case 'dashboard':
                return (
                    <div>
                        <PanelHeader title="System Overview" />
                        <DashboardStats stats={{
                            usersCount: data.users.length,
                            teamsCount: data.teams.length,
                            tournamentsCount: data.tournaments.length,
                            venuesCount: data.venues.length,
                            claimsCount: data.claims.filter(c => c.status === 'pending').length
                        }} />
                        {/* Recent Activity / Quick Actions could go here */}
                    </div>
                );
            case 'users':
                return (
                    <div>
                        <PanelHeader title="User Management" />
                         <DataTable 
                            columns={[
                                { key: 'name', label: 'Name', render: u => <div style={{fontWeight:'bold'}}>{u.name}</div> },
                                { key: 'email', label: 'Email' },
                                { key: 'role', label: 'Role', render: u => <span className={`badge badge-${u.role || 'user'}`}>{(u.role || 'User').toUpperCase()}</span> },
                                { key: 'created_at', label: 'Joined', render: u => new Date(u.created_at || Date.now()).toLocaleDateString() }
                            ]}
                            data={data.users}
                            // onEdit={(u) => alert("Edit User ID: " + u.id)}
                            onDelete={(u) => alert("Deletion Disabled for safety in this demo")}
                         />
                    </div>
                );
            case 'venues':
                return (
                    <div>
                        <PanelHeader title="Venue Management" />
                        <DataTable 
                            columns={[
                                { key: 'name', label: 'Venue' },
                                { key: 'sport', label: 'Sport' },
                                { key: 'location', label: 'Location' },
                                { key: 'owner_id', label: 'Status', render: v => v.owner_id ? <span style={{color:'#4ade80'}}>Owner Claimed</span> : <span style={{color:'#9ca3af'}}>Unclaimed</span> }
                            ]}
                            data={data.venues}
                            onDelete={(v) => handleDelete('venue', v.id)}
                            actions={(v) => (
                                <button className="btn-secondary" style={{fontSize:'0.8rem', padding:'5px 10px'}} onClick={() => window.open(`/venues/${v.id}`, '_blank')}>View</button>
                            )}
                        />
                    </div>
                );
            case 'teams':
                return (
                    <div>
                         <PanelHeader title="Team Registry" />
                        <DataTable 
                            columns={[
                                { key: 'name', label: 'Team Name' },
                                { key: 'sport', label: 'Sport' },
                                { key: 'members', label: 'Size', render: t => t.members?.length || 0 }
                            ]}
                            data={data.teams}
                            onDelete={(t) => handleDelete('team', t.id)}
                        />
                    </div>
                );
            case 'claims':
                return (
                    <div>
                        <PanelHeader title="Business Verification Requests" />
                         <DataTable 
                            columns={[
                                { key: 'business_name', label: 'Business' },
                                { key: 'requester', label: 'Requester', render: c => c.profile?.name || c.contact_email },
                                { key: 'venue', label: 'Target Venue', render: c => c.venue?.name || 'Unknown Venue' },
                                { key: 'status', label: 'Status', render: c => (
                                    <span style={{ 
                                        color: c.status === 'pending' ? '#f59e0b' : c.status === 'approved' ? '#4ade80' : '#ef4444',
                                        fontWeight: 'bold' 
                                    }}>{c.status.toUpperCase()}</span>
                                )}
                            ]}
                            data={data.claims}
                            actions={(c) => c.status === 'pending' && (
                                <>
                                    <button onClick={() => handleClaim(c.id, 'approved')} style={{ background: '#064e3b', color: '#6ee7b7', border:'none', borderRadius:'4px', padding:'5px 10px', marginRight:'5px', cursor:'pointer' }}>Approve</button>
                                    <button onClick={() => handleClaim(c.id, 'rejected')} style={{ background: '#450a0a', color: '#fca5a5', border:'none', borderRadius:'4px', padding:'5px 10px', cursor:'pointer' }}>Reject</button>
                                </>
                            )}
                         />
                    </div>
                );
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <main style={{ minHeight: '100vh', display: 'flex' }}>
            {/* Sidebar only visible on desktop usually, but for admin we force it */}
            <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
            
            <div style={{ flex: 1, padding: '40px', background: 'var(--background)', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                         {/* Empty Left Header Space or Breadcrumb */}
                    </div>

                    {currentUser && (
                        <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentUser.role === 'admin' ? '#4ade80' : '#f59e0b' }}></div>
                            <span style={{opacity: 0.8}}>{currentUser.name} ({currentUser.role || 'user'})</span>
                        </div>
                    )}
                </div>
                {renderContent()}
            </div>
        </main>
    );
}
