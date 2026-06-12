import React from 'react';
import Link from 'next/link';
import Icon from '@/components/UI/Icon';
import styles from './admin-sidebar.module.css';

const AdminSidebar = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'users', icon: 'users', label: 'Users' },
        { id: 'venues', icon: 'location', label: 'Venues' },
        { id: 'teams', icon: 'shield', label: 'Teams' },
        { id: 'tournaments', icon: 'trophy', label: 'Tournaments' },
        { id: 'claims', icon: 'document', label: 'Claims' },
        { id: 'proposals', icon: 'location', label: 'Venue Proposals' },
        { id: 'reports', icon: 'warning', label: 'Review Reports' },
        { id: 'locreports', icon: 'warning', label: 'Location Reports' },
        { id: 'eventreports', icon: 'warning', label: 'Event Reports' },
        { id: 'duplicates', icon: 'location', label: 'Duplicates' },
    ];

    return (
        <div className={styles.sidebar}>
            <h2 className={styles.heading}>
                Admin <span className={`primary-gradient-text ${styles.headingAccent}`}>Panel</span>
            </h2>
            
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`${styles.tabButton} hover-bg ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
                >
                    <Icon name={tab.icon} size={20} className="icon-inline" />
                    {tab.label}
                </button>
            ))}

            <div className={styles.footerLinks}>
                <Link href="/" className={`${styles.footerLink} hover-bg`}>
                    <Icon name="home" size={20} className="icon-inline" /> Home
                </Link>
                <Link href="/profile" className={`${styles.footerLink} hover-bg`}>
                    <Icon name="user" size={20} className="icon-inline" /> My Profile
                </Link>
            </div>
        </div>
    );
};

export default AdminSidebar;
