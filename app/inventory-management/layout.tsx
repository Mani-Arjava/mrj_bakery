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
    const isAuth = localStorage.getItem('bakery_auth') === '1';
    setLoggedIn(isAuth);
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

  if (!hydrated) {
    return (
      <div className="im-login" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="im-login">
        <div className="im-login-card">
          <p className="im-kicker">MRJ BEST BAKERY</p>
          <h1>Welcome back</h1>
          <p>Sign in to access your inventory</p>
          <form onSubmit={handleLogin}>
            <label>
              Username
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </label>
            <label>
              Password
              <div className="im-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="im-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {loginError && <div style={{ color: '#a43932', fontSize: '12px', marginTop: '8px' }}>{loginError}</div>}
            <button type="submit">Sign in →</button>
          </form>
          <small>Demo: imran123 / mrj@2026</small>
        </div>
      </div>
    );
  }

  const viewMap: { [key: string]: string } = {
    '/inventory-management': 'Dashboard',
    '/inventory-management/items': 'Items',
    '/inventory-management/suppliers': 'Suppliers',
    '/inventory-management/purchases': 'Purchases',
    '/inventory-management/customers': 'Customers',
    '/inventory-management/products': 'Products',
    '/inventory-management/production': 'Production',
    '/inventory-management/expenses': 'Expenses',
    '/inventory-management/supplier-ledger': 'Supplier Ledger',
    '/inventory-management/customer-ledger': 'Customer Ledger',
    '/inventory-management/daily-closing': 'Daily Closing',
    '/inventory-management/reports': 'Reports',
    '/inventory-management/settings': 'Settings',
  };

  const isActive = (href: string) => pathname === href;
  const currentView = viewMap[pathname] || 'Dashboard';

  return (
    <div className="im-app">
      <aside className="im-sidebar">
        <a href="/inventory-management" className="im-brand">
          <span>IMR</span>
          <small>INVENTORY</small>
        </a>

        <button className={isActive('/inventory-management') ? 'active' : ''} onClick={() => router.push('/inventory-management')}>Dashboard</button>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }}></div>

        <button className={isActive('/inventory-management/items') ? 'active' : ''} onClick={() => router.push('/inventory-management/items')}>Items</button>
        <button className={isActive('/inventory-management/suppliers') ? 'active' : ''} onClick={() => router.push('/inventory-management/suppliers')}>Suppliers</button>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }}></div>

        <button className={isActive('/inventory-management/purchases') ? 'active' : ''} onClick={() => router.push('/inventory-management/purchases')}>Purchases</button>
        <button className={isActive('/inventory-management/customers') ? 'active' : ''} onClick={() => router.push('/inventory-management/customers')}>Customers</button>
        <button className={isActive('/inventory-management/products') ? 'active' : ''} onClick={() => router.push('/inventory-management/products')}>Products</button>
        <button className={isActive('/inventory-management/production') ? 'active' : ''} onClick={() => router.push('/inventory-management/production')}>Production</button>
        <button className={isActive('/inventory-management/expenses') ? 'active' : ''} onClick={() => router.push('/inventory-management/expenses')}>Expenses</button>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }}></div>

        <button className={isActive('/inventory-management/customer-ledger') ? 'active' : ''} onClick={() => router.push('/inventory-management/customer-ledger')}>Customer Ledger</button>
        <button className={isActive('/inventory-management/daily-closing') ? 'active' : ''} onClick={() => router.push('/inventory-management/daily-closing')}>Daily Closing</button>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }}></div>

        <button className={isActive('/inventory-management/reports') ? 'active' : ''} onClick={() => router.push('/inventory-management/reports')}>Reports</button>
        <button className={isActive('/inventory-management/settings') ? 'active' : ''} onClick={() => router.push('/inventory-management/settings')}>Settings</button>

        <div className="im-sidebar-bottom">
          <span>Browser-only app</span>
          <button className="im-logout-btn" onClick={() => { localStorage.removeItem('bakery_auth'); window.location.reload(); }}>Sign out</button>
        </div>
      </aside>

      <section className="im-workspace">
        <header className="im-topbar">
          <div>
            <p className="im-kicker">INVENTORY CONTROL</p>
            <h1>{currentView}</h1>
          </div>
          <span className="im-date" suppressHydrationWarning>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date())}</span>
        </header>
        {children}
      </section>
    </div>
  );
}
