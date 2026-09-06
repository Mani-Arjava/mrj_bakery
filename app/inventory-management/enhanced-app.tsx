'use client';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardData, Item, Party, RecipeDetail } from '@/lib/inventory/types';

const today = () => new Date().toISOString().slice(0, 10);
const money = (value = 0) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value / 100);
const empty: DashboardData = { generatedAt: '', configured: false, cards: { rawMaterialValuePaise: 0, lowStockCount: 0, todayPurchasePaise: 0, todayProductionUnits: 0, todaySalesPaise: 0, supplierOutstandingPaise: 0, customerOutstandingPaise: 0, todayExpensePaise: 0, todayProfitPaise: 0 }, lowStock: [], topProducts: [], recentActivity: [] };

type View = 'Dashboard' | 'Purchases' | 'Customers' | 'Production' | 'Expenses' | 'Recipes' | 'Supplier Ledger' | 'Customer Ledger' | 'Daily Closing' | 'Reports' | 'Settings';

interface Stock { [key: string]: { quantity: number; averageCostPaise: number } }

export default function EnhancedApp() {
  const [view, setView] = useState<View>('Dashboard');
  const [dashboard, setDashboard] = useState(empty);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [stock, setStock] = useState<Stock>({});

  const refresh = useCallback(async () => {
    const [dash, master] = await Promise.all([fetch('/api/inventory/dashboard'), fetch('/api/inventory/master')]);
    if (dash.ok) setDashboard(await dash.json());
    else setError((await dash.json()).error || 'Unable to load the inventory dashboard.');
    if (master.ok) {
      const data = await master.json();
      setItems(data.items);
      setSuppliers(data.suppliers);
      setCustomers(data.customers);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function save(path: string, body: unknown) {
    setError('');
    setNotice('');
    const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Could not save this record.');
      return false;
    }
    setNotice('Saved successfully.');
    await refresh();
    return true;
  }

  async function setup() {
    if (await save('/api/inventory/setup', {})) setNotice('Workbook initialized. Start by adding a supplier or customer from the relevant screen.');
  }

  async function logout() {
    await fetch('/api/inventory/auth/logout', { method: 'POST' });
    window.location.assign('/inventory-management/login');
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
          <span>Signed in as admin</span>
          <button onClick={logout}>Sign out</button>
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

        {view === 'Dashboard' && <Dashboard data={dashboard} setup={setup} />}
        {view === 'Purchases' && <PurchaseWorkspace suppliers={suppliers} items={rawMaterials} save={save} />}
        {view === 'Customers' && <CustomerWorkspace customers={customers} items={finishedProducts} save={save} />}
        {view === 'Production' && <ProductionWorkspace products={finishedProducts} materials={rawMaterials} save={save} />}
        {view === 'Recipes' && <RecipesWorkspace products={finishedProducts} materials={rawMaterials} save={save} />}
        {view === 'Supplier Ledger' && <SupplierLedgerWorkspace suppliers={suppliers} />}
        {view === 'Customer Ledger' && <CustomerLedgerWorkspace customers={customers} />}
        {view === 'Daily Closing' && <DailyClosingWorkspace save={save} />}
        {view === 'Reports' && <ReportsWorkspace />}
        {view === 'Expenses' && <ExpenseForm save={save} />}
        {view === 'Settings' && <SettingsWorkspace />}
      </section>
    </main>
  );
}

// ============= Dashboard =============
function Dashboard({ data, setup }: { data: DashboardData; setup: () => void }) {
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getDateLabel = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch(dateRange) {
      case 'today': return today.toLocaleDateString('en-IN');
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toLocaleDateString('en-IN');
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - today.getDay());
        return `${weekStart.toLocaleDateString('en-IN')} - ${today.toLocaleDateString('en-IN')}`;
      case 'month':
        return today.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
      case 'custom':
        return `${customStart} - ${customEnd}`;
      default: return '';
    }
  };

  const values = [
    ['Raw-material value', money(data.cards.rawMaterialValuePaise)],
    ['Low stock items', String(data.cards.lowStockCount)],
    ["Today's purchases", money(data.cards.todayPurchasePaise)],
    ["Today's sales", money(data.cards.todaySalesPaise)],
    ["Today's production", `${data.cards.todayProductionUnits} units`],
    ['Supplier due', money(data.cards.supplierOutstandingPaise)],
    ['Customer due', money(data.cards.customerOutstandingPaise)],
    ["Today's expenses", money(data.cards.todayExpensePaise)],
    ["Today's net result", money(data.cards.todayProfitPaise)]
  ];

  return (
    <>
      {!data.configured && (
        <section className="im-setup">
          <div>
            <p className="im-kicker">FIRST-TIME SETUP</p>
            <h2>Initialize local Excel workbook</h2>
            <p>Create data/inventory.xlsx with the inventory tabs once, then start from Purchases or Customers.</p>
          </div>
          <button onClick={setup}>Create workbook →</button>
        </section>
      )}

      <div className="im-filter-bar">
        <span className="im-filter-label">Period:</span>
        {(['today', 'yesterday', 'week', 'month', 'custom'] as const).map(option => (
          <button
            key={option}
            className={`im-filter-btn ${dateRange === option ? 'active' : ''}`}
            onClick={() => setDateRange(option)}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
        {dateRange === 'custom' && (
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
        )}
        {dateRange !== 'custom' && <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#718078' }}>{getDateLabel()}</span>}
      </div>

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
                <th>Material</th>
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
    </>
  );
}

// ============= Production Workspace =============
function ProductionWorkspace({ products, materials, save }: { products: Item[]; materials: Item[]; save: (path: string, body: unknown) => Promise<boolean> }) {
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [plannedQty, setPlannedQty] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [wastage, setWastage] = useState('0');
  const [team, setTeam] = useState('');
  const [note, setNote] = useState('');
  const [stockCheck, setStockCheck] = useState<Array<{ name: string; required: number; available: number; unit: string; status: 'ok' | 'low' | 'unavailable' }>>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      setConfirmed(false);
      setStockCheck([]);
      setShowWarning(false);
      fetch(`/api/inventory/transactions/recipe?productId=${selectedProduct}`)
        .then(r => r.json())
        .then(data => {
          setRecipe(data);
          if (data && data.lines && plannedQty) {
            checkStock(data.lines, Number(plannedQty));
          }
        });
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedProduct && plannedQty && recipe?.lines) {
      checkStock(recipe.lines, Number(plannedQty));
    }
  }, [plannedQty, selectedProduct, recipe?.lines]);

  async function checkStock(recipeLinesParam: Array<{ materialId: string; materialName: string; quantity: number; unit: string }>, qty: number) {
    const checks: Array<{ name: string; required: number; available: number; unit: string; status: 'ok' | 'low' | 'unavailable' }> = [];
    for (const line of recipeLinesParam) {
      const stock = await fetch(`/api/inventory/transactions/stock-balance?itemId=${line.materialId}`).then(r => r.json());
      const required = line.quantity * qty;
      const available = stock.quantity || 0;
      const status: 'ok' | 'low' | 'unavailable' = available === 0 ? 'unavailable' : available < required ? 'low' : 'ok';
      checks.push({
        name: line.materialName,
        required,
        available,
        unit: line.unit,
        status
      });
    }
    setStockCheck(checks);
    setShowWarning(checks.some(c => c.status !== 'ok'));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selectedProduct || !plannedQty || !actualQty) {
      return;
    }

    // If there's a warning and not confirmed, just show warning state
    if (showWarning && !confirmed) {
      setConfirmed(true);
      return;
    }

    // Proceed with production
    if (recipe?.lines) {
      setLoading(true);
      const consumption = recipe.lines.map(line => ({
        itemId: line.materialId,
        quantity: Number(plannedQty) * line.quantity,
        unit: line.unit
      }));

      const success = await save('/api/inventory/transactions/production', {
        date: today(),
        productId: selectedProduct,
        quantityProduced: Number(actualQty),
        team,
        consumption,
        note: note || `Planned: ${plannedQty}, Actual: ${actualQty}${wastage ? `, Wastage: ${wastage}%` : ''}`
      });

      setLoading(false);

      if (success) {
        setSelectedProduct('');
        setPlannedQty('');
        setActualQty('');
        setWastage('0');
        setTeam('');
        setNote('');
        setStockCheck([]);
        setConfirmed(false);
      }
    }
  }

  return (
    <div className="im-operational">
      {products.length === 0 ? (
        <Empty title="No finished products" copy="Add a finished product in Master Data first." />
      ) : (
        <form className="im-form im-transaction" onSubmit={submit}>
          <p className="im-kicker">PRODUCTION SESSION</p>
          <h2>Record production batch</h2>

          <label>
            Product
            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} required>
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          {recipe && recipe.lines.length > 0 ? (
            <>
              <p className="im-form-subtitle">Production Planning</p>
              <div className="im-two">
                <label>
                  Planned batch quantity
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={plannedQty}
                    onChange={e => setPlannedQty(e.target.value)}
                    placeholder="e.g. 500"
                    required
                  />
                </label>
                <label>
                  Actual quantity produced
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={actualQty}
                    onChange={e => setActualQty(e.target.value)}
                    placeholder="e.g. 480"
                    required
                  />
                </label>
              </div>

              <p className="im-form-subtitle">Stock requirement verification</p>
              {stockCheck.length > 0 && (
                <div className="im-stock-check">
                  {stockCheck.map((item, idx) => (
                    <div key={idx} className={`im-check-item ${item.status}`}>
                      <span><strong>{item.name}</strong></span>
                      <span className="required">Required: <strong>{item.required}</strong> {item.unit}</span>
                      <span className="available">Available: <strong>{item.available}</strong> {item.unit}</span>
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

              <div className="im-three">
                <label>
                  Team / Operator
                  <input
                    type="text"
                    value={team}
                    onChange={e => setTeam(e.target.value)}
                    placeholder="e.g. Morning shift"
                  />
                </label>
                <label>
                  Wastage / Rejected (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={wastage}
                    onChange={e => setWastage(e.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select>
                    <option>COMPLETED</option>
                    <option>PARTIAL</option>
                  </select>
                </label>
              </div>

              <label>
                Production Notes
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="Any issues, delays, quality notes…"
                />
              </label>

              <button type="submit" disabled={loading}>
                {loading ? 'Processing…' : showWarning && !confirmed ? 'Continue Production →' : 'Post Production →'}
              </button>

              {/* Recipe Summary */}
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
                    {recipe.lines.map((line, idx) => (
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
          ) : (
            <div className="im-notice" style={{ background: '#e2f2dd', color: '#285d40' }}>
              <strong>ℹ Recipe required</strong>
              <p>Define a recipe for {selectedProduct ? 'this product' : 'the selected product'} in the Recipes section first.</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

// ============= Recipes Workspace =============
function RecipesWorkspace({ products, materials, save }: { products: Item[]; materials: Item[]; save: (path: string, body: unknown) => Promise<boolean> }) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [lines, setLines] = useState<Array<{ materialId: string; quantity: string; unit: string }>>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      fetch(`/api/inventory/transactions/recipe?productId=${selectedProduct}`)
        .then(r => r.json())
        .then((data: RecipeDetail) => {
          setRecipe(data);
          if (data && data.lines) {
            setLines(data.lines.map((l: any) => ({ materialId: l.materialId, quantity: String(l.quantity), unit: l.unit })));
          } else {
            setLines([{ materialId: '', quantity: '', unit: 'kg' }]);
          }
          setEditing(false);
        });
    }
  }, [selectedProduct]);

  async function submitRecipe(e: FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    const validLines = lines.filter(l => l.materialId && Number(l.quantity) > 0);
    if (validLines.length === 0) return;

    await save('/api/inventory/recipes', {
      productId: selectedProduct,
      lines: validLines.map(l => ({
        materialId: l.materialId,
        quantity: Number(l.quantity),
        unit: l.unit
      }))
    });
    setEditing(false);
  }

  return (
    <div className="im-form">
      <p className="im-kicker">RECIPE MANAGEMENT</p>
      <h2>Define product recipes</h2>

      <label>
        Product
        <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
          <option value="">Select product…</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                    {recipe.lines.map((line, idx) => (
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
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
                      <option>kg</option>
                      <option>litre</option>
                      <option>piece</option>
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

// ============= Supplier Ledger =============
function SupplierLedgerWorkspace({ suppliers }: { suppliers: Party[] }) {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [ledger, setLedger] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<'PAYMENT' | 'ADVANCE'>('PAYMENT');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedSupplier) {
      loadLedger();
    }
  }, [selectedSupplier]);

  async function loadLedger() {
    try {
      const response = await fetch(`/api/inventory/transactions/supplier-ledger?supplierId=${selectedSupplier}`);
      if (response.ok) {
        const data = await response.json();
        setLedger(data);
      }
    } catch (error) {
      console.error('Failed to load ledger:', error);
    }
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!selectedSupplier || !paymentAmount) return;

    setLoading(true);
    try {
      const response = await fetch('/api/inventory/transactions/supplier-payment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date: today(),
          supplierId: selectedSupplier,
          amountPaise: Math.round(Number(paymentAmount) * 100),
          type: paymentType,
          note: paymentNote
        })
      });

      if (response.ok) {
        setPaymentAmount('');
        setPaymentNote('');
        setShowPaymentForm(false);
        await loadLedger();
      }
    } catch (error) {
      console.error('Payment submission failed:', error);
    } finally {
      setLoading(false);
    }
  }

  const supplier = suppliers.find(s => s.id === selectedSupplier);

  return (
    <div className="im-form">
      <p className="im-kicker">SUPPLIER ACCOUNT</p>
      <h2>Payment ledger & settlement</h2>

      <label>
        Supplier
        <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
          <option value="">Select supplier…</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>

      {ledger && supplier && (
        <>
          <div className="im-ledger-summary">
            <div>
              <span>Total Purchased</span>
              <strong>{money(ledger.summary.totalPurchased)}</strong>
            </div>
            <div>
              <span>Total Paid</span>
              <strong>{money(ledger.summary.totalPaid)}</strong>
            </div>
            <div>
              <span>Advances</span>
              <strong>{money(ledger.summary.totalAdvance)}</strong>
            </div>
            <div>
              <span>Outstanding Balance</span>
              <strong className={ledger.summary.outstanding > 0 ? 'danger' : ''}>{money(ledger.summary.outstanding)}</strong>
            </div>
          </div>

          {showPaymentForm ? (
            <form className="im-payment-form" onSubmit={submitPayment}>
              <p className="im-form-subtitle">Record Payment for {supplier.name}</p>
              
              <div className="im-two">
                <label>
                  Payment Type
                  <select value={paymentType} onChange={e => setPaymentType(e.target.value as 'PAYMENT' | 'ADVANCE')}>
                    <option value="PAYMENT">Payment Against Invoice</option>
                    <option value="ADVANCE">Advance Payment</option>
                  </select>
                </label>
                <label>
                  Amount (₹)
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder={paymentType === 'ADVANCE' ? 'Advance amount' : 'Payment amount'}
                    required
                  />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  rows={2}
                  placeholder="Invoice reference, cheque number, etc."
                />
              </label>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading}>{loading ? 'Processing…' : 'Record Payment'}</button>
                <button type="button" onClick={() => setShowPaymentForm(false)} className="im-secondary">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowPaymentForm(true)} type="button">+ Record Payment</button>
          )}

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
        </>
      )}
    </div>
  );
}

// ============= Customer Ledger =============
function CustomerLedgerWorkspace({ customers }: { customers: Party[] }) {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [ledger, setLedger] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCustomer) {
      loadLedger();
    }
  }, [selectedCustomer]);

  async function loadLedger() {
    try {
      const response = await fetch(`/api/inventory/transactions/customer-ledger?customerId=${selectedCustomer}`);
      if (response.ok) {
        const data = await response.json();
        setLedger(data);
      }
    } catch (error) {
      console.error('Failed to load ledger:', error);
    }
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount) return;

    setLoading(true);
    try {
      const response = await fetch('/api/inventory/transactions/customer-payment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date: today(),
          customerId: selectedCustomer,
          amountPaise: Math.round(Number(paymentAmount) * 100),
          note: paymentNote
        })
      });

      if (response.ok) {
        setPaymentAmount('');
        setPaymentNote('');
        setShowPaymentForm(false);
        await loadLedger();
      }
    } catch (error) {
      console.error('Payment submission failed:', error);
    } finally {
      setLoading(false);
    }
  }

  const customer = customers.find(c => c.id === selectedCustomer);

  return (
    <div className="im-form">
      <p className="im-kicker">CUSTOMER ACCOUNT</p>
      <h2>Sales ledger & collections</h2>

      <label>
        Customer
        <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
          <option value="">Select customer…</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      {ledger && customer && (
        <>
          <div className="im-ledger-summary">
            <div>
              <span>Total Sales</span>
              <strong>{money(ledger.summary.totalSales)}</strong>
            </div>
            <div>
              <span>Amount Received</span>
              <strong>{money(ledger.summary.totalPaid)}</strong>
            </div>
            <div>
              <span>Outstanding</span>
              <strong className={ledger.summary.outstanding > 0 ? 'danger' : ''}>{money(ledger.summary.outstanding)}</strong>
            </div>
            <div>
              <span>Last Sale</span>
              <strong>{ledger.ledger[ledger.ledger.length - 1]?.date || '—'}</strong>
            </div>
          </div>

          {showPaymentForm ? (
            <form className="im-payment-form" onSubmit={submitPayment}>
              <p className="im-form-subtitle">Record Payment from {customer.name}</p>
              
              <label>
                Amount Received (₹)
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="Payment amount"
                  required
                />
              </label>

              <label>
                Notes
                <textarea
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  rows={2}
                  placeholder="Payment method, reference, etc."
                />
              </label>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading}>{loading ? 'Processing…' : 'Record Payment'}</button>
                <button type="button" onClick={() => setShowPaymentForm(false)} className="im-secondary">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowPaymentForm(true)} type="button">+ Record Payment</button>
          )}

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
        </>
      )}
    </div>
  );
}

// ============= Daily Closing =============
function DailyClosingWorkspace({ save }: { save: (path: string, body: unknown) => Promise<boolean> }) {
  const [closingSummary, setClosingSummary] = useState<any>(null);
  const [physicalCash, setPhysicalCash] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    fetch(`/api/inventory/transactions/daily-closing?date=${today()}`)
      .then(r => r.json())
      .then(data => setClosingSummary(data));
  }, []);

  async function submitClosing(e: FormEvent) {
    e.preventDefault();
    if (!physicalCash) return;
    await save('/api/inventory/transactions/daily-closing', {
      date: today(),
      physicalCashPaise: Math.round(Number(physicalCash) * 100),
      note
    });
    fetch(`/api/inventory/transactions/daily-closing?date=${today()}`)
      .then(r => r.json())
      .then(data => setClosingSummary(data));
  }

  return (
    <div className="im-form">
      <p className="im-kicker">END OF DAY</p>
      <h2>Daily closing & reconciliation</h2>

      {closingSummary && (
        <>
          <div className="im-closing-summary">
            <h3>Closing Summary for {today()}</h3>
            <div className="im-closing-row">
              <span>Opening Cash</span>
              <strong>{money(closingSummary.openingCashPaise)}</strong>
            </div>
            <div className="im-closing-row">
              <span>+ Receipts (Sales & Payments)</span>
              <strong>{money(closingSummary.receiptsPaise)}</strong>
            </div>
            <div className="im-closing-row">
              <span>- Payments (Expenses & Supplier)</span>
              <strong>{money(closingSummary.paymentsPaise)}</strong>
            </div>
            <div className="im-closing-row">
              <span>= System Closing Cash</span>
              <strong>{money(closingSummary.systemClosingPaise)}</strong>
            </div>
          </div>

          {!closingSummary.isClosed ? (
            <form onSubmit={submitClosing}>
              <label>
                Physical Cash Count (₹)
                <input type="number" step="1" value={physicalCash} onChange={e => setPhysicalCash(e.target.value)} required />
              </label>

              <label>
                Notes
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} />
              </label>

              <button type="submit">Close Day</button>
            </form>
          ) : (
            <div className="im-notice">
              <strong>Day Closed</strong>
              <p>Physical Cash: {money(closingSummary.physicalCashPaise)}</p>
              <p>Variance: {money(closingSummary.variancePaise)}</p>
              {closingSummary.note && <p>Note: {closingSummary.note}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============= Utility Components =============
type PurchaseLine = { name: string; quantity: string; unit: string; price: string };
const newLine = (): PurchaseLine => ({ name: '', quantity: '', unit: 'kg', price: '' });

function PurchaseWorkspace({ suppliers, items, save }: { suppliers: Party[]; items: Item[]; save: (path: string, body: unknown) => Promise<boolean> }) {
  const [date, setDate] = useState(today());
  const [activity, setActivity] = useState<any>({ bills: [], supplierSummary: [], summary: { totalPaise: 0, billCount: 0, overallOutstandingPaise: 0, overallPurchasedPaise: 0, overallBillCount: 0 } });
  const [selected, setSelected] = useState<Party | null>(null);
  const [creating, setCreating] = useState(false);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/inventory/purchases?date=${date}`);
    if (response.ok) setActivity(await response.json());
  }, [date]);

  useEffect(() => { load(); }, [load]);

  async function addSupplier(form: FormData) {
    if (await save('/api/inventory/master', { kind: 'supplier', data: { name: form.get('name'), phone: form.get('phone'), contactPerson: form.get('contactPerson'), address: form.get('address') } })) setModal(false);
  }

  const partyBills = selected ? activity.bills.filter((bill: any) => bill.supplierId === selected.id) : [];
  const selectedSummary = selected ? activity.supplierSummary.find((row: any) => row.supplierId === selected.id) : undefined;

  return (
    <div className="im-operational">
      <DateStrip date={date} setDate={setDate} />
      {selected ? (
        <section className="im-selected-party">
          <div className="im-selected-party-head">
            <div>
              <p className="im-kicker">SUPPLIER ACCOUNT</p>
              <h2>{selected.name}</h2>
              <span>{selected.contactPerson || selected.phone || selected.address || 'Purchase account'}</span>
            </div>
            <button className="im-secondary" onClick={() => { setSelected(null); setCreating(false); }}>← All suppliers</button>
          </div>
          <div className="im-party-summary">
            <span><b>{selectedSummary?.billCount || 0}</b> total bills</span>
            <span><b>{money(selectedSummary?.totalPaise || 0)}</b> total purchased</span>
            <span><b>{money(selectedSummary?.pendingPaise || 0)}</b> pending</span>
            <button onClick={() => setCreating(true)}>+ New bill for {selected.name}</button>
          </div>
        </section>
      ) : (
        <>
          <section className="im-summary-row">
            <span><b>{activity.summary.overallBillCount}</b> total bills</span>
            <span><b>{money(activity.summary.overallPurchasedPaise)}</b> total purchased</span>
            <span><b>{money(activity.summary.overallOutstandingPaise)}</b> overall supplier balance</span>
          </section>
          <div className="im-workspace-head">
            <div>
              <p className="im-kicker">CHOOSE A SUPPLIER</p>
              <h2>Purchase accounts</h2>
            </div>
            <button onClick={() => setModal(true)}>+ New supplier</button>
          </div>
          <div className="im-party-cards">
            {suppliers.map(supplier => {
              const summary = activity.supplierSummary.find((row: any) => row.supplierId === supplier.id);
              return (
                <button className="im-party-card" key={supplier.id} onClick={() => setSelected(supplier)}>
                  <span>{supplier.name.slice(0, 1)}</span>
                  <b>{supplier.name}</b>
                  <small>{supplier.contactPerson || supplier.phone || 'Open supplier'}</small>
                  <em>{summary?.billCount || 0} bills · {money(summary?.totalPaise || 0)} purchased</em>
                  <strong>{money(summary?.pendingPaise || 0)} pending</strong>
                </button>
              );
            })}
            {!suppliers.length && <Empty title="No suppliers yet" copy="Create your first supplier without leaving this screen." />}
          </div>
        </>
      )}
      {selected && creating && <PurchaseBill supplier={selected} items={items} save={save} done={() => { setCreating(false); load(); }} />}
      {selected && <section className="im-bill-list">
        <div className="im-panel-title">
          <h2>{date === today() ? `Bills today · ${selected.name}` : `Bills on ${date}`}</h2>
          <span>{partyBills.length} bills</span>
        </div>
        {partyBills.length ? partyBills.map((bill: any) => <BillCard bill={bill} key={bill.id} />) : <Empty title="No bills for this date" copy={`Use "New bill for ${selected.name}" to record a purchase.`} />}
      </section>}
      <Modal open={modal} title="New supplier" close={() => setModal(false)}>
        <PartyForm kind="supplier" submit={addSupplier} />
      </Modal>
    </div>
  );
}

type Bill = { id: string; supplierId: string; supplier: string; billNumber: string; billAmountPaise: number; paidAmountPaise: number; pendingPaise: number; lines: Array<{ name: string; quantity: number; unit: string; totalPaise: number }> };

function PurchaseBill({ supplier, items, save, done }: { supplier: Party; items: Item[]; save: (path: string, body: unknown) => Promise<boolean>; done: () => void }) {
  const [lines, setLines] = useState([newLine()]);
  const [paid, setPaid] = useState('0');
  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0);

  function edit(index: number, key: keyof PurchaseLine, value: string) {
    setLines(lines.map((line, i) => i === index ? { ...line, [key]: value } : line));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const valid = lines.filter(line => line.name.trim() && Number(line.quantity) > 0 && Number(line.price) >= 0);
    if (!valid.length) return;
    const resolved = [];
    for (const line of valid) {
      let found = items.find(item => item.name.toLowerCase() === line.name.trim().toLowerCase());
      if (!found) {
        const response = await fetch('/api/inventory/master', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind: 'item', data: { name: line.name.trim(), type: 'RAW_MATERIAL', baseUnit: line.unit, reorderLevel: 0 } })
        });
        if (!response.ok) return;
        found = { id: (await response.json()).id } as Item;
      }
      resolved.push({ itemId: found.id, quantity: Number(line.quantity), unit: line.unit, unitPricePaise: Math.round(Number(line.price) * 100) });
    }
    const success = await save('/api/inventory/transactions/purchase', {
      date: today(),
      supplierId: supplier.id,
      billNumber: '',
      lines: resolved,
      billAmountPaise: Math.round(total * 100),
      paidAmountPaise: Math.round(Number(paid || 0) * 100)
    });
    if (success) done();
  }

  return (
    <form className="im-bill-editor" onSubmit={submit}>
      <div>
        <p className="im-kicker">{supplier.name.toUpperCase()}</p>
        <h2>New purchase bill</h2>
        <p>Add raw materials directly. A new item is added to inventory automatically.</p>
      </div>
      <div className="im-line-head">
        <span>Item</span><span>Qty</span><span>Unit</span><span>Rate ₹</span><span>Total</span>
      </div>
      {lines.map((line, index) => (
        <div className="im-purchase-line" key={index}>
          <input list="raw-items" value={line.name} onChange={e => edit(index, 'name', e.target.value)} placeholder="Maida, Sugar, Yeast…" required />
          <input value={line.quantity} onChange={e => edit(index, 'quantity', e.target.value)} type="number" min="0.01" step="0.01" required />
          <select value={line.unit} onChange={e => edit(index, 'unit', e.target.value)}>
            <option>kg</option><option>litre</option><option>piece</option>
          </select>
          <input value={line.price} onChange={e => edit(index, 'price', e.target.value)} type="number" min="0" step="0.01" required />
          <b>{money(Math.round(Number(line.quantity || 0) * Number(line.price || 0) * 100))}</b>
          {lines.length > 1 && <button type="button" className="im-remove" onClick={() => setLines(lines.filter((_, i) => i !== index))}>×</button>}
        </div>
      ))}
      <datalist id="raw-items">
        {items.filter(item => item.type === 'RAW_MATERIAL').map(item => <option value={item.name} key={item.id} />)}
      </datalist>
      <button type="button" className="im-text-button" onClick={() => setLines([...lines, newLine()])}>+ Add another item</button>
      <div className="im-bill-total">
        <label>Payment received now (₹)<input value={paid} onChange={e => setPaid(e.target.value)} type="number" min="0" step="0.01" /></label>
        <strong>Bill total: {money(Math.round(total * 100))}</strong>
        <button>Post bill →</button>
      </div>
    </form>
  );
}

function CustomerWorkspace({ customers, items, save }: { customers: Party[]; items: Item[]; save: (path: string, body: unknown) => Promise<boolean> }) {
  const [type, setType] = useState<'WHOLESALE' | 'RETAIL'>('WHOLESALE');
  const [selected, setSelected] = useState<Party | null>(null);
  const [creating, setCreating] = useState(false);
  const [modal, setModal] = useState(false);
  const list = customers.filter(customer => customer.customerType === type);

  async function addCustomer(form: FormData) {
    if (await save('/api/inventory/master', { kind: 'customer', data: { name: form.get('name'), phone: form.get('phone'), contactPerson: form.get('contactPerson'), address: form.get('address'), customerType: type } })) setModal(false);
  }

  return (
    <div className="im-operational">
      <div className="im-workspace-head">
        <div>
          <p className="im-kicker">CUSTOMER DIRECTORY</p>
          <h2>{selected ? selected.name : 'Customer accounts'}</h2>
        </div>
        <button onClick={() => setModal(true)}>+ New {type.toLowerCase()} customer</button>
      </div>
      <div className="im-segmented">
        <button className={type === 'WHOLESALE' ? 'selected' : ''} onClick={() => { setType('WHOLESALE'); setSelected(null); setCreating(false); }}>Wholesale customers</button>
        <button className={type === 'RETAIL' ? 'selected' : ''} onClick={() => { setType('RETAIL'); setSelected(null); setCreating(false); }}>Retail customers</button>
      </div>
      {selected ? (
        <section className="im-selected-party">
          <div className="im-selected-party-head">
            <div>
              <p className="im-kicker">{type} CUSTOMER ACCOUNT</p>
              <h2>{selected.name}</h2>
              <span>{selected.contactPerson || selected.phone || 'Sales account'}</span>
            </div>
            <button className="im-secondary" onClick={() => { setSelected(null); setCreating(false); }}>← All customers</button>
          </div>
          <div className="im-party-summary">
            <span>Customer history</span>
            <button onClick={() => setCreating(true)}>+ New bill for {selected.name}</button>
          </div>
        </section>
      ) : (
        <div className="im-party-cards">
          {list.map(customer => (
            <button className="im-party-card" key={customer.id} onClick={() => setSelected(customer)}>
              <span>{customer.name.slice(0, 1)}</span>
              <b>{customer.name}</b>
              <small>{customer.phone || customer.contactPerson || type.toLowerCase()}</small>
            </button>
          ))}
          {!list.length && <Empty title={`No ${type.toLowerCase()} customers`} copy="Add a customer with the button above." />}
        </div>
      )}
      {selected && creating && <QuickSale customer={selected} products={items.filter(item => item.type === 'FINISHED_GOOD')} save={save} done={() => { setCreating(false); setSelected(null); }} />}
      <Modal open={modal} title={`New ${type.toLowerCase()} customer`} close={() => setModal(false)}>
        <PartyForm kind="customer" submit={addCustomer} />
      </Modal>
    </div>
  );
}

function QuickSale({ customer, products, save, done }: { customer: Party; products: Item[]; save: (path: string, body: unknown) => Promise<boolean>; done: () => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const price = Number(f.get('price'));
    const qty = Number(f.get('quantity'));
    if (await save('/api/inventory/transactions/sale', {
      date: today(),
      customerId: customer.id,
      saleType: customer.customerType || 'RETAIL',
      lines: [{ itemId: f.get('productId'), quantity: qty, unit: f.get('unit'), unitPricePaise: Math.round(price * 100) }],
      paidAmountPaise: Math.round(Number(f.get('paid') || 0) * 100)
    })) done();
  }

  return (
    <form className="im-bill-editor" onSubmit={submit}>
      <p className="im-kicker">{customer.name.toUpperCase()}</p>
      <h2>Quick sale</h2>
      {products.length ? (
        <>
          <div className="im-four">
            <label>Product<select name="productId" required>{products.map(product => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
            <label>Quantity<input name="quantity" type="number" min="0.01" step="0.01" required /></label>
            <label>Rate ₹<input name="price" type="number" min="0" step="0.01" required /></label>
            <label>Paid ₹<input name="paid" type="number" min="0" step="0.01" defaultValue="0" /></label>
          </div>
          <input name="unit" type="hidden" value="piece" />
          <button>Post sale →</button>
        </>
      ) : (
        <p className="im-empty">Add a finished product during production setup before posting sales.</p>
      )}
    </form>
  );
}

function ExpenseForm({ save }: { save: (path: string, body: unknown) => Promise<boolean> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    await save('/api/inventory/transactions/expense', {
      date: f.get('date'),
      category: f.get('category'),
      amountPaise: Math.round(Number(f.get('amount')) * 100),
      note: f.get('note')
    });
  }

  return (
    <form className="im-form im-transaction" onSubmit={submit}>
      <p className="im-kicker">DAILY OPERATING COST</p>
      <h2>Record expense</h2>
      <label>Date<input name="date" type="date" defaultValue={today()} /></label>
      <label>Category<select name="category"><option>Employee wages</option><option>Electricity</option><option>Fuel</option><option>Rent</option><option>Transport</option><option>Maintenance</option><option>Miscellaneous</option></select></label>
      <label>Amount (₹)<input name="amount" type="number" min="0" step="0.01" required /></label>
      <label>Notes<textarea name="note" rows={3} /></label>
      <button>Post expense →</button>
    </form>
  );
}

function DateStrip({ date, setDate }: { date: string; setDate: (date: string) => void }) {
  const shift = (amount: number) => {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + amount);
    setDate(next.toISOString().slice(0, 10));
  };
  return (
    <div className="im-date-strip">
      <button onClick={() => shift(-1)}>← Previous day</button>
      <label><span>Date</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <button onClick={() => shift(1)}>Next day →</button>
    </div>
  );
}

function BillCard({ bill }: { bill: Bill }) {
  return (
    <article className="im-bill-card">
      <div>
        <b>{bill.supplier}</b>
        <span>{bill.billNumber}</span>
      </div>
      <ul>
        {bill.lines.map((line, index) => (
          <li key={index}>
            {line.name} <small>{line.quantity} {line.unit}</small>
            <strong>{money(line.totalPaise)}</strong>
          </li>
        ))}
      </ul>
      <footer>
        <span>Paid {money(bill.paidAmountPaise)}</span>
        <span>Pending <b>{money(bill.pendingPaise)}</b></span>
        <strong>{money(bill.billAmountPaise)}</strong>
      </footer>
    </article>
  );
}

function PartyForm({ kind, submit }: { kind: 'supplier' | 'customer'; submit: (data: FormData) => void }) {
  return (
    <form className="im-modal-form" onSubmit={event => { event.preventDefault(); submit(new FormData(event.currentTarget)); }}>
      <label>Name<input name="name" required autoFocus /></label>
      <label>Phone<input name="phone" inputMode="tel" /></label>
      <label>Contact person<input name="contactPerson" /></label>
      <label>Address<textarea name="address" rows={2} /></label>
      <button>Save {kind} →</button>
    </form>
  );
}

function Modal({ open, title, close, children }: { open: boolean; title: string; close: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="im-modal-backdrop" onMouseDown={close}>
      <section className="im-modal" onMouseDown={event => event.stopPropagation()}>
        <button className="im-modal-close" onClick={close}>×</button>
        <p className="im-kicker">QUICK CREATE</p>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="im-empty">
      <b>{title}</b>
      <p>{copy}</p>
    </div>
  );
}


// ============= Reports Workspace =============
function ReportsWorkspace() {
  const [reportType, setReportType] = useState<'supplier' | 'customer' | 'stock' | 'expense' | 'profit'>('stock');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);
    try {
      const typeMap: Record<string, string> = {
        supplier: 'supplier-analysis',
        customer: 'customer-analysis',
        stock: 'stock',
        expense: 'expenses',
        profit: 'profit'
      };
      const response = await fetch(`/api/inventory/reports?type=${typeMap[reportType]}`);
      if (response.ok) {
        setReportData(await response.json());
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="im-form">
      <p className="im-kicker">ANALYSIS & REPORTING</p>
      <h2>Business Reports</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
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

      <button onClick={loadReport} disabled={loading}>{loading ? 'Loading…' : 'Load Report'}</button>

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
                    <td>{item.quantity} {item.unit}</td>
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

// ============= Settings Workspace =============
function SettingsWorkspace() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch('/api/inventory/backup?action=export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bakery-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
      }
    } finally {
      setExporting(false);
    }
  }

  async function handleBackup() {
    try {
      const response = await fetch('/api/inventory/backup?action=backup');
      if (response.ok) {
        const result = await response.json();
        alert(`Backup created: ${result.timestamp}`);
      }
    } catch (error) {
      alert('Backup failed');
    }
  }

  function handleImport(e: FormEvent<HTMLFormElement>) {
    const input = (e.target as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
    if (!input || !input.files || !input.files[0]) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', input.files[0]);

    fetch('/api/inventory/backup', { method: 'POST', body: formData })
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          alert('Data imported successfully. Please refresh the page.');
        } else {
          alert('Import failed: ' + result.message);
        }
      })
      .finally(() => setImporting(false));
  }

  return (
    <div className="im-form">
      <p className="im-kicker">SYSTEM</p>
      <h2>Backup & Data Management</h2>

      <div style={{ background: '#e7f0d7', border: '1px solid #d2e6ac', borderRadius: '9px', padding: '15px', marginBottom: '18px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '700' }}>Backup Your Data</h3>
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#486356', lineHeight: '1.5' }}>Regularly backup your inventory data. You can export to Excel or create a local backup file.</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExport} disabled={exporting} style={{ background: '#79c998', color: '#fff', border: 0, borderRadius: '7px', padding: '10px 15px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            {exporting ? 'Exporting…' : '↓ Export to Excel'}
          </button>
          <button onClick={handleBackup} style={{ background: '#77a48c', color: '#fff', border: 0, borderRadius: '7px', padding: '10px 15px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            💾 Create Backup
          </button>
        </div>
      </div>

      <div style={{ background: '#fee7e5', border: '1px solid #f4c4be', borderRadius: '9px', padding: '15px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '700', color: '#a43932' }}>Import Data</h3>
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#a43932', lineHeight: '1.5' }}>⚠️ Importing will replace all current data. This action cannot be undone.</p>
        <form onSubmit={handleImport}>
          <label style={{ display: 'block', marginBottom: '10px' }}>
            <input type="file" accept=".xlsx" style={{ fontSize: '12px' }} />
          </label>
          <button type="submit" disabled={importing} style={{ background: '#a43932', color: '#fff', border: 0, borderRadius: '7px', padding: '10px 15px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            {importing ? 'Importing…' : '⬆️ Import from Excel'}
          </button>
        </form>
      </div>
    </div>
  );
}

