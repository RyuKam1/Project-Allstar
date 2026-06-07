"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/UI/Icon';
import styles from './bottomNav.module.css';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const hiddenPrefixes = ['/login', '/register', '/admin'];
  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const navItems = [
    { label: 'Home', href: '/', icon: 'home', match: (p) => p === '/' },
    { label: 'Venues', href: '/venues', icon: 'location', match: (p) => p.startsWith('/venues') || p.startsWith('/locations') },
    { label: 'Teams', href: '/teams', icon: 'users', match: (p) => p.startsWith('/teams') },
    { label: 'Events', href: '/events', icon: 'calendar', match: (p) => p.startsWith('/events') || p.startsWith('/tournaments') },
    { label: 'Profile', href: user ? '/profile' : '/login', icon: 'user', match: (p) => p.startsWith('/profile') || p.startsWith('/players') || p === '/login' },
  ];

  return (
    <nav className={styles.bottomNav} aria-label="Primary">
      {navItems.map((item) => {
        const isActive = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className={styles.icon}>
              <Icon name={item.icon} size={22} />
            </div>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
