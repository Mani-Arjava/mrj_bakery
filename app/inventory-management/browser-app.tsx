'use client';
import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import type { DashboardData } from '@/lib/inventory/types';
import * as storage from '@/lib/inventory/storage';

const today = () => new Date().toISOString().slice(0, 10);

export function useInventoryData() {
  const [dashboard, setDashboard] = useState<DashboardData>({ generatedAt: '', configured: false, cards: { rawMaterialValuePaise: 0, lowStockCount: 0, todayPurchasePaise: 0, todayProductionUnits: 0, todaySalesPaise: 0, supplierOutstandingPaise: 0, customerOutstandingPaise: 0, todayExpensePaise: 0, todayProfitPaise: 0 }, lowStock: [], topProducts: [], recentActivity: [] });
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    storage.initStorage();
    refresh();
  }, []);

  const refresh = useCallback(() => {
    try {
      const master = storage.getMasterData();
      setItems(master.items);
      setSuppliers(master.suppliers);
      setCustomers(master.customers);
      const data = storage.getData();
      setRecipes(data.recipes);
      const dash = storage.getDashboard() as any;
      setDashboard(dash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    }
  }, []);

  async function save(action: () => void) {
    try {
      setError('');
      setNotice('');
      setLoading(true);
      action();
      setNotice('Saved successfully');
      await new Promise(r => setTimeout(r, 300));
      refresh();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  return { dashboard, items, suppliers, customers, recipes, notice, error, loading, save, refresh, setNotice, setError };
}
const money = (value = 0) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value / 100);
const empty: DashboardData = { generatedAt: '', configured: false, cards: { rawMaterialValuePaise: 0, lowStockCount: 0, todayPurchasePaise: 0, todayProductionUnits: 0, todaySalesPaise: 0, supplierOutstandingPaise: 0, customerOutstandingPaise: 0, todayExpensePaise: 0, todayProfitPaise: 0 }, lowStock: [], topProducts: [], recentActivity: [] };

const ADMIN_USER = 'imran123';
const ADMIN_PASS = 'mrj@2026';

type View = 'Dashboard' | 'Items' | 'Purchases' | 'Customers' | 'Production' | 'Recipes' | 'Supplier Ledger' | 'Customer Ledger' | 'Daily Closing' | 'Reports' | 'Expenses' | 'Settings';

interface Stock { [key: string]: { quantity: number; averageCostPaise: number } }

export default function BrowserApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>('Dashboard');
  const [dashboard, setDashboard] = useState(empty);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    storage.initStorage();
    setLoggedIn(localStorage.getItem('bakery_auth') === '1');
    setHydrated(true);
    refresh();
  }, []);

  const refresh = useCallback(() => {
    try {
      const master = storage.getMasterData();
      setItems(master.items);
      setSuppliers(master.suppliers);
      setCustomers(master.customers);
      const data = storage.getData();
      setRecipes(data.recipes);
      const dash = storage.getDashboard() as any;
      setDashboard(dash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    }
  }, []);

  async function save(action: () => void) {
    try {
      setError('');
      setNotice('');
      setLoading(true);
      action();
      setNotice('Saved successfully');
      await new Promise(r => setTimeout(r, 300));
      refresh();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  if (!loggedIn) {
    return <LoginScreen onLogin={() => { localStorage.setItem('bakery_auth', '1'); setLoggedIn(true); }} />;
  }

  const rawMaterials = items.filter(i => i.type === 'RAW_MATERIAL');
  const finishedProducts = items.filter(i => i.type === 'FINISHED_GOOD');

  return (
    <main className="im-app">
      <aside className="im-sidebar">
        <a href="/" className="im-brand"><span>MRJ</span><small>BEST BAKERY</small></a>

        <button className={view === 'Dashboard' ? 'active' : ''} onClick={() => setView('Dashboard')}>Dashboard</button>

        <span className="im-side-label">SETUP</span>
        <button className={view === 'Items' ? 'active' : ''} onClick={() => setView('Items')}>Items</button>

        <span className="im-side-label">OPERATIONS</span>
        <button className={view === 'Purchases' ? 'active' : ''} onClick={() => setView('Purchases')}>Purchases</button>
        <button className={view === 'Customers' ? 'active' : ''} onClick={() => setView('Customers')}>Customers</button>
        <button className={view === 'Production' ? 'active' : ''} onClick={() => setView('Production')}>Production</button>
        <button className={view === 'Expenses' ? 'active' : ''} onClick={() => setView('Expenses')}>Expenses</button>

        <span className="im-side-label">PRODUCTION</span>
        <button className={view === 'Recipes' ? 'active' : ''} onClick={() => setView('Recipes')}>Recipes</button>

        <span className="im-side-label">ACCOUNTS</span>
        <button className={view === 'Supplier Ledger' ? 'active' : ''} onClick={() => setView('Supplier Ledger')}>Supplier Ledger</button>
        <button className={view === 'Customer Ledger' ? 'active' : ''} onClick={() => setView('Customer Ledger')}>Customer Ledger</button>
        <button className={view === 'Daily Closing' ? 'active' : ''} onClick={() => setView('Daily Closing')}>Daily Closing</button>

        <span className="im-side-label">INSIGHTS</span>
        <button className={view === 'Reports' ? 'active' : ''} onClick={() => setView('Reports')}>Reports</button>
        <button className={view === 'Settings' ? 'active' : ''} onClick={() => setView('Settings')}>Settings</button>

        <div className="im-sidebar-bottom">
          <span>Browser-only app</span>
          <button className="im-logout-btn" onClick={() => { localStorage.removeItem('bakery_auth'); window.location.reload(); }}>Sign out</button>
        </div>
      </aside>

      <section className="im-workspace">
        <header className="im-topbar">
          <div>
            <p className="im-kicker">INVENTORY CONTROL</p>
            <h1>{view}</h1>
          </div>
          <span className="im-date" suppressHydrationWarning>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date())}</span>
        </header>

        {notice && <div className="im-notice">{notice}</div>}
        {error && <div className="im-error im-banner">{error}</div>}

        {view === 'Dashboard' && <Dashboard data={dashboard} onNavigate={setView} hasData={suppliers.length > 0 || customers.length > 0 || items.length > 0} />}
        {view === 'Items' && <ItemsWorkspace items={items} suppliers={suppliers} customers={customers} save={save} refresh={refresh} />}
        {view === 'Purchases' && <PurchaseWorkspace suppliers={suppliers} items={rawMaterials} save={save} refresh={refresh} />}
        {view === 'Customers' && <CustomerWorkspace customers={customers} items={finishedProducts} save={save} refresh={refresh} />}
        {view === 'Production' && <ProductionWorkspace products={finishedProducts} materials={rawMaterials} save={save} refresh={refresh} />}
        {view === 'Recipes' && <RecipesWorkspace products={finishedProducts} materials={rawMaterials} save={save} refresh={refresh} />}
        {view === 'Supplier Ledger' && <SupplierLedgerWorkspace suppliers={suppliers} save={save} refresh={refresh} />}
        {view === 'Customer Ledger' && <CustomerLedgerWorkspace customers={customers} save={save} refresh={refresh} />}
        {view === 'Daily Closing' && <DailyClosingWorkspace save={save} refresh={refresh} />}
        {view === 'Reports' && <ReportsWorkspace />}
        {view === 'Expenses' && <ExpenseForm save={save} refresh={refresh} />}
        {view === 'Settings' && <SettingsWorkspace onLogout={() => { localStorage.removeItem('bakery_auth'); window.location.reload(); }} />}
      </section>
    </main>
  );
}

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      setLoginError('');
      onLogin();
    } else {
      setLoginError('Wrong username or password');
      setPassword('');
    }
  }

  return (
    <div className="im-login">
      <div className="im-login-card">
        <p className="im-kicker">MRJ BEST BAKERY</p>
        <h1>Welcome back</h1>
        <p>Sign in to access your inventory</p>

        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
              required
            />
          </label>

          <label>
            Password
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#718078',
                  padding: '4px 8px'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
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

export function Dashboard({ data, onNavigate, hasData }: { data: DashboardData; onNavigate: (view: View) => void; hasData: boolean }) {
  const colors = ['lime', 'red', 'blue', 'green', 'orange', 'gold', 'red', 'orange', 'green'];
  const values = [
    ['Raw-material value', money(data.cards.rawMaterialValuePaise)],
    ['Low stock items', String(data.cards.lowStockCount)],
    ["Today's purchases", money(data.cards.todayPurchasePaise)],
    ["Today's sales", money(data.cards.todaySalesPaise)],
    ["Today's production", `${data.cards.todayProductionUnits} units`],
    ['Supplier due', money(data.cards.supplierOutstandingPaise)],
    ['Customer due', money(data.cards.customerOutstandingPaise)],
    ["Today's expenses", money(data.cards.todayExpensePaise)],
    ["Today's result", money(data.cards.todayProfitPaise)]
  ];

  return (
    <>
      {!hasData && (
        <section className="im-setup" style={{ marginBottom: '24px' }}>
          <div>
            <p className="im-kicker">GETTING STARTED</p>
            <h2>Welcome to MRJ Best Bakery!</h2>
            <p>Follow these 3 steps to get started:</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => onNavigate('Items')} style={{ background: '#143d32', color: '#fff', border: 0, borderRadius: '7px', padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>Step 1: Add Suppliers & Items →</button>
            <button onClick={() => onNavigate('Purchases')} style={{ background: '#143d32', color: '#fff', border: 0, borderRadius: '7px', padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>Step 2: Purchases →</button>
            <button onClick={() => onNavigate('Customers')} style={{ background: '#143d32', color: '#fff', border: 0, borderRadius: '7px', padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>Step 3: Record Sales →</button>
          </div>
        </section>
      )}

      <div className="im-card-grid">
        {values.map(([label, value], idx) => (
          <article className={`im-stat ${colors[idx % colors.length]}`} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      {data.lowStock.length > 0 && (
        <div className="im-panel" style={{ marginTop: '24px' }}>
          <div className="im-panel-title">
            <h2>Low Stock Alerts</h2>
            <span>{data.lowStock.length} items</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Available</th>
                <th>Reorder Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.lowStock.map(row => (
                <tr key={row.item.id}>
                  <td>{row.item.name}</td>
                  <td className="danger">{row.quantity} {row.item.baseUnit}</td>
                  <td>{row.item.reorderLevel} {row.item.baseUnit}</td>
                  <td><span style={{ color: '#ee8c78', fontWeight: '700' }}>⚠ Low</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.topProducts.length > 0 && (
        <div className="im-panel" style={{ marginTop: '24px' }}>
          <div className="im-panel-title">
            <h2>Top Products</h2>
            <span>{data.topProducts.length} products</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Units Sold</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((row: any, idx) => (
                <tr key={idx}>
                  <td>{row.item.name}</td>
                  <td className="danger" style={{ color: '#1a8754' }}>{row.quantity} units</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function ItemsWorkspace({ items, suppliers, customers, save, refresh }: any) {
  const [tab, setTab] = useState<'customers' | 'items'>('items');
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', contactPerson: '', address: '' });
  const [itemForm, setItemForm] = useState({ name: '', type: 'RAW_MATERIAL' as 'RAW_MATERIAL' | 'FINISHED_GOOD', baseUnit: 'kg', reorderLevel: '0' });

  const handleAddCustomer = (e: FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;
    save(() => {
      storage.addMaster('customer', customerForm);
    });
    setCustomerForm({ name: '', phone: '', contactPerson: '', address: '' });
  };

  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return;
    save(() => {
      storage.addMaster('item', {
        name: itemForm.name,
        type: itemForm.type,
        baseUnit: itemForm.baseUnit,
        reorderLevel: Number(itemForm.reorderLevel)
      });
    });
    setItemForm({ name: '', type: 'RAW_MATERIAL', baseUnit: 'kg', reorderLevel: '0' });
  };

  return (
    <div className="im-form">
      <div className="im-tabs">
        <button className={tab === 'customers' ? 'selected' : ''} onClick={() => setTab('customers')}>Customers</button>
        <button className={tab === 'items' ? 'selected' : ''} onClick={() => setTab('items')}>Items</button>
      </div>

      {tab === 'customers' && (
        <>
          <p className="im-kicker">CUSTOMER DIRECTORY</p>
          <h2>Manage customers</h2>
          {customers.length === 0 ? (
            <div className="im-empty"><b>No customers yet</b><p>Create your first customer below.</p></div>
          ) : (
            <div className="im-party-cards" style={{ marginTop: '24px' }}>
              {customers.map((c: any) => (
                <div className="im-party-card" key={c.id} style={{ cursor: 'default', backgroundColor: '#f9faf7' }}>
                  <span>{c.name.slice(0, 1).toUpperCase()}</span>
                  <b>{c.name}</b>
                  {c.phone && <small>{c.phone}</small>}
                  {c.contactPerson && <small>{c.contactPerson}</small>}
                  {c.address && <small>{c.address}</small>}
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleAddCustomer} style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
            <p className="im-kicker">ADD CUSTOMER</p>
            <label>Name<input value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} required /></label>
            <div className="im-three">
              <label>Phone<input value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} inputMode="tel" /></label>
              <label>Contact Person<input value={customerForm.contactPerson} onChange={e => setCustomerForm({ ...customerForm, contactPerson: e.target.value })} /></label>
              <label></label>
            </div>
            <label>Address<textarea value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} rows={2} /></label>
            <button>Add Customer →</button>
          </form>
        </>
      )}

      {tab === 'items' && (
        <>
          <p className="im-kicker">INVENTORY ITEMS</p>
          <h2>Manage items</h2>
          {items.length === 0 ? (
            <div className="im-empty"><b>No items yet</b><p>Create your first item below.</p></div>
          ) : (
            <table style={{ marginTop: '24px' }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>Reorder Level</th>
                  <th>Stock Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i: any) => {
                  const bal = storage.getStockBalance(i.id);
                  return (
                    <tr key={i.id}>
                      <td>{i.name}</td>
                      <td>{i.type === 'RAW_MATERIAL' ? 'Raw Material' : 'Finished Good'}</td>
                      <td>{i.baseUnit}</td>
                      <td>{i.reorderLevel}</td>
                      <td>{bal.quantity.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <form onSubmit={handleAddItem} style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
            <p className="im-kicker">ADD ITEM</p>
            <div className="im-three">
              <label>Item Name<input value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} required /></label>
              <label>Type<select value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value as any })}>
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="FINISHED_GOOD">Finished Good</option>
              </select></label>
              <label>Unit<select value={itemForm.baseUnit} onChange={e => setItemForm({ ...itemForm, baseUnit: e.target.value })}>
                <option>kg</option><option>litre</option><option>piece</option>
              </select></label>
            </div>
            <label>Reorder Level<input value={itemForm.reorderLevel} onChange={e => setItemForm({ ...itemForm, reorderLevel: e.target.value })} type="number" min="0" /></label>
            <button>Add Item →</button>
          </form>
        </>
      )}
    </div>
  );
}

export function PurchaseWorkspace({ suppliers, items, save, refresh }: any) {
  const [showModal, setShowModal] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState([{ name: '', quantity: '', unit: 'kg', price: '' }]);
  const [paid, setPaid] = useState('0');
  const [date, setDate] = useState(today());
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0);
  const purchaseHistory = storage.getPurchaseHistory();

  // Consolidated outstanding for selected supplier (sum of per-invoice pending, negative = credit)
  const supplierOutstanding = supplierId
    ? purchaseHistory.filter(b => b.supplierId === supplierId).reduce((s, b) => s + b.pendingPaise, 0)
    : 0;

  function resetModal() {
    setSupplierId('');
    setLines([{ name: '', quantity: '', unit: 'kg', price: '' }]);
    setPaid('0');
    setDate(today());
    setShowModal(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supplierId || !total) return;
    const valid = lines.filter(line => line.name.trim() && Number(line.quantity) > 0);
    if (!valid.length) return;

    const resolved: any[] = [];
    for (const line of valid) {
      let found = items.find((item: any) => item.name.toLowerCase() === line.name.trim().toLowerCase());
      if (!found) {
        const id = storage.addMaster('item', { name: line.name.trim(), type: 'RAW_MATERIAL', baseUnit: line.unit, reorderLevel: 0 });
        found = { id, name: line.name.trim() };
      }
      resolved.push({ itemId: found.id, quantity: Number(line.quantity), unit: line.unit, unitPricePaise: Math.round(Number(line.price) * 100) });
    }

    save(() => {
      storage.postPurchase({
        date, supplierId, billNumber: '', lines: resolved,
        billAmountPaise: Math.round(total * 100),
        paidAmountPaise: Math.round(Number(paid || 0) * 100),
        note: ''
      });
    });
    resetModal();
  }

  // Group purchases by date
  const byDate: Record<string, typeof purchaseHistory> = {};
  for (const bill of purchaseHistory) {
    if (!byDate[bill.date]) byDate[bill.date] = [];
    byDate[bill.date].push(bill);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="im-form">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <p className="im-kicker">PURCHASES</p>
          <h2 style={{ margin: 0 }}>Purchase History</h2>
        </div>
        <button className="im-primary" onClick={() => setShowModal(true)}>+ New Purchase</button>
      </div>

      {purchaseHistory.length === 0 ? (
        <div className="im-empty" style={{ margin: '40px 0', textAlign: 'center' }}>
          <b>No purchases yet</b>
          <p>Click "+ New Purchase" above to record your first one</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {dates.map(d => {
            const bills = byDate[d];
            const dayTotal = bills.reduce((s, b) => s + b.billAmountPaise, 0);
            const dayPending = bills.reduce((s, b) => s + b.pendingPaise, 0);
            return (
              <div key={d}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid var(--line)', paddingBottom: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {money(dayTotal)}{dayPending > 0 ? ` · ₹${(dayPending / 100).toFixed(0)} due` : dayPending < 0 ? ` · ₹${Math.abs(dayPending / 100).toFixed(0)} credit` : ' · Settled'}
                  </span>
                </div>
                <table style={{ width: '100%', fontSize: '12px' }}>
                  <tbody>
                    {bills.map(bill => (
                      <React.Fragment key={bill.id}>
                        <tr onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)} style={{ cursor: 'pointer', background: expandedBillId === bill.id ? '#f9faf7' : 'transparent' }}>
                          <td style={{ paddingLeft: '4px' }}><b>{bill.supplierName}</b></td>
                          <td style={{ color: 'var(--muted)' }}>{bill.lineCount} item(s)</td>
                          <td>{money(bill.billAmountPaise)}</td>
                          <td>{money(bill.paidAmountPaise)} paid</td>
                          <td style={{ fontWeight: 700, color: bill.pendingPaise > 0 ? '#bd4c3e' : '#1a8754' }}>
                            {bill.pendingPaise > 0 ? `${money(bill.pendingPaise)} due` : '✓ Settled'}
                          </td>
                        </tr>
                        {expandedBillId === bill.id && (
                          <tr style={{ background: '#f9faf7' }}>
                            <td colSpan={5} style={{ padding: '10px 12px', fontSize: '11px' }}>
                              {bill.lines.map((line, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: idx > 0 ? '1px solid #edf0eb' : 'none' }}>
                                  <span><b>{line.itemName}</b> · {line.quantity} {line.unit}</span>
                                  <span>{money(line.totalPaise)}</span>
                                </div>
                              ))}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="im-modal-backdrop">
          <div className="im-modal" style={{ width: 'min(100%, 600px)' }}>
            <button className="im-modal-close" onClick={resetModal}>×</button>
            <h2>New Purchase</h2>
            <form onSubmit={submit} className="im-modal-form">

              <label>
                Supplier
                <select
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  required
                  style={{ display: 'block', width: '100%', marginTop: '6px', border: '1px solid var(--line)', borderRadius: '6px', padding: '10px 11px', font: '13px DM Sans, sans-serif', color: supplierId ? 'var(--ink)' : 'var(--muted)', background: '#fefdfb' }}
                >
                  <option value="">— Choose Supplier —</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}{s.phone ? ` · ${s.phone}` : ''}</option>)}
                </select>
                {suppliers.length === 0 && (
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                    No suppliers yet. <a href="/inventory-management/suppliers" style={{ color: 'var(--coffee)', fontWeight: 700 }}>Go to Suppliers page</a> to add one first.
                  </p>
                )}
                {suppliers.length > 0 && !supplierId && (
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                    Supplier not listed? <a href="/inventory-management/suppliers" style={{ color: 'var(--coffee)', fontWeight: 700 }}>Go to Suppliers page</a> to add them.
                  </p>
                )}
              </label>

              {supplierId && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: supplierOutstanding > 0 ? '#fff7ed' : '#f0fdf4',
                  border: `1px solid ${supplierOutstanding > 0 ? '#fed7aa' : '#bbf7d0'}`,
                  borderRadius: '8px', padding: '10px 14px', marginTop: '4px'
                }}>
                  <span style={{ fontSize: '12px', color: supplierOutstanding > 0 ? '#92400e' : '#14532d' }}>
                    Previous outstanding with {suppliers.find((s: any) => s.id === supplierId)?.name}
                  </span>
                  <strong style={{ fontSize: '14px', color: supplierOutstanding > 0 ? '#b45309' : '#15803d' }}>
                    {supplierOutstanding > 0 ? `₹${(supplierOutstanding / 100).toFixed(2)} due` : '✓ Settled'}
                  </strong>
                </div>
              )}

              <label>
                Date
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px', border: '1px solid var(--line)', borderRadius: '6px', padding: '10px 11px', font: '13px DM Sans, sans-serif' }} />
              </label>

              <div style={{ marginTop: '16px' }}>
                <div className="im-line-head"><span>Item</span><span>Qty</span><span>Unit</span><span>Rate ₹</span><span>Total</span></div>
                {lines.map((line, idx) => (
                  <div className="im-purchase-line" key={idx}>
                    <input
                      list="raw-items-modal"
                      value={line.name}
                      onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, name: e.target.value } : l))}
                      onBlur={e => {
                        const typed = e.target.value.trim();
                        const match = items.find((it: any) => it.name.toLowerCase() === typed.toLowerCase());
                        if (match && match.name !== typed) {
                          setLines(lines.map((l, i) => i === idx ? { ...l, name: match.name } : l));
                        }
                      }}
                      placeholder="Item name"
                      required
                    />
                    <input value={line.quantity} onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))} type="number" min="0.01" step="0.01" required />
                    <select value={line.unit} onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, unit: e.target.value } : l))}>
                      <option>kg</option><option>litre</option><option>piece</option>
                    </select>
                    <input value={line.price} onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, price: e.target.value } : l))} type="number" min="0" step="0.01" required />
                    <b>{money(Math.round(Number(line.quantity || 0) * Number(line.price || 0) * 100))}</b>
                    {lines.length > 1 && <button type="button" className="im-remove" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>×</button>}
                  </div>
                ))}
                <datalist id="raw-items-modal">
                  {items.map((item: any) => <option value={item.name} key={item.id} />)}
                </datalist>
                <button type="button" className="im-text-button" onClick={() => setLines([...lines, { name: '', quantity: '', unit: 'kg', price: '' }])}>+ Add line</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '8px' }}>
                <label style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#506258', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                  Paid now (₹)
                  <input
                    value={paid}
                    onChange={e => setPaid(e.target.value)}
                    type="number" min="0" step="0.01"
                    style={{ width: '120px', border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 10px', font: '13px DM Sans, sans-serif', color: 'var(--ink)' }}
                  />
                </label>
                <strong style={{ fontSize: '15px', whiteSpace: 'nowrap' }}>Total: {money(Math.round(total * 100))}</strong>
                <button type="submit" className="im-primary" style={{ whiteSpace: 'nowrap' }}>Post Bill →</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomerWorkspace({ customers, items, save, refresh }: any) {
  const [type, setType] = useState<'WHOLESALE' | 'RETAIL'>('RETAIL');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [saleDate, setSaleDate] = useState(today());
  const [saleLines, setSaleLines] = useState([{ itemId: '', quantity: '', rate: '' }]);
  const [salePaid, setSalePaid] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', contactPerson: '', address: '' });

  const filteredCustomers = customers.filter((c: any) => c.customerType === type || !c.customerType);

  const saleTotal = saleLines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.rate || 0), 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;

    const valid = saleLines.filter(l => l.itemId && Number(l.quantity) > 0 && Number(l.rate) > 0);
    if (!valid.length) return;

    save(() => {
      storage.postSale({
        date: saleDate,
        customerId: selectedCustomer.id,
        saleType: selectedCustomer.customerType || 'RETAIL',
        lines: valid.map(l => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unit: 'piece',
          unitPricePaise: Math.round(Number(l.rate) * 100)
        })),
        paidAmountPaise: Math.round(Number(salePaid || 0) * 100),
        note: ''
      });
    });

    setSelectedCustomer(null);
    setSaleLines([{ itemId: '', quantity: '', rate: '' }]);
    setSalePaid('');
  }

  const handleAddCustomer = (e: FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;
    const id = storage.addMaster('customer', { ...customerForm, customerType: type });
    const newCustomer = { id, ...customerForm, customerType: type };
    setSelectedCustomer(newCustomer);
    setCustomerForm({ name: '', phone: '', contactPerson: '', address: '' });
    setAddingCustomer(false);
    refresh();
  };

  return (
    <div className="im-form">
      {!selectedCustomer && !addingCustomer && (
        <>
          <p className="im-kicker">CUSTOMER</p>
          <h2>Select customer</h2>

          <div className="im-segmented" style={{ marginBottom: '24px' }}>
            <button className={type === 'RETAIL' ? 'selected' : ''} onClick={() => setType('RETAIL')}>Retail customers</button>
            <button className={type === 'WHOLESALE' ? 'selected' : ''} onClick={() => setType('WHOLESALE')}>Wholesale customers</button>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="im-empty" style={{ margin: '40px 0' }}>
              <b>No {type.toLowerCase()} customers yet</b>
              <p>Create your first customer to start recording sales.</p>
            </div>
          ) : (
            <div className="im-party-cards">
              {filteredCustomers.map((c: any) => (
                <button
                  key={c.id}
                  className="im-party-card"
                  onClick={() => setSelectedCustomer(c)}
                  style={{ cursor: 'pointer', background: '#fff' }}
                >
                  <span>{c.name.slice(0, 1).toUpperCase()}</span>
                  <b>{c.name}</b>
                  {c.phone && <small>{c.phone}</small>}
                  {c.contactPerson && <small>{c.contactPerson}</small>}
                </button>
              ))}
              <button
                className="im-party-card"
                onClick={() => setAddingCustomer(true)}
                style={{ cursor: 'pointer', background: '#f9faf7', color: '#718078', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span style={{ fontSize: '24px' }}>➕</span>
              </button>
            </div>
          )}

          {filteredCustomers.length === 0 && (
            <button onClick={() => setAddingCustomer(true)} style={{ marginTop: '20px', background: '#143d32', color: '#fff', border: 0, borderRadius: '7px', padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>
              Add your first {type.toLowerCase()} customer →
            </button>
          )}
        </>
      )}

      {addingCustomer && (
        <form onSubmit={handleAddCustomer} style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
          <p className="im-kicker">NEW CUSTOMER</p>
          <h2 style={{ fontSize: '24px' }}>Create customer</h2>
          <label>Name<input value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} required autoFocus /></label>
          <div className="im-three">
            <label>Phone<input value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} inputMode="tel" /></label>
            <label>Contact Person<input value={customerForm.contactPerson} onChange={e => setCustomerForm({ ...customerForm, contactPerson: e.target.value })} /></label>
            <label></label>
          </div>
          <label>Address<textarea value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} rows={2} /></label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button>Save & Continue →</button>
            <button type="button" onClick={() => setAddingCustomer(false)} className="im-secondary">Cancel</button>
          </div>
        </form>
      )}

      {selectedCustomer && (
        <>
          <div style={{ background: '#e7f0d7', border: '1px solid #d2e6ac', borderRadius: '12px', padding: '18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="im-kicker">SELECTED CUSTOMER</p>
              <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedCustomer.name}</h3>
            </div>
            <button type="button" onClick={() => setSelectedCustomer(null)} className="im-secondary">← Change customer</button>
          </div>

          <p className="im-kicker">SALE</p>
          <h2>Record sale</h2>

          <div className="im-two" style={{ marginBottom: '24px' }}>
            <label>Date<input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} /></label>
            <label></label>
          </div>

          <div className="im-line-head">
            <span>Product</span><span>Qty</span><span>Rate ₹</span><span>Total</span>
          </div>

          {saleLines.map((line, idx) => (
            <div className="im-purchase-line" key={idx} style={{ gridTemplateColumns: '2fr .7fr 1fr 1fr 25px' }}>
              <select
                value={line.itemId}
                onChange={e => setSaleLines(saleLines.map((l, i) => i === idx ? { ...l, itemId: e.target.value } : l))}
                required
              >
                <option value="">Select product…</option>
                {items.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <input
                value={line.quantity}
                onChange={e => setSaleLines(saleLines.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))}
                type="number"
                min="0.01"
                step="0.01"
                required
              />
              <input
                value={line.rate}
                onChange={e => setSaleLines(saleLines.map((l, i) => i === idx ? { ...l, rate: e.target.value } : l))}
                type="number"
                min="0"
                step="0.01"
                required
              />
              <b>{money(Math.round(Number(line.quantity || 0) * Number(line.rate || 0) * 100))}</b>
              {saleLines.length > 1 && (
                <button
                  type="button"
                  className="im-remove"
                  onClick={() => setSaleLines(saleLines.filter((_, i) => i !== idx))}
                >×</button>
              )}
            </div>
          ))}

          <button type="button" className="im-text-button" onClick={() => setSaleLines([...saleLines, { itemId: '', quantity: '', rate: '' }])}>
            + Add product
          </button>

          <div className="im-bill-total">
            <label>
              Paid (₹)
              <input value={salePaid} onChange={e => setSalePaid(e.target.value)} type="number" min="0" step="0.01" />
            </label>
            <strong>Total: {money(Math.round(saleTotal * 100))}</strong>
            <button onClick={submit}>Post Sale →</button>
          </div>
        </>
      )}
    </div>
  );
}

export function ProductionWorkspace({ products, materials, save, refresh }: any) {
  if (products.length === 0) {
    return (
      <div className="im-form">
        <p className="im-kicker">PRODUCTION</p>
        <h2>Record production batch</h2>
        <div className="im-empty">
          <b>No finished products yet</b>
          <p>Add finished goods in Items first, then define recipes for them before recording production batches.</p>
        </div>
      </div>
    );
  }

  const [selectedProduct, setSelectedProduct] = useState('');
  const [plannedQty, setPlannedQty] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [team, setTeam] = useState('');
  const [note, setNote] = useState('');
  const [stockCheck, setStockCheck] = useState<Array<{ name: string; required: number; available: number; unit: string; status: 'ok' | 'low' | 'unavailable' }>>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const recipe = selectedProduct ? storage.getRecipeForProduct(selectedProduct) : null;

  const checkStock = (qty: number) => {
    if (!recipe) return;
    const checks: Array<{ name: string; required: number; available: number; unit: string; status: 'ok' | 'low' | 'unavailable' }> = [];
    for (const line of recipe.lines) {
      const stock = storage.getStockBalance(line.materialId);
      const required = line.quantity * qty;
      const available = stock.quantity;
      const status: 'ok' | 'low' | 'unavailable' = available === 0 ? 'unavailable' : available < required ? 'low' : 'ok';
      checks.push({ name: line.materialName, required, available, unit: line.unit, status });
    }
    setStockCheck(checks);
    setShowWarning(checks.some(c => c.status !== 'ok'));
  };

  useEffect(() => {
    if (plannedQty && recipe) checkStock(Number(plannedQty));
  }, [plannedQty, recipe]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selectedProduct || !plannedQty || !actualQty) return;
    if (showWarning && !confirmed) {
      setConfirmed(true);
      return;
    }

    if (recipe?.lines) {
      const consumption = recipe.lines.map(line => ({
        itemId: line.materialId,
        quantity: Number(plannedQty) * line.quantity,
        unit: line.unit
      }));

      save(() => {
        storage.postProduction({
          date: today(),
          productId: selectedProduct,
          quantityProduced: Number(actualQty),
          team,
          consumption,
          note: note || `Planned: ${plannedQty}, Actual: ${actualQty}`
        });
      });

      setSelectedProduct('');
      setPlannedQty('');
      setActualQty('');
      setTeam('');
      setNote('');
      setStockCheck([]);
      setConfirmed(false);
    }
  }

  return (
    <div className="im-form">
      <p className="im-kicker">PRODUCTION</p>
      <h2>Record production batch</h2>

      {selectedProduct === '' && (
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '16px' }}>Select a product above to begin</p>
      )}

      <label>
        Product
        <select value={selectedProduct} onChange={e => { setSelectedProduct(e.target.value); setConfirmed(false); setStockCheck([]); }} required>
          <option value="">Select product…</option>
          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      {selectedProduct !== '' && recipe && recipe.lines.length > 0 ? (
        <>
          <p className="im-form-subtitle">Production Planning</p>
          <div className="im-two">
            <label>
              Planned batch quantity
              <input type="number" min="0.01" step="0.01" value={plannedQty} onChange={e => setPlannedQty(e.target.value)} placeholder="e.g. 500" required />
            </label>
            <label>
              Actual quantity produced
              <input type="number" min="0.01" step="0.01" value={actualQty} onChange={e => setActualQty(e.target.value)} placeholder="e.g. 480" required />
            </label>
          </div>

          <p className="im-form-subtitle">Stock requirement verification</p>
          {stockCheck.length > 0 && (
            <div className="im-stock-check">
              {stockCheck.map((item, idx) => (
                <div key={idx} className={`im-check-item ${item.status}`}>
                  <span><strong>{item.name}</strong></span>
                  <span className="required">Required: <strong>{item.required.toFixed(2)}</strong> {item.unit}</span>
                  <span className="available">Available: <strong>{item.available.toFixed(2)}</strong> {item.unit}</span>
                  <span className={`status ${item.status}`}>
                    {item.status === 'ok' ? '✓ OK' : item.status === 'low' ? '⚠ LOW' : '✗ OUT'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {showWarning && !confirmed && (
            <div className="im-warning">
              <strong>⚠ Stock Shortage Alert</strong>
              <p>Some materials are below requirement. Review the stock check above.</p>
              <p><small>Click "Continue Production" to proceed anyway, or adjust planned quantity.</small></p>
            </div>
          )}

          {showWarning && confirmed && (
            <div className="im-notice" style={{ background: '#fee7e5', color: '#a43932' }}>
              <strong>⚠ Proceeding with shortage override</strong>
            </div>
          )}

          <div className="im-two">
            <label>
              Team / Operator
              <input type="text" value={team} onChange={e => setTeam(e.target.value)} placeholder="e.g. Morning shift" />
            </label>
            <label>
              Production Notes
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Any issues, delays, quality notes…" />
            </label>
          </div>

          <button type="submit" onClick={submit}>
            {showWarning && !confirmed ? 'Continue Production →' : 'Post Production →'}
          </button>

          <div className="im-recipe-summary">
            <h4>Recipe: {recipe.productName}</h4>
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Per {plannedQty || '1'} units</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {recipe.lines.map((line: any, idx: number) => (
                  <tr key={idx}>
                    <td>{line.materialName}</td>
                    <td className="text-right">{plannedQty ? (line.quantity * Number(plannedQty)).toFixed(2) : line.quantity}</td>
                    <td>{line.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : selectedProduct !== '' && (!recipe || recipe.lines.length === 0) ? (
        <div className="im-notice" style={{ background: '#e2f2dd', color: '#285d40' }}>
          <strong>ℹ Recipe required</strong>
          <p>Define a recipe for <b>{recipe?.productName || 'this product'}</b> in the Recipes section first.</p>
        </div>
      ) : null}
    </div>
  );
}

export function RecipesWorkspace({ products, materials, save, refresh }: any) {
  if (products.length === 0) {
    return (
      <div className="im-form">
        <p className="im-kicker">RECIPES</p>
        <h2>Manage recipes</h2>
        <div className="im-empty">
          <b>No finished products yet</b>
          <p>Add finished goods in Items first to start defining recipes.</p>
        </div>
      </div>
    );
  }

  const [selectedProduct, setSelectedProduct] = useState('');
  const [recipe, setRecipe] = useState<any>(null);
  const [lines, setLines] = useState<Array<{ materialId: string; quantity: string; unit: string }>>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      const rec = storage.getRecipeForProduct(selectedProduct);
      setRecipe(rec);
      if (rec?.lines) {
        setLines(rec.lines.map((l: any) => ({ materialId: l.materialId, quantity: String(l.quantity), unit: l.unit })));
      } else {
        setLines([{ materialId: '', quantity: '', unit: 'kg' }]);
      }
      setEditing(false);
    }
  }, [selectedProduct]);

  async function submitRecipe(e: FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    const validLines = lines.filter(l => l.materialId && Number(l.quantity) > 0);
    if (validLines.length === 0) return;

    save(() => {
      storage.saveRecipe(selectedProduct, validLines.map(l => ({
        materialId: l.materialId,
        quantity: Number(l.quantity),
        unit: l.unit
      })));
    });
    setEditing(false);
  }

  return (
    <div className="im-form">
      <p className="im-kicker">RECIPES</p>
      <h2>Manage recipes</h2>

      <label>
        Product
        <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
          <option value="">Select product…</option>
          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      {selectedProduct && recipe && (
        <>
          {!editing && recipe.lines.length > 0 && (
            <>
              <div className="im-recipe-view">
                <h3>Current Recipe for {recipe.productName}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipe.lines.map((line: any, idx: number) => (
                      <tr key={idx}>
                        <td>{line.materialName}</td>
                        <td>{line.quantity}</td>
                        <td>{line.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => setEditing(true)}>Edit recipe</button>
            </>
          )}

          {(editing || recipe.lines.length === 0) && (
            <form onSubmit={submitRecipe}>
              <p className="im-form-subtitle">Recipe lines</p>
              {lines.map((line, idx) => (
                <div key={idx} className="im-three">
                  <label>
                    Material
                    <select value={line.materialId} onChange={e => {
                      const newLines = [...lines];
                      newLines[idx].materialId = e.target.value;
                      setLines(newLines);
                    }}>
                      <option value="">Select…</option>
                      {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Quantity
                    <input type="number" min="0.01" step="0.01" value={line.quantity} onChange={e => {
                      const newLines = [...lines];
                      newLines[idx].quantity = e.target.value;
                      setLines(newLines);
                    }} />
                  </label>
                  <label>
                    Unit
                    <select value={line.unit} onChange={e => {
                      const newLines = [...lines];
                      newLines[idx].unit = e.target.value;
                      setLines(newLines);
                    }}>
                      <option>kg</option><option>litre</option><option>piece</option>
                    </select>
                  </label>
                </div>
              ))}
              <button type="button" onClick={() => setLines([...lines, { materialId: '', quantity: '', unit: 'kg' }])}>+ Add line</button>
              <button type="submit">Save recipe</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export function SupplierLedgerWorkspace({ suppliers, save, refresh }: any) {
  const [selected, setSelected] = useState('');
  const [ledger, setLedger] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<'PAYMENT' | 'ADVANCE'>('PAYMENT');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    if (selected) {
      setLedger(storage.getSupplierLedger(selected));
    }
  }, [selected]);

  function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!selected || !paymentAmount) return;

    save(() => {
      storage.postSupplierPayment({
        date: today(),
        supplierId: selected,
        amountPaise: Math.round(Number(paymentAmount) * 100),
        type: paymentType,
        note: paymentNote
      });
      setLedger(storage.getSupplierLedger(selected));
    });

    setPaymentAmount('');
    setPaymentNote('');
    setShowPaymentForm(false);
  }

  return (
    <div className="im-form">
      <p className="im-kicker">SUPPLIER</p>
      <h2>Ledger</h2>

      <label>
        Select Supplier
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Choose…</option>
          {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>

      {ledger && (
        <>
          <div className="im-ledger-summary">
            <div><span>Purchased</span><strong>{money(ledger.summary.totalPurchased)}</strong></div>
            <div><span>Paid</span><strong>{money(ledger.summary.totalPaid)}</strong></div>
            <div><span>Advance</span><strong>{money(ledger.summary.totalAdvance)}</strong></div>
            <div><span>Outstanding</span><strong className={ledger.summary.outstanding > 0 ? 'danger' : ''}>{money(ledger.summary.outstanding)}</strong></div>
          </div>

          {showPaymentForm ? (
            <form className="im-payment-form" onSubmit={submitPayment}>
              <p className="im-form-subtitle">Record Payment</p>
              <div className="im-two">
                <label>
                  Payment Type
                  <select value={paymentType} onChange={e => setPaymentType(e.target.value as any)}>
                    <option value="PAYMENT">Payment Against Invoice</option>
                    <option value="ADVANCE">Advance Payment</option>
                  </select>
                </label>
                <label>
                  Amount (₹)
                  <input type="number" step="1" min="1" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required />
                </label>
              </div>
              <label>
                Notes
                <textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} rows={2} placeholder="Invoice reference, cheque number, etc." />
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit">Record Payment</button>
                <button type="button" onClick={() => setShowPaymentForm(false)} className="im-secondary">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowPaymentForm(true)} type="button">+ Record Payment</button>
          )}

          {ledger.ledger.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <p className="im-form-subtitle">Account History</p>
              <table className="im-ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.ledger.map((entry: any, idx: number) => (
                    <tr key={idx}>
                      <td>{entry.date}</td>
                      <td><strong>{entry.type}</strong></td>
                      <td className={entry.amountPaise > 0 ? 'debit' : 'credit'}>{money(Math.abs(entry.amountPaise))}</td>
                      <td><strong>{money(entry.balancePaise)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CustomerLedgerWorkspace({ customers, save, refresh }: any) {
  const [selected, setSelected] = useState('');
  const [ledger, setLedger] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    if (selected) {
      setLedger(storage.getCustomerLedger(selected));
    }
  }, [selected]);

  function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!selected || !paymentAmount) return;

    save(() => {
      storage.postCustomerPayment({
        date: today(),
        customerId: selected,
        amountPaise: Math.round(Number(paymentAmount) * 100),
        note: paymentNote
      });
      setLedger(storage.getCustomerLedger(selected));
    });

    setPaymentAmount('');
    setPaymentNote('');
    setShowPaymentForm(false);
  }

  return (
    <div className="im-form">
      <p className="im-kicker">CUSTOMER</p>
      <h2>Ledger</h2>

      <label>
        Select Customer
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Choose…</option>
          {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      {ledger && (
        <>
          <div className="im-ledger-summary">
            <div><span>Sales</span><strong>{money(ledger.summary.totalSales)}</strong></div>
            <div><span>Received</span><strong>{money(ledger.summary.totalPaid)}</strong></div>
            <div><span>Outstanding</span><strong className={ledger.summary.outstanding > 0 ? 'danger' : ''}>{money(ledger.summary.outstanding)}</strong></div>
            <div><span>Last Sale</span><strong>{ledger.ledger[ledger.ledger.length - 1]?.date || '—'}</strong></div>
          </div>

          {showPaymentForm ? (
            <form className="im-payment-form" onSubmit={submitPayment}>
              <p className="im-form-subtitle">Record Payment</p>
              <label>
                Amount Received (₹)
                <input type="number" step="1" min="1" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required />
              </label>
              <label>
                Notes
                <textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} rows={2} placeholder="Payment method, reference, etc." />
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit">Record Payment</button>
                <button type="button" onClick={() => setShowPaymentForm(false)} className="im-secondary">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowPaymentForm(true)} type="button">+ Record Payment</button>
          )}

          {ledger.ledger.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <p className="im-form-subtitle">Sales & Payment History</p>
              <table className="im-ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.ledger.map((entry: any, idx: number) => (
                    <tr key={idx}>
                      <td>{entry.date}</td>
                      <td><strong>{entry.type}</strong></td>
                      <td className={entry.amountPaise > 0 ? 'debit' : 'credit'}>{money(Math.abs(entry.amountPaise))}</td>
                      <td><strong>{money(entry.balancePaise)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function DailyClosingWorkspace({ save, refresh }: any) {
  const [physical, setPhysical] = useState('');
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    setSummary(storage.getDailyClosingSummary(today()));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    save(() => {
      storage.postDailyClosing({
        date: today(),
        physicalCashPaise: Math.round(Number(physical) * 100),
        note: ''
      });
      setSummary(storage.getDailyClosingSummary(today()));
    });
  }

  return (
    <div className="im-form">
      <p className="im-kicker">END OF DAY</p>
      <h2>Daily closing</h2>

      {summary && (
        <>
          <div className="im-closing-summary">
            <div className="im-closing-row">
              <span>Opening</span>
              <strong>{money(summary.openingCashPaise)}</strong>
            </div>
            <div className="im-closing-row">
              <span>+ Receipts</span>
              <strong>{money(summary.receiptsPaise)}</strong>
            </div>
            <div className="im-closing-row">
              <span>- Payments</span>
              <strong>{money(summary.paymentsPaise)}</strong>
            </div>
            <div className="im-closing-row">
              <span>= System Balance</span>
              <strong>{money(summary.systemClosingPaise)}</strong>
            </div>
          </div>

          {!summary.isClosed && (
            <form onSubmit={submit}>
              <label>
                Physical Cash Count (₹)
                <input value={physical} onChange={e => setPhysical(e.target.value)} type="number" step="1" required />
              </label>
              <button>Close Day</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export function ReportsWorkspace() {
  const [reportType, setReportType] = useState<'stock' | 'supplier' | 'customer' | 'expense' | 'profit'>('stock');
  const [reportData, setReportData] = useState<any>(null);

  function loadReport() {
    try {
      let data;
      switch (reportType) {
        case 'stock':
          data = storage.getStockReport();
          break;
        case 'supplier':
          data = storage.getSupplierAnalysis();
          break;
        case 'customer':
          data = storage.getCustomerAnalysis();
          break;
        case 'expense':
          data = storage.getExpenseReport();
          break;
        case 'profit':
          data = storage.getProfitReport();
          break;
      }
      setReportData(data);
    } catch (err) {
      console.error('Report load failed:', err);
    }
  }

  return (
    <div className="im-form">
      <p className="im-kicker">REPORTS</p>
      <h2>Analysis</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {(['stock', 'supplier', 'customer', 'expense', 'profit'] as const).map(type => (
          <button
            key={type}
            className={`im-filter-btn ${reportType === type ? 'active' : ''}`}
            onClick={() => {
              setReportType(type);
              setReportData(null);
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <button onClick={loadReport}>Load Report</button>

      {reportData && (
        <div style={{ marginTop: '24px' }}>
          {reportType === 'stock' && (
            <table style={{ width: '100%', fontSize: '12px', marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td>{item.quantity.toFixed(2)} {item.unit}</td>
                    <td>{money(item.value)}</td>
                    <td><span style={{ color: item.status === 'LOW' ? '#f0b95b' : '#79c998' }}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportType === 'supplier' && (
            <table style={{ width: '100%', fontSize: '12px', marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Total Purchased</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((s: any, idx: number) => (
                  <tr key={idx}>
                    <td>{s.name}</td>
                    <td>{money(s.totalPurchased)}</td>
                    <td>{money(s.totalPaid)}</td>
                    <td style={{ color: '#bd4c3e', fontWeight: '700' }}>{money(s.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportType === 'customer' && (
            <table style={{ width: '100%', fontSize: '12px', marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Total Sales</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((c: any, idx: number) => (
                  <tr key={idx}>
                    <td>{c.name}</td>
                    <td>{c.customerType}</td>
                    <td>{money(c.totalSales)}</td>
                    <td style={{ color: '#bd4c3e', fontWeight: '700' }}>{money(c.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportType === 'expense' && (
            <>
              <h3>Expense Summary</h3>
              {reportData.byCategory.map((cat: any, idx: number) => (
                <div key={idx} style={{ padding: '8px 0', borderTop: '1px solid #edf0eb', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{cat.category}</span>
                  <strong>{money(cat.amountPaise)}</strong>
                </div>
              ))}
              <div style={{ padding: '12px 0', borderTop: '2px solid var(--line)', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '13px' }}>
                <span>Total</span>
                <strong>{money(reportData.grandTotalPaise)}</strong>
              </div>
            </>
          )}
          {reportType === 'profit' && (
            <div style={{ background: '#f9faf7', border: '1px solid var(--line)', borderRadius: '8px', padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span>Total Sales</span>
                <strong>{money(reportData.totalSalesPaise)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span>Total Expenses</span>
                <strong>{money(reportData.totalExpensesPaise)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid var(--line)', marginTop: '8px', fontWeight: '700', fontSize: '13px' }}>
                <span>Net Profit</span>
                <strong style={{ color: reportData.estimatedProfitPaise >= 0 ? '#1a8754' : '#bd4c3e' }}>{money(reportData.estimatedProfitPaise)}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#718078', marginTop: '12px' }}>
                Margin: {reportData.marginPercent}%
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExpenseForm({ save, refresh }: any) {
  async function submit(e: any) {
    e.preventDefault();
    const f = new FormData(e.target);
    save(() => {
      storage.postExpense({
        date: f.get('date'),
        category: f.get('category'),
        amountPaise: Math.round(Number(f.get('amount')) * 100),
        note: f.get('note') || ''
      });
    });
    e.target.reset();
  }

  return (
    <form className="im-form im-transaction" onSubmit={submit}>
      <p className="im-kicker">EXPENSE</p>
      <h2>Record expense</h2>
      <label>Date<input name="date" type="date" defaultValue={today()} required /></label>
      <label>Category<select name="category"><option>Wages</option><option>Electricity</option><option>Fuel</option><option>Rent</option><option>Transport</option><option>Other</option></select></label>
      <label>Amount (₹)<input name="amount" type="number" min="0" step="0.01" required /></label>
      <label>Notes<textarea name="note" rows={2} /></label>
      <button>Post →</button>
    </form>
  );
}

export function SettingsWorkspace({ onLogout }: { onLogout: () => void }) {
  async function exportData() {
    storage.exportJSON();
  }

  async function handleImport(e: any) {
    e.preventDefault();
    const input = e.target.querySelector('input[type="file"]') as HTMLInputElement;
    if (input?.files?.[0]) {
      const success = await storage.importJSON(input.files[0]);
      if (success) {
        alert('✓ Data imported');
        window.location.reload();
      } else {
        alert('✗ Import failed');
      }
    }
  }

  return (
    <div className="im-form">
      <p className="im-kicker">SETTINGS</p>
      <h2>Backup & Data</h2>

      <div style={{ background: '#e7f0d7', border: '1px solid #d2e6ac', borderRadius: '9px', padding: '15px', marginBottom: '18px' }}>
        <h3>Backup</h3>
        <button onClick={exportData} style={{ background: '#79c998', color: '#fff', border: 0, borderRadius: '7px', padding: '10px 15px', cursor: 'pointer' }}>
          ↓ Export JSON
        </button>
      </div>

      <div style={{ background: '#fee7e5', border: '1px solid #f4c4be', borderRadius: '9px', padding: '15px', marginBottom: '18px' }}>
        <h3>Import</h3>
        <form onSubmit={handleImport}>
          <input type="file" accept=".json" required />
          <button style={{ background: '#a43932', color: '#fff', border: 0, borderRadius: '7px', padding: '10px 15px', marginTop: '10px', cursor: 'pointer' }}>
            ⬆️ Import
          </button>
        </form>
      </div>

      <div style={{ background: '#ffe7e5', border: '1px solid #f4c4be', borderRadius: '9px', padding: '15px', marginBottom: '18px' }}>
        <h3 style={{ color: '#a43932' }}>Danger Zone</h3>
        <button onClick={() => {
          if (window.confirm('This will delete all data. This cannot be undone.')) {
            storage.clearData();
            window.location.reload();
          }
        }} style={{ background: '#a43932', color: '#fff', border: 0, borderRadius: '7px', padding: '10px 15px', cursor: 'pointer', marginRight: '10px' }}>
          🗑️ Clear All Data
        </button>
      </div>

      <div style={{ background: '#f0f0f0', border: '1px solid #d0d0d0', borderRadius: '9px', padding: '15px' }}>
        <h3>Account</h3>
        <button onClick={onLogout} style={{ background: '#718078', color: '#fff', border: 0, borderRadius: '7px', padding: '10px 15px', cursor: 'pointer' }}>
          🚪 Sign out
        </button>
      </div>
    </div>
  );
}

export function SuppliersWorkspace({ suppliers, save, refresh }: { suppliers: any[]; save: (action: () => void) => Promise<void>; refresh: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', contactPerson: '', address: '' });
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    save(() => {
      storage.addMaster('supplier', form);
      setForm({ name: '', phone: '', contactPerson: '', address: '' });
      setShowModal(false);
    });
  };

  if (selectedSupplier) {
    const allPurchases = storage.getPurchaseHistory();
    const supplierPurchases = allPurchases.filter(b => b.supplierId === selectedSupplier.id);
    const totalBilled = supplierPurchases.reduce((s, b) => s + b.billAmountPaise, 0);
    const totalPaid = supplierPurchases.reduce((s, b) => s + b.paidAmountPaise, 0);
    // Sum raw pendingPaise (negative = overpaid/credit, correct cross-bill net)
    const consolidatedOutstanding = supplierPurchases.reduce((s, b) => s + b.pendingPaise, 0);

    return (
      <div className="im-form">
        <button type="button" className="im-secondary" onClick={() => { setSelectedSupplier(null); setExpandedBillId(null); }} style={{ marginBottom: '24px' }}>← All Suppliers</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e5f0d6', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '20px', color: '#3a2013', flexShrink: 0 }}>
            {selectedSupplier.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontFamily: 'Playfair Display, serif' }}>{selectedSupplier.name}</h2>
            {selectedSupplier.phone && <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>{selectedSupplier.phone}{selectedSupplier.contactPerson ? ` · ${selectedSupplier.contactPerson}` : ''}</p>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Bills</span>
            <strong style={{ display: 'block', fontSize: '20px', marginTop: '6px' }}>{supplierPurchases.length}</strong>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Purchased</span>
            <strong style={{ display: 'block', fontSize: '20px', marginTop: '6px' }}>{money(totalBilled)}</strong>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Outstanding</span>
            <strong style={{ display: 'block', fontSize: '20px', marginTop: '6px', color: consolidatedOutstanding > 0 ? '#bd4c3e' : '#1a8754' }}>
              {consolidatedOutstanding > 0 ? money(consolidatedOutstanding) + ' due' : consolidatedOutstanding < 0 ? money(Math.abs(consolidatedOutstanding)) + ' credit' : '✓ Nil'}
            </strong>
          </div>
        </div>

        {supplierPurchases.length === 0 ? (
          <div className="im-empty" style={{ textAlign: 'center', margin: '40px 0' }}>
            <b>No purchases yet</b>
            <p>No purchases have been recorded for this supplier.</p>
          </div>
        ) : (
          <>
            <p className="im-kicker">PURCHASE HISTORY</p>
            <table style={{ width: '100%', marginTop: '12px', fontSize: '12px' }}>
              <thead>
                <tr><th>Date</th><th>Items</th><th>Total</th><th>Paid</th><th>Pending</th></tr>
              </thead>
              <tbody>
                {supplierPurchases.map(bill => (
                  <React.Fragment key={bill.id}>
                    <tr onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)} style={{ cursor: 'pointer', background: expandedBillId === bill.id ? '#f9faf7' : 'transparent' }}>
                      <td>{bill.date}</td>
                      <td>{bill.lineCount} item(s)</td>
                      <td>{money(bill.billAmountPaise)}</td>
                      <td>{money(bill.paidAmountPaise)}</td>
                      <td style={{ fontWeight: 700, color: bill.pendingPaise > 0 ? '#bd4c3e' : '#1a8754' }}>
                        {bill.pendingPaise > 0 ? money(bill.pendingPaise) + ' due' : '✓ Settled'}
                      </td>
                    </tr>
                    {expandedBillId === bill.id && (
                      <tr style={{ background: '#f9faf7' }}>
                        <td colSpan={5} style={{ padding: '12px', fontSize: '11px' }}>
                          {bill.lines.map((line, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: idx > 0 ? '1px solid #edf0eb' : 'none' }}>
                              <span><b>{line.itemName}</b> · {line.quantity} {line.unit}</span>
                              <span>{money(line.totalPaise)}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="im-form">
      <div className="im-section-actions">
        <h2 className="im-page-title">Suppliers</h2>
        <button className="im-primary" onClick={() => setShowModal(true)}>+ Add Supplier</button>
      </div>

      {suppliers.length === 0 ? (
        <div className="im-empty" style={{ margin: '40px 0', textAlign: 'center' }}>
          <b>No suppliers yet</b>
          <p>Click "Add Supplier" above to create your first one</p>
        </div>
      ) : (
        <div className="im-party-grid" style={{ marginTop: '24px' }}>
          {suppliers.map((s: any) => {
            const purchases = storage.getPurchaseHistory().filter(b => b.supplierId === s.id);
            const outstanding = purchases.reduce((sum, b) => sum + b.pendingPaise, 0);
            return (
              <button key={s.id} className="im-party-card" onClick={() => setSelectedSupplier(s)} style={{ textAlign: 'left', cursor: 'pointer' }}>
                <span className="im-avatar">{s.name.slice(0, 1).toUpperCase()}</span>
                <strong>{s.name}</strong>
                {s.phone && <small>{s.phone}</small>}
                <b style={{ marginTop: 'auto', color: outstanding > 0 ? '#bd4c3e' : '#1a8754' }}>
                  {purchases.length} purchase{purchases.length !== 1 ? 's' : ''}{outstanding > 0 ? ` · ₹${(outstanding / 100).toFixed(0)} due` : ''}
                </b>
              </button>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="im-modal-backdrop">
          <div className="im-modal">
            <button className="im-modal-close" onClick={() => setShowModal(false)}>×</button>
            <h2>Add Supplier</h2>
            <form className="im-modal-form" onSubmit={handleSubmit}>
              <label>Name<input type="text" placeholder="Supplier name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus /></label>
              <label>Phone<input type="tel" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label>Contact Person<input type="text" placeholder="Contact person name" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></label>
              <label>Address<textarea placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}></textarea></label>
              <button type="submit" className="im-primary" style={{ marginTop: '16px' }}>Create Supplier</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
