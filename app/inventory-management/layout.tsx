'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import './inventory.css';

const ADMIN_USER = 'imran123';
const ADMIN_PASS = 'mrj@2026';

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setLoggedIn(localStorage.getItem('bakery_auth') === '1');
    setHydrated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      localStorage.setItem('bakery_auth', '1');
      setLoggedIn(true);
      setLoginError('');
      setUsername('');
      setPassword('');
    } else {
      setLoginError('Wrong username or password');
      setPassword('');
    }
  };

  if (!hydrated) return <div className="im-login" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div>;

  if (!loggedIn) {
    return <div className="im-login"><div className="im-login-card"><p className="im-kicker">MRJ BEST BAKERY</p><h1>Welcome back</h1><p>Sign in to access your inventory</p><form onSubmit={handleLogin}><label>Username<input type="text" placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required /></label><label>Password<div className="im-password-wrapper"><input type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" className="im-password-toggle" onClick={() => setShowPassword(!showPassword)} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{loginError && <div style={{ color: '#a43932', fontSize: '12px', marginTop: '8px' }}>{loginError}</div>}<button type="submit">Sign in →</button></form><small>Demo: imran123 / mrj@2026</small></div></div>;
  }

  const navigation = [
    { href: '/inventory-management/items', label: 'Items' },
    { href: '/inventory-management/suppliers', label: 'Suppliers' },
    { href: '/inventory-management/purchases', label: 'Purchases' },
    { href: '/inventory-management/products', label: 'Products' },
    { href: '/inventory-management/production', label: 'Production' },
    { href: '/inventory-management/customers', label: 'Customers' },
    { href: '/inventory-management/billing', label: 'Billing' }
  ];

  const currentView = navigation.find(n => pathname === n.href)?.label || 'Dashboard';

  return <div className="im-app"><aside className="im-sidebar"><button className="im-brand" onClick={() => router.push('/inventory-management/purchases')}><span>MRJ</span><small>BAKERY</small></button>{navigation.map((item) => <button key={item.href} className={pathname === item.href ? 'active' : ''} onClick={() => router.push(item.href)}>{item.label}</button>)}<div className="im-sidebar-bottom"><span>Bakery management</span><button className="im-logout-btn" onClick={() => { localStorage.removeItem('bakery_auth'); window.location.reload(); }}>Sign out</button></div></aside><section className="im-workspace"><header className="im-topbar"><div><p className="im-kicker">MRJ BAKERY</p><h1>{currentView}</h1></div><span className="im-date" suppressHydrationWarning>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date())}</span></header>{children}</section></div>;
}
