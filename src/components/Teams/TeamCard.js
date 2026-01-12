import Link from 'next/link';
import styles from './team-card.module.css';

export default function TeamCard({ team, user, onJoin }) {
  const isMember = user && team.members.some(m => m.id === user.id);
  
  // Fallback for no logo: First letter
  const fallbackInitial = team.name.charAt(0).toUpperCase();
  
  return (
    <div className={`glass-panel ${styles.card}`}>
      {/* Sport Badge Top Right */}
      <div className={styles.sportBadge}>{team.sport}</div>
      
      {/* Logo Section */}
      <div className={styles.logoContainer}>
        {team.logo ? (
          <img src={team.logo} alt={team.name} className={styles.logoImage} />
        ) : (
          <div className={styles.fallbackLogo}>
            {fallbackInitial}
          </div>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.teamName}>{team.name}</h3>
        <p className={styles.memberCount}>{team.members.length} Members</p>
        
        {team.description && (
          <p className={styles.description}>{team.description}</p>
        )}
        
        <div className={styles.actions}>
          <Link href={`/teams/${team.id}`}>
            <button className={styles.viewButton}>View Roster</button>
          </Link>
          
          {!isMember && (
             <button 
               onClick={() => onJoin(team.id)}
               disabled={team.requests?.some(r => r.id === user?.id)}
               className={team.requests?.some(r => r.id === user?.id) ? styles.pendingButton : styles.joinButton}
               style={team.requests?.some(r => r.id === user?.id) ? { opacity: 0.7, cursor: 'not-allowed', background: '#555' } : {}}
             >
               {team.requests?.some(r => r.id === user?.id) ? 'Request Sent' : 'Request Access'}
             </button>
          )}
        </div>
      </div>
    </div>
  );
}
