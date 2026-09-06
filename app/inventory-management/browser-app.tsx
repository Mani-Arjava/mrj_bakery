'use client';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardData } from '@/lib/inventory/types';
import * as storage from '@/lib/inventory/storage';

const today = () => new Date().toISOString().slice(0, 10);
const money = (value = 0) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value / 100);
const empty: DashboardData = { generatedAt: '', configured: false, cards: { rawMaterialValuePaise: 0, lowStockCount: 0, todayPurchasePaise: 0, todayProductionUnits: 0, todaySalesPaise: 0, supplierOutstandingPaise: 0, customerOutstandingPaise: 0, todayExpensePaise: 0, todayProfitPaise: 0 }, lowStock: [], topProducts: [], recentActivity: [] };

type View = 'Dashboard' | 'Purchases' | 'Customers' | 'Production' | 'Recipes' | 'Supplier Ledger' | 'Customer Ledger' | 'Daily Closing' | 'Reports' | 'Expenses' | 'Settings';

interface Stock { [key: string]: { quantity: number; averageCostPaise: number } }

export default function BrowserApp() {
  const [view, setView] = useState<View>('Dashboard');
  const [dashboard, setDashboard] = useState(empty);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
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
      setNotice('✓ Saved successfully');
      await new Promise(r => setTimeout(r, 300));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  const rawMaterials = useMemo(() => items.filter(i => i.type === 'RAW_MATERIAL'), [items]);
  const finishedProducts = useMemo(() => items.filter(i => i.type === 'FINISHED_GOOD'), [items]);

  return (
    <main className="im-app">
      <aside className="im-sidebar">
        <a href="/" className="im-brand"><span>MRJ</span><small>BEST BAKERY</small></a>
        {(['Dashboard', 'Purchases', 'Customers', 'Production', 'Recipes', 'Supplier Ledger', 'Customer Ledger', 'Daily Closing', 'Reports', 'Expenses', 'Settings'] as View[]).map(name => (
          <button className={view === name ? 'active' : ''} onClick={() => setView(name)} key={name}>{name}</button>
        ))}
        <div className="im-sidebar-bottom">
          <span>Browser-only app</span>
          <button onClick={() => { storage.clearData(); window.location.reload(); }}>Clear All</button>
        </div>
      </aside>

      <section className="im-workspace">
        <header className="im-topbar">
          <div>
            <p className="im-kicker">INVENTORY CONTROL</p>
            <h1>{view}</h1>
          </div>
          <span className="im-date">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date())}</span>
        </header>

        {notice && <div className="im-notice">✓ {notice}</div>}
        {error && <div className="im-error im-banner">{error}</div>}

        {view === 'Dashboard' && <Dashboard data={dashboard} />}
        {view === 'Purchases' && <PurchaseWorkspace suppliers={suppliers} items={rawMaterials} save={save} refresh={refresh} />}
        {view === 'Customers' && <CustomerWorkspace customers={customers} items={finishedProducts} save={save} refresh={refresh} />}
        {view === 'Production' && <ProductionWorkspace products={finishedProducts} materials={rawMaterials} save={save} refresh={refresh} />}
        {view === 'Recipes' && <RecipesWorkspace products={finishedProducts} materials={rawMaterials} save={save} refresh={refresh} />}
        {view === 'Supplier Ledger' && <SupplierLedgerWorkspace suppliers={suppliers} save={save} refresh={refresh} />}
        {view === 'Customer Ledger' && <CustomerLedgerWorkspace customers={customers} save={save} refresh={refresh} />}
        {view === 'Daily Closing' && <DailyClosingWorkspace save={save} refresh={refresh} />}
        {view === 'Reports' && <ReportsWorkspace />}
        {view === 'Expenses' && <ExpenseForm save={save} refresh={refresh} />}
        {view === 'Settings' && <SettingsWorkspace />}
      </section>
    </main>
  );
}

function Dashboard({ data }: { data: DashboardData }) {
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
      <div className="im-card-grid">
        {values.map(([label, value]) => (
          <article className="im-stat" key={label}>
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
              </tr>
            </thead>
            <tbody>
              {data.lowStock.map(row => (
                <tr key={row.item.id}>
                  <td>{row.item.name}</td>
                  <td className="danger">{row.quantity} {row.item.baseUnit}</td>
                  <td>{row.item.reorderLevel} {row.item.baseUnit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function PurchaseWorkspace({ suppliers, items, save, refresh }: any) {
  const [lines, setLines] = useState([{ name: '', quantity: '', unit: 'kg', price: '' }]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [paid, setPaid] = useState('0');
  
  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selectedSupplier || !total) return;
    
    const valid = lines.filter(line => line.name.trim() && Number(line.quantity) > 0);
    if (!valid.length) return;

    const resolved: any[] = [];
    for (const line of valid) {
      let found = items.find((item: any) => item.name.toLowerCase() === line.name.trim().toLowerCase());
      if (!found) {
        const id = storage.addMaster('item', {
          name: line.name.trim(),
          type: 'RAW_MATERIAL',
          baseUnit: line.unit,
          reorderLevel: 0
        });
        found = { id, name: line.name.trim() };
      }
      resolved.push({
        itemId: found.id,
        quantity: Number(line.quantity),
        unit: line.unit,
        unitPricePaise: Math.round(Number(line.price) * 100)
      });
    }

    save(() => {
      storage.postPurchase({
        date: today(),
        supplierId: selectedSupplier,
        billNumber: '',
        lines: resolved,
        billAmountPaise: Math.round(total * 100),
        paidAmountPaise: Math.round(Number(paid || 0) * 100),
        note: ''
      });
    });

    setLines([{ name: '', quantity: '', unit: 'kg', price: '' }]);
    setPaid('0');
    setSelectedSupplier('');
  }

  return (
    <div className="im-form">
      <p className="im-kicker">PURCHASE BILL</p>
      <h2>Record purchase</h2>

      <label>
        Supplier
        <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} required>
          <option value="">Select supplier…</option>
          {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>

      <div className="im-line-head">
        <span>Item</span><span>Qty</span><span>Unit</span><span>Rate ₹</span><span>Total</span>
      </div>

      {lines.map((line, idx) => (
        <div className="im-purchase-line" key={idx}>
          <input
            value={line.name}
            onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, name: e.target.value } : l))}
            placeholder="Item name"
            required
          />
          <input
            value={line.quantity}
            onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))}
            type="number"
            min="0.01"
            step="0.01"
            required
          />
          <select value={line.unit} onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, unit: e.target.value } : l))}>
            <option>kg</option><option>litre</option><option>piece</option>
          </select>
          <input
            value={line.price}
            onChange={e => setLines(lines.map((l, i) => i === idx ? { ...l, price: e.target.value } : l))}
            type="number"
            min="0"
            step="0.01"
            required
          />
          <b>{money(Math.round(Number(line.quantity || 0) * Number(line.price || 0) * 100))}</b>
          {lines.length > 1 && (
            <button
              type="button"
              className="im-remove"
              onClick={() => setLines(lines.filter((_, i) => i !== idx))}
            >×</button>
          )}
        </div>
      ))}

      <button type="button" className="im-text-button" onClick={() => setLines([...lines, { name: '', quantity: '', unit: 'kg', price: '' }])}>
        + Add line
      </button>

      <div className="im-bill-total">
        <label>
          Paid now (₹)
          <input value={paid} onChange={e => setPaid(e.target.value)} type="number" min="0" step="0.01" />
        </label>
        <strong>Total: {money(Math.round(total * 100))}</strong>
        <button onClick={submit}>Post Bill →</button>
      </div>
    </div>
  );
}

function CustomerWorkspace({ customers, items, save, refresh }: any) {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [paid, setPaid] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !quantity || !rate) return;

    const total = Number(quantity) * Number(rate);
    save(() => {
      storage.postSale({
        date: today(),
        customerId: selectedCustomer,
        saleType: 'RETAIL',
        lines: [{
          itemId: items[0]?.id,
          quantity: Number(quantity),
          unit: 'piece',
          unitPricePaise: Math.round(Number(rate) * 100)
        }],
        paidAmountPaise: Math.round(Number(paid || 0) * 100),
        note: ''
      });
    });

    setSelectedCustomer('');
    setQuantity('');
    setRate('');
    setPaid('');
  }

  return (
    <div className="im-form">
      <p className="im-kicker">SALE</p>
      <h2>Record sale</h2>

      <label>
        Customer
        <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} required>
          <option value="">Select customer…</option>
          {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      <div className="im-three">
        <label>
          Quantity
          <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Rate (₹)
          <input value={rate} onChange={e => setRate(e.target.value)} type="number" min="0" step="0.01" required />
        </label>
        <label>
          Paid (₹)
          <input value={paid} onChange={e => setPaid(e.target.value)} type="number" min="0" step="0.01" />
        </label>
      </div>

      <button onClick={submit}>Post Sale →</button>
    </div>
  );
}

function ProductionWorkspace({ products, materials, save, refresh }: any) {
  return <div className="im-form"><p className="im-kicker">PRODUCTION</p><h2>Record production</h2><p className="im-empty">Production workspace - manage batches and track output</p></div>;
}

function RecipesWorkspace({ products, materials, save, refresh }: any) {
  return <div className="im-form"><p className="im-kicker">RECIPES</p><h2>Manage recipes</h2><p className="im-empty">Recipe management workspace</p></div>;
}

function SupplierLedgerWorkspace({ suppliers, save, refresh }: any) {
  const [selected, setSelected] = useState('');
  const [ledger, setLedger] = useState<any>(null);

  useEffect(() => {
    if (selected) {
      setLedger(storage.getSupplierLedger(selected));
    }
  }, [selected]);

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
        <div className="im-ledger-summary">
          <div><span>Purchased</span><strong>{money(ledger.summary.totalPurchased)}</strong></div>
          <div><span>Paid</span><strong>{money(ledger.summary.totalPaid)}</strong></div>
          <div><span>Advance</span><strong>{money(ledger.summary.totalAdvance)}</strong></div>
          <div><span>Outstanding</span><strong className={ledger.summary.outstanding > 0 ? 'danger' : ''}>{money(ledger.summary.outstanding)}</strong></div>
        </div>
      )}
    </div>
  );
}

function CustomerLedgerWorkspace({ customers, save, refresh }: any) {
  const [selected, setSelected] = useState('');
  const [ledger, setLedger] = useState<any>(null);

  useEffect(() => {
    if (selected) {
      setLedger(storage.getCustomerLedger(selected));
    }
  }, [selected]);

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
        <div className="im-ledger-summary">
          <div><span>Sales</span><strong>{money(ledger.summary.totalSales)}</strong></div>
          <div><span>Received</span><strong>{money(ledger.summary.totalPaid)}</strong></div>
          <div><span>Outstanding</span><strong className={ledger.summary.outstanding > 0 ? 'danger' : ''}>{money(ledger.summary.outstanding)}</strong></div>
        </div>
      )}
    </div>
  );
}

function DailyClosingWorkspace({ save, refresh }: any) {
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

function ReportsWorkspace() {
  return <div className="im-form"><p className="im-kicker">REPORTS</p><h2>Analysis</h2><p className="im-empty">Reports and analysis workspace</p></div>;
}

function ExpenseForm({ save, refresh }: any) {
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

function SettingsWorkspace() {
  async function exportData() {
    storage.exportJSON();
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

      <div style={{ background: '#fee7e5', border: '1px solid #f4c4be', borderRadius: '9px', padding: '15px' }}>
        <h3>Import</h3>
        <form onSubmit={(e: any) => {
          e.preventDefault();
          const input = e.target.querySelector('input[type="file"]') as HTMLInputElement;
          if (input?.files?.[0]) {
            storage.importJSON(input.files[0]).then(success => {
              if (success) {
                alert('✓ Data imported');
                window.location.reload();
              } else {
                alert('✗ Import failed');
              }
            });
          }
        }}>
          <input type="file" accept=".json" required />
          <button style={{ background: '#a43932', color: '#fff', border: 0, borderRadius: '7px', padding: '10px 15px', marginTop: '10px', cursor: 'pointer' }}>
            ⬆️ Import
          </button>
        </form>
      </div>
    </div>
  );
}
