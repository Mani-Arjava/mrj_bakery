'use client';

import { FormEvent, Fragment, useEffect, useState } from 'react';
import * as storage from '@/lib/inventory/storage';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './simple.css';
import './simple-actions.css';

const UNITS = ['Kg', 'Gm', 'Lt', 'Pc', 'Pkt', 'Box', 'Bag', 'Btl'];
const today = () => new Date().toISOString().slice(0, 10);
const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
type Mode = 'cards' | 'table';

export function useSimpleInventory() {
  const [data, setData] = useState<storage.InventoryData>({ suppliers: [], items: [], purchases: [], products: [], productionItems: [], recipes: [], productionBatches: [], customers: [], employees: [], saleInvoices: [], stockMovements: [], expenses: [] });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const refresh = () => setData(storage.getData());
  useEffect(() => { storage.initStorage(); refresh(); }, []);
  function run(action: () => void) {
    try { setError(''); action(); refresh(); setNotice('Saved successfully'); window.setTimeout(() => setNotice(''), 2500); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to save'); return false; }
  }
  return { data, run, refresh, notice, error };
}

export function Feedback({ notice, error }: { notice: string; error: string }) {
  return <>{notice && <div className="im-notice">{notice}</div>}{error && <div className="im-error im-banner">{error}</div>}</>;
}

function ViewToggle({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <div className="view-toggle" aria-label="View mode"><button className={mode === 'cards' ? 'active' : ''} onClick={() => setMode('cards')}>Cards</button><button className={mode === 'table' ? 'active' : ''} onClick={() => setMode('table')}>Table</button></div>;
}

function Status({ summary }: { summary: ReturnType<typeof storage.getSupplierSummary> }) {
  if (summary.advancePaise > 0) return <span className="im-status credit">{money(summary.advancePaise)} advance</span>;
  if (summary.pendingPaise > 0) return <span className="im-status due">{money(summary.pendingPaise)} pending</span>;
  return <span className="im-status settled">Settled</span>;
}

function Empty({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="im-empty"><b>{title}</b><p>{text}</p>{action && onAction && <button className="im-secondary" onClick={onAction}>{action}</button>}</div>;
}

type SupplierFormValue = { name: string; address: string; contactPerson: string; phone: string; openingPendingPaise: string; openingAdvancePaise: string };
function SupplierForm({ form, setForm, submit, close, editing }: { form: SupplierFormValue; setForm: (value: SupplierFormValue) => void; submit: (event: FormEvent) => void; close: () => void; editing: boolean }) {
  return <div className="im-modal-backdrop"><div className="im-modal"><button className="im-modal-close" onClick={close}>×</button><h2>{editing ? 'Edit supplier' : 'Add supplier'}</h2><form className="im-modal-form" onSubmit={submit}><label>Shop / supplier name<input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shop A" /></label><label>Contact person<input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></label><label>Contact number<input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Address<textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>{!editing && <><p className="im-muted">Opening balance — fill only if you already have a balance with this supplier before recording purchases here.</p><label>To be Pay (₹)<input type="number" min="0" step="0.01" value={form.openingPendingPaise} onChange={(e) => setForm({ ...form, openingPendingPaise: e.target.value })} placeholder="0" /></label><label>To be Receive (₹)<input type="number" min="0" step="0.01" value={form.openingAdvancePaise} onChange={(e) => setForm({ ...form, openingAdvancePaise: e.target.value })} placeholder="0" /></label></>}<button className="im-primary" type="submit">{editing ? 'Save changes' : 'Create supplier'}</button></form></div></div>;
}

function SupplierActions({ edit, remove }: { edit: () => void; remove: () => void }) {
  return <div className="row-actions"><button className="action-edit" onClick={(e) => { e.stopPropagation(); edit(); }}>Edit</button><button className="action-delete" onClick={(e) => { e.stopPropagation(); remove(); }}>Delete</button></div>;
}

export function SuppliersWorkspace() {
  const { data, run, notice, error } = useSimpleInventory();
  const [mode, setMode] = useState<Mode>('cards');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<storage.Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SupplierFormValue>({ name: '', address: '', contactPerson: '', phone: '', openingPendingPaise: '', openingAdvancePaise: '' });
  const selected = data.suppliers.find((supplier) => supplier.id === selectedId);

  function openCreate() { setEditing(null); setForm({ name: '', address: '', contactPerson: '', phone: '', openingPendingPaise: '', openingAdvancePaise: '' }); setShowForm(true); }
  function openEdit(supplier: storage.Supplier) { setEditing(supplier); setForm({ name: supplier.name, address: supplier.address, contactPerson: supplier.contactPerson, phone: supplier.phone, openingPendingPaise: '', openingAdvancePaise: '' }); setShowForm(true); }
  function submit(event: FormEvent) { event.preventDefault(); if (!form.name.trim()) return; run(() => editing ? storage.updateSupplier(editing.id, { name: form.name.trim(), address: form.address, contactPerson: form.contactPerson, phone: form.phone, openingPendingPaise: editing.openingPendingPaise ?? 0, openingAdvancePaise: editing.openingAdvancePaise ?? 0 }) : storage.addSupplier({ name: form.name.trim(), address: form.address, contactPerson: form.contactPerson, phone: form.phone, openingPendingPaise: Math.round(Number(form.openingPendingPaise || 0) * 100), openingAdvancePaise: Math.round(Number(form.openingAdvancePaise || 0) * 100) })); setEditing(null); setShowForm(false); }
  function remove(supplier: storage.Supplier) { if (window.confirm(`Delete ${supplier.name}?`)) run(() => storage.deleteSupplier(supplier.id)); }

  if (selected) {
    const summary = storage.getSupplierSummary(selected.id);
    return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><button className="im-secondary" onClick={() => setSelectedId(null)}>← All suppliers</button><div className="action-group"><button className="im-secondary" onClick={() => openEdit(selected)}>Edit supplier</button><button className="action-delete standalone-delete" onClick={() => remove(selected)}>Delete supplier</button><button className="im-primary" onClick={openCreate}>+ Add supplier</button></div></div><section className="im-detail-hero"><div className="im-avatar large">{selected.name.slice(0, 1).toUpperCase()}</div><div><p className="im-kicker">SUPPLIER</p><h2>{selected.name}</h2><p>{[selected.contactPerson, selected.phone, selected.address].filter(Boolean).join(' · ') || 'No contact details added'}</p></div></section><div className="im-summary-grid"><article><span>Total purchase</span><strong>{money(summary.totalPurchasePaise)}</strong></article><article><span>Paid / settled</span><strong>{money(summary.totalPaidPaise)}</strong></article><article className={summary.pendingPaise ? 'warning' : ''}><span>Pending</span><strong>{money(summary.pendingPaise)}</strong></article><article className={summary.advancePaise ? 'positive' : ''}><span>Advance / credit</span><strong>{money(summary.advancePaise)}</strong></article></div><section className="im-panel im-history-panel"><div className="im-panel-title"><h2>Purchase & payment history</h2><span>{summary.purchases.length} records</span></div>{summary.purchases.length === 0 ? <div className="im-empty"><b>No purchases yet</b><p>Purchases recorded for this supplier will appear here.</p></div> : <div className="im-table-scroll"><table><thead><tr><th>Date</th><th>Items</th><th>Purchase</th><th>Paid</th><th>Status</th></tr></thead><tbody>{summary.purchases.map((purchase) => { const balance = purchase.totalPaise - purchase.paidPaise; return <tr key={purchase.id}><td>{purchase.date}</td><td>{purchase.lines.length}</td><td>{money(purchase.totalPaise)}</td><td>{money(purchase.paidPaise)}</td><td><span className={balance < 0 ? 'credit' : balance > 0 ? 'due' : 'settled'}>{balance < 0 ? `${money(Math.abs(balance))} advance` : balance > 0 ? `${money(balance)} pending` : 'Settled'}</span></td></tr>; })}</tbody></table></div>}</section>{showForm && <SupplierForm form={form} setForm={setForm} submit={submit} close={() => { setEditing(null); setShowForm(false); }} editing={!!editing} />}</>;
  }

  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">SUPPLIERS</p><h2 className="im-page-title">Shops you buy from</h2></div><div className="action-group"><ViewToggle mode={mode} setMode={setMode} /><button className="im-primary" onClick={openCreate}>+ Add supplier</button></div></div>{data.suppliers.length === 0 ? <Empty title="No suppliers yet" text="Add your first shop or vendor to start recording purchases." action="Add supplier" onAction={openCreate} /> : mode === 'table' ? <SupplierTable suppliers={data.suppliers} open={setSelectedId} edit={openEdit} remove={remove} /> : <div className="im-party-grid">{data.suppliers.map((supplier) => { const summary = storage.getSupplierSummary(supplier.id); return <article className="im-party-card supplier-card" key={supplier.id}><button className="card-open" onClick={() => setSelectedId(supplier.id)}><div className="supplier-info-rows"><span className="supplier-row-label">Shop</span><span className="supplier-row-value">{supplier.name}</span>{supplier.contactPerson && <><span className="supplier-row-label">Contact</span><span className="supplier-row-value">{supplier.contactPerson}</span></>}{supplier.phone && <><span className="supplier-row-label">Phone</span><span className="supplier-row-value">{supplier.phone}</span></>}<span className="supplier-row-label">Purchase</span><span className="supplier-row-value">{money(summary.totalPurchasePaise)}</span><span className="supplier-row-label">Status</span><Status summary={summary} /></div></button><SupplierActions edit={() => openEdit(supplier)} remove={() => remove(supplier)} /></article>; })}</div>}{showForm && <SupplierForm form={form} setForm={setForm} submit={submit} close={() => { setEditing(null); setShowForm(false); }} editing={!!editing} />}</>;
}

function SupplierTable({ suppliers, open, edit, remove }: { suppliers: storage.Supplier[]; open: (id: string) => void; edit: (supplier: storage.Supplier) => void; remove: (supplier: storage.Supplier) => void }) {
  return <div className="im-panel im-table-scroll"><table><thead><tr><th>Supplier</th><th>Contact</th><th>Purchase</th><th>Paid</th><th>Balance</th><th>Actions</th></tr></thead><tbody>{suppliers.map((supplier) => { const summary = storage.getSupplierSummary(supplier.id); return <tr key={supplier.id}><td><button className="table-link" onClick={() => open(supplier.id)}>{supplier.name}</button></td><td>{supplier.contactPerson || supplier.phone || '—'}</td><td>{money(summary.totalPurchasePaise)}</td><td>{money(summary.totalPaidPaise)}</td><td><Status summary={summary} /></td><td><SupplierActions edit={() => edit(supplier)} remove={() => remove(supplier)} /></td></tr>; })}</tbody></table></div>;
}

type ItemFormValue = { name: string; unit: string };
function ItemForm({ form, setForm, submit, close, editing }: { form: ItemFormValue; setForm: (value: ItemFormValue) => void; submit: (event: FormEvent) => void; close: () => void; editing: boolean }) {
  return <div className="im-modal-backdrop"><div className="im-modal"><button className="im-modal-close" onClick={close}>×</button><h2>{editing ? 'Edit item' : 'Add item'}</h2><form className="im-modal-form" onSubmit={submit}><label>Item name<input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Maida" /></label><label>Unit of measurement<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label>{!editing && <p className="im-muted">New items start with 0 stock.</p>}<button className="im-primary" type="submit">{editing ? 'Save changes' : 'Add item'}</button></form></div></div>;
}

function ItemActions({ edit, remove, history }: { edit: () => void; remove: () => void; history?: () => void }) { return <div className="row-actions">{history && <button className="action-history" onClick={history}>₹</button>}<button className="action-edit" onClick={edit}>Edit</button><button className="action-delete" onClick={remove}>Delete</button></div>; }

function ItemPriceHistoryModal({ item, onClose }: { item: storage.InventoryItem; onClose: () => void }) {
  const history = storage.getItemPurchaseRateHistory(item.id);
  const currentRate = history.length ? history[history.length - 1].unitRatePaise : 0;
  return (
    <div className="im-modal-backdrop" onClick={onClose}>
      <div className="im-modal price-history-modal" onClick={e => e.stopPropagation()}>
        <button className="im-modal-close" onClick={onClose}>×</button>
        <p className="im-kicker">ITEM PRICE HISTORY</p>
        <h2>{item.name}</h2>
        {history.length === 0 ? (
          <div className="im-empty"><b>No purchase history yet</b><p>Rate changes will appear here once you record purchases for this item.</p></div>
        ) : (
          <>
            <div className="price-history-current">
              <div><span>CURRENT RATE</span><strong>{money(currentRate)}</strong></div>
              <div><span>UNIT</span><strong>{item.unit}</strong></div>
              <div><span>PURCHASES</span><strong>{history.length}</strong></div>
            </div>
            {history.length >= 2 && (
              <div className="price-chart-wrap">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf0eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v: number) => `₹${(v / 100).toFixed(0)}`} tick={{ fontSize: 10 }} width={50} />
                    <Tooltip formatter={(v: unknown) => [money(v as number), 'Rate']} />
                    <Line type="monotone" dataKey="unitRatePaise" stroke="#3a2013" strokeWidth={2} dot={{ r: 4 }} name="Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="im-table-scroll">
              <table>
                <thead><tr><th>Date</th><th>Supplier</th><th>Qty</th><th>Rate / {item.unit}</th></tr></thead>
                <tbody>
                  {history.map((entry, i) => {
                    const prev = i > 0 ? history[i - 1].unitRatePaise : null;
                    const changed = prev !== null && entry.unitRatePaise !== prev;
                    return (
                      <tr key={i} style={changed ? { background: '#fffbf0' } : undefined}>
                        <td>{entry.date}</td>
                        <td>{entry.supplierName}</td>
                        <td>{entry.quantity} {entry.unit}</td>
                        <td>
                          <strong>{money(entry.unitRatePaise)}</strong>
                          {changed && prev !== null && (
                            <span className={entry.unitRatePaise > prev ? 'price-change-up' : 'price-change-down'} style={{ marginLeft: 6, fontSize: 11 }}>
                              {entry.unitRatePaise > prev ? '↑' : '↓'} {money(Math.abs(entry.unitRatePaise - prev))}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProductPriceHistoryModal({ product, onClose }: { product: storage.Product; onClose: () => void }) {
  const history = product.priceHistory ?? [];
  return (
    <div className="im-modal-backdrop" onClick={onClose}>
      <div className="im-modal price-history-modal" onClick={e => e.stopPropagation()}>
        <button className="im-modal-close" onClick={onClose}>×</button>
        <p className="im-kicker">PRODUCT PRICE HISTORY</p>
        <h2>{product.name}</h2>
        <div className="price-history-current">
          <div><span>RETAIL</span><strong>{money(product.pricePerPacketPaise)}</strong></div>
          {product.wholesalePricePerPacketPaise != null && <div><span>WHOLESALE</span><strong>{money(product.wholesalePricePerPacketPaise)}</strong></div>}
          <div><span>CHANGES</span><strong>{Math.max(0, history.length - 1)}</strong></div>
        </div>
        {history.length >= 2 && (
          <div className="price-chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf0eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v: number) => `₹${(v / 100).toFixed(0)}`} tick={{ fontSize: 10 }} width={50} />
                <Tooltip formatter={(v: unknown) => money(v as number)} />
                <Line type="monotone" dataKey="retailPricePaise" stroke="#3a2013" strokeWidth={2} dot={{ r: 4 }} name="Retail" />
                {history.some(h => (h.wholesalePricePaise ?? 0) > 0) && (
                  <Line type="monotone" dataKey="wholesalePricePaise" stroke="#5b806f" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" name="Wholesale" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="im-table-scroll">
          <table>
            <thead><tr><th>Date</th><th>Retail Price</th><th>Wholesale Price</th><th>Change</th></tr></thead>
            <tbody>
              {history.map((entry, i) => {
                const prev = i > 0 ? history[i - 1] : null;
                const retailChanged = prev && entry.retailPricePaise !== prev.retailPricePaise;
                const up = prev && entry.retailPricePaise > prev.retailPricePaise;
                return (
                  <tr key={i}>
                    <td>{entry.date}</td>
                    <td><strong>{money(entry.retailPricePaise)}</strong></td>
                    <td>{(entry.wholesalePricePaise ?? 0) > 0 ? money(entry.wholesalePricePaise) : '—'}</td>
                    <td>
                      {!prev ? <span style={{ color: 'var(--muted)', fontSize: 11 }}>Initial</span>
                        : retailChanged ? <span className={up ? 'price-change-up' : 'price-change-down'}>{up ? '↑' : '↓'} {money(Math.abs(entry.retailPricePaise - prev.retailPricePaise))}</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ItemsWorkspace() {
  const { data, run, notice, error } = useSimpleInventory();
  const [mode, setMode] = useState<Mode>('table');
  const [editing, setEditing] = useState<storage.InventoryItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ItemFormValue>({ name: '', unit: 'Kg' });
  const [historyItem, setHistoryItem] = useState<storage.InventoryItem | null>(null);
  function openCreate() { setEditing(null); setForm({ name: '', unit: 'Kg' }); setShowForm(true); }
  function openEdit(item: storage.InventoryItem) { setEditing(item); setForm({ name: item.name, unit: item.unit }); setShowForm(true); }
  function submit(event: FormEvent) { event.preventDefault(); if (!form.name.trim()) return; run(() => editing ? storage.updateItem(editing.id, { ...form, name: form.name.trim() }) : storage.addItem({ ...form, name: form.name.trim() })); setEditing(null); setShowForm(false); }
  function remove(item: storage.InventoryItem) { if (window.confirm(`Delete ${item.name}?`)) run(() => storage.deleteItem(item.id)); }
  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">ITEMS</p><h2 className="im-page-title">Your regular purchases</h2></div><div className="action-group"><ViewToggle mode={mode} setMode={setMode} /><button className="im-primary" onClick={openCreate}>+ Add item</button></div></div>{data.items.length === 0 ? <Empty title="No items yet" text="Create an item to make it available in Purchases." action="Add item" onAction={openCreate} /> : mode === 'table' ? <div className="im-panel im-table-scroll"><table><thead><tr><th>Item</th><th>Unit</th><th>Current stock</th><th>Actions</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td>{item.unit}</td><td className="stock-value">{item.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {item.unit}</td><td><ItemActions edit={() => openEdit(item)} remove={() => remove(item)} history={() => setHistoryItem(item)} /></td></tr>)}</tbody></table></div> : <div className="im-party-grid item-card-grid">{data.items.map((item) => <article className="im-party-card item-card" key={item.id}><div className="supplier-info-rows"><span className="supplier-row-label">Item</span><span className="supplier-row-value">{item.name}</span><span className="supplier-row-label">Unit</span><span className="supplier-row-value">{item.unit}</span><span className="supplier-row-label">Stock</span><span className="supplier-row-value stock-value">{item.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {item.unit}</span></div><ItemActions edit={() => openEdit(item)} remove={() => remove(item)} history={() => setHistoryItem(item)} /></article>)}</div>}{showForm && <ItemForm form={form} setForm={setForm} submit={submit} close={() => { setEditing(null); setShowForm(false); }} editing={!!editing} />}{historyItem && <ItemPriceHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}</>;
}

type PurchaseLineDraft = { itemId: string; quantity: string; unit: string; rate: string; total: string };
function PurchaseEditor({ data, run, refresh, editingPurchase, done }: { data: storage.InventoryData; run: (action: () => void) => boolean; refresh: () => void; editingPurchase: storage.Purchase | null; done: () => void }) {
  const [supplierId, setSupplierId] = useState(editingPurchase?.supplierId || '');
  const [date, setDate] = useState(editingPurchase?.date || today());
  const [paid, setPaid] = useState(editingPurchase ? String(editingPurchase.paidPaise / 100) : '');
  const [entryMode, setEntryMode] = useState<'rate' | 'total'>('rate');
  const [lines, setLines] = useState<PurchaseLineDraft[]>(editingPurchase?.lines.map((line) => ({ itemId: line.itemId, quantity: String(line.quantity), unit: line.unit, rate: String(line.unitPricePaise / 100), total: String(line.totalPaise / 100) })) || [{ itemId: '', quantity: '', unit: 'Kg', rate: '', total: '' }]);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: 'Kg' });
  const totalPaise = entryMode === 'rate'
    ? lines.reduce((sum, line) => sum + Math.round(Number(line.quantity || 0) * Number(line.rate || 0) * 100), 0)
    : lines.reduce((sum, line) => sum + Math.round(Number(line.total || 0) * 100), 0);
  const paidPaise = Math.round(Number(paid || 0) * 100);
  const supplierSummary = (supplierId && !editingPurchase) ? storage.getSupplierSummary(supplierId) : null;
  const prevPendingPaise = supplierSummary?.pendingPaise ?? 0;
  const prevAdvancePaise = supplierSummary?.advancePaise ?? 0;
  const balancePaise = totalPaise + prevPendingPaise - prevAdvancePaise - paidPaise;
  function updateLine(index: number, updates: Partial<PurchaseLineDraft>) { setLines(lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...updates } : line)); }
  function addInlineItem() { if (!newItem.name.trim()) return; const item = storage.addItem({ name: newItem.name.trim(), unit: newItem.unit }); refresh(); setNewItem({ name: '', unit: 'Kg' }); setShowNewItem(false); setLines((current) => { const blank = current.findIndex((line) => !line.itemId); if (blank >= 0) return current.map((line, index) => index === blank ? { ...line, itemId: item.id, unit: item.unit } : line); return [...current, { itemId: item.id, quantity: '', unit: item.unit, rate: '', total: '' }]; }); }
  function submit(event: FormEvent) { event.preventDefault(); const valid = lines.filter((line) => line.itemId && Number(line.quantity) > 0 && (entryMode === 'rate' ? Number(line.rate) >= 0 : Number(line.total) > 0)); if (!supplierId || !valid.length || totalPaise <= 0) return; const success = run(() => { const prepared = valid.map((line) => { const item = data.items.find((candidate) => candidate.id === line.itemId); if (!item) throw new Error('Please select a valid item.'); const lineTotal = entryMode === 'rate' ? Math.round(Number(line.quantity) * Number(line.rate) * 100) : Math.round(Number(line.total) * 100); const unitPricePaise = entryMode === 'rate' ? Math.round(Number(line.rate) * 100) : (Number(line.quantity) > 0 ? Math.round(lineTotal / Number(line.quantity)) : 0); return { itemId: item.id, itemName: item.name, quantity: Number(line.quantity), unit: line.unit, unitPricePaise, totalPaise: lineTotal }; }); const input = { date, supplierId, lines: prepared, totalPaise, paidPaise }; if (editingPurchase) storage.updatePurchase(editingPurchase.id, input); else storage.postPurchase(input); }); if (success) done(); }
  return <section className="im-panel purchase-editor"><div className="im-purchase-header"><div><h2>{editingPurchase ? 'Edit purchase' : 'New purchase'}</h2><p className="im-muted">Add stock and settle the supplier in one quick entry.</p></div><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><div className="view-toggle"><button type="button" className={entryMode==='rate'?'active':''} onClick={()=>setEntryMode('rate')}>Rate-based</button><button type="button" className={entryMode==='total'?'active':''} onClick={()=>setEntryMode('total')}>Total-based</button></div></div><form onSubmit={submit}><div className="im-two"><label>Supplier<select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Select supplier…</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><div className="purchase-balance-note"><div><span>This purchase</span><strong>{money(totalPaise)}</strong></div>{prevPendingPaise > 0 && <div><span>Prev. pending</span><strong style={{color:'#b45309'}}>+{money(prevPendingPaise)}</strong></div>}{prevAdvancePaise > 0 && <div><span>Prev. advance</span><strong style={{color:'#1d4ed8'}}>−{money(prevAdvancePaise)}</strong></div>}{(prevPendingPaise > 0 || prevAdvancePaise > 0) && <div><span>Net to settle</span><strong>{money(Math.max(0, totalPaise + prevPendingPaise - prevAdvancePaise))}</strong></div>}</div></div><div className="im-purchase-lines"><div className="im-line-head"><span>Item</span><span>Qty</span><span>Unit</span><span>{entryMode==='rate'?'Rate (₹)':'Total (₹)'}</span><span>{entryMode==='rate'?'Total':'Rate'}</span><span /></div>{lines.map((line, index) => <div className="im-purchase-line" key={index}><select required value={line.itemId} onChange={(e) => { const item = data.items.find((candidate) => candidate.id === e.target.value); updateLine(index, { itemId: e.target.value, unit: item?.unit || line.unit }); }}><option value="">Select item…</option>{data.items.map((item) => <option key={item.id} value={item.id} disabled={lines.some((l, i) => i !== index && l.itemId === item.id)}>{item.name}</option>)}</select><input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} placeholder="0" /><select value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select>{entryMode==='rate' ? <input required type="number" min="0" step="0.01" value={line.rate} onChange={(e) => updateLine(index, { rate: e.target.value })} placeholder="0" /> : <input required type="number" min="0.01" step="0.01" value={line.total} onChange={(e) => updateLine(index, { total: e.target.value })} placeholder="0" />}{entryMode==='rate' ? <b>{money(Math.round(Number(line.quantity||0)*Number(line.rate||0)*100))}</b> : <b>{Number(line.quantity||0)>0 ? money(Math.round(Number(line.total||0)*100/Number(line.quantity))) : '—'}</b>}<button type="button" className="im-remove" onClick={() => lines.length > 1 ? setLines(lines.filter((_, lineIndex) => lineIndex !== index)) : setLines([{itemId:'',quantity:'',unit:'Kg',rate:'',total:''}])}>×</button></div>)}</div><div className="purchase-actions"><button type="button" className="im-text-button" onClick={() => setLines([...lines, { itemId: '', quantity: '', unit: 'Kg', rate: '', total: '' }])}>+ Add item</button><button type="button" className="im-text-button" onClick={() => setShowNewItem(!showNewItem)}>+ New item</button></div>{showNewItem && <div className="inline-item-form"><label>Item name<input required autoFocus value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Sugar" /></label><label>Unit<select value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label><button className="im-primary" type="button" onClick={addInlineItem}>Add to purchase</button></div>}<div className="purchase-total-row"><label>Amount paid (₹)<input type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" /></label><div><span>Purchase amount</span><strong>{money(totalPaise)}</strong></div><div className={balancePaise < 0 ? 'credit' : balancePaise > 0 ? 'due' : 'settled'}><span>{balancePaise < 0 ? 'Advance / credit' : balancePaise > 0 ? 'Pending' : 'Settlement'}</span><strong>{money(Math.abs(balancePaise))}</strong></div><button className="im-primary" type="submit">{editingPurchase ? 'Save changes' : 'Save purchase'}</button></div></form></section>;
}

function PurchaseStatus({ purchase }: { purchase: storage.Purchase }) { const balance = purchase.totalPaise - purchase.paidPaise; return <span className={balance < 0 ? 'credit' : balance > 0 ? 'due' : 'settled'}>{balance < 0 ? `${money(Math.abs(balance))} credit` : balance > 0 ? `${money(balance)} pending` : 'Settled'}</span>; }
function PurchaseActions({ edit, remove }: { edit: () => void; remove: () => void }) { return <div className="row-actions"><button className="action-edit" onClick={edit}>Edit</button><button className="action-delete" onClick={remove}>Delete</button></div>; }

export function PurchasesWorkspace() {
  const { data, run, refresh, notice, error } = useSimpleInventory();
  const [mode, setMode] = useState<Mode>('cards');
  const [editing, setEditing] = useState<storage.Purchase | null>(null);
  const [showEditor, setShowEditor] = useState(true);
  function remove(purchase: storage.Purchase) { if (window.confirm(`Delete this purchase from ${purchase.supplierName}? Stock will be reduced.`)) run(() => storage.deletePurchase(purchase.id)); }
  function newPurchase() { setEditing(null); setShowEditor(true); }
  function edit(purchase: storage.Purchase) { setEditing(purchase); setShowEditor(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">PURCHASES</p><h2 className="im-page-title">Record a purchase</h2></div><div className="action-group"><ViewToggle mode={mode} setMode={setMode} /><button className="im-primary" onClick={newPurchase}>+ New purchase</button></div></div>{showEditor && <PurchaseEditor data={data} run={run} refresh={refresh} editingPurchase={editing} done={() => { setEditing(null); setShowEditor(false); }} />}<section className="im-panel purchase-history-panel"><div className="im-panel-title"><h2>Purchase history</h2><span>{data.purchases.length} total</span></div>{data.purchases.length === 0 ? <Empty title="No purchases yet" text="Your saved purchases will appear here." /> : mode === 'table' ? <div className="im-table-scroll"><table><thead><tr><th>Date</th><th>Supplier</th><th>Items</th><th>Purchase</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.purchases.map((purchase) => <tr key={purchase.id}><td>{purchase.date}</td><td><b>{purchase.supplierName}</b></td><td>{purchase.lines.length}</td><td>{money(purchase.totalPaise)}</td><td>{money(purchase.paidPaise)}</td><td><PurchaseStatus purchase={purchase} /></td><td><PurchaseActions edit={() => edit(purchase)} remove={() => remove(purchase)} /></td></tr>)}</tbody></table></div> : <div className="purchase-history">{data.purchases.map((purchase) => <article className="purchase-history-card" key={purchase.id}><div><div><b>{purchase.supplierName}</b><small>{purchase.date} · {purchase.lines.length} item{purchase.lines.length === 1 ? '' : 's'}</small></div><strong>{money(purchase.totalPaise)}</strong></div><ul>{purchase.lines.map((line) => <li key={line.itemId + line.totalPaise}><span>{line.itemName} <small>{line.quantity} {line.unit} × {money(line.unitPricePaise)}</small></span><b>{money(line.totalPaise)}</b></li>)}</ul><footer><span className="im-muted">Paid</span><span>{money(purchase.paidPaise)}</span><span className="im-muted">{purchase.totalPaise - purchase.paidPaise > 0 ? 'Pending' : purchase.totalPaise - purchase.paidPaise < 0 ? 'Advance' : 'Status'}</span><PurchaseStatus purchase={purchase} /></footer><PurchaseActions edit={() => edit(purchase)} remove={() => remove(purchase)} /></article>)}</div>}</section></>;
}

export function RecipesWorkspace() { return null; }

// Placeholder — Recipes removed, kept export for any legacy imports
function _RecipesWorkspaceOld() {
  const { data, run, notice, error } = useSimpleInventory();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Production item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<storage.ProductionItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: '', productionUnit: 'KG' as 'KG' | 'Tray', piecesPerUnit: '' });

  // Ingredient row drafts
  const [ingredientDrafts, setIngredientDrafts] = useState<Array<{ itemId: string; quantityPerUnit: string }>>([]);
  const [editingIngredients, setEditingIngredients] = useState(false);

  const selectedItem = data.productionItems.find(pi => pi.id === selectedId);
  const selectedRecipe = selectedItem ? data.recipes.find(r => r.productionItemId === selectedItem.id) : undefined;

  function openCreateItem() {
    setEditingItem(null);
    setItemForm({ name: '', productionUnit: 'KG', piecesPerUnit: '' });
    setShowItemForm(true);
  }

  function openEditItem(item: storage.ProductionItem) {
    setEditingItem(item);
    setItemForm({ name: item.name, productionUnit: item.productionUnit ?? 'KG', piecesPerUnit: String(item.piecesPerUnit) });
    setShowItemForm(true);
  }

  function submitItem(e: FormEvent) {
    e.preventDefault();
    if (!itemForm.name.trim() || !itemForm.piecesPerUnit) return;
    const payload = { name: itemForm.name.trim(), productionUnit: itemForm.productionUnit, piecesPerUnit: Number(itemForm.piecesPerUnit) };
    run(() => {
      if (editingItem) storage.updateProductionItem(editingItem.id, payload);
      else storage.addProductionItem(payload);
    });
    setShowItemForm(false);
    setEditingItem(null);
  }

  function removeItem(item: storage.ProductionItem) {
    if (window.confirm(`Delete ${item.name}? This will also delete its recipe.`)) {
      run(() => storage.deleteProductionItem(item.id));
      if (selectedId === item.id) setSelectedId(null);
    }
  }

  function startEditIngredients() {
    const drafts = selectedRecipe
      ? selectedRecipe.ingredients.map(ing => ({ itemId: ing.itemId, quantityPerUnit: String(ing.quantityPerUnit) }))
      : [{ itemId: '', quantityPerUnit: '' }];
    setIngredientDrafts(drafts.length ? drafts : [{ itemId: '', quantityPerUnit: '' }]);
    setEditingIngredients(true);
  }

  function saveIngredients() {
    if (!selectedItem) return;
    const valid = ingredientDrafts.filter(d => d.itemId && Number(d.quantityPerUnit) > 0);
    run(() => {
      if (valid.length === 0) {
        storage.deleteRecipe(selectedItem.id);
      } else {
        const ingredients: storage.RecipeIngredient[] = valid.map(d => {
          const item = data.items.find(it => it.id === d.itemId)!;
          return { itemId: item.id, itemName: item.name, quantityPerUnit: Number(d.quantityPerUnit), unit: item.unit };
        });
        storage.saveRecipe(selectedItem.id, ingredients);
      }
    });
    setEditingIngredients(false);
  }

  function updateDraft(index: number, patch: Partial<{ itemId: string; quantityPerUnit: string }>) {
    setIngredientDrafts(ingredientDrafts.map((d, i) => i === index ? { ...d, ...patch } : d));
  }

  if (selectedItem) {
    return <>
      <Feedback notice={notice} error={error} />
      <div className="im-section-actions">
        <button className="im-secondary" onClick={() => { setSelectedId(null); setEditingIngredients(false); }}>← All recipes</button>
        <div className="action-group">
          <button className="im-secondary" onClick={() => openEditItem(selectedItem)}>Edit item</button>
          <button className="action-delete standalone-delete" onClick={() => removeItem(selectedItem)}>Delete item</button>
        </div>
      </div>

      <section className="im-panel">
        <div style={{ marginBottom: '16px' }}>
          <p className="im-kicker">PRODUCTION ITEM</p>
          <h2 style={{ margin: '4px 0 2px' }}>{selectedItem.name}</h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Unit: <b>{selectedItem.productionUnit}</b> &nbsp;·&nbsp; 1 {selectedItem.productionUnit} = <b>{selectedItem.piecesPerUnit} pieces</b>
          </p>
        </div>

        <div className="im-panel-title" style={{ marginTop: '24px' }}>
          <h2>Recipe ingredients</h2>
          {!editingIngredients && (
            <button className="im-secondary" onClick={startEditIngredients}>
              {selectedRecipe ? 'Edit recipe' : 'Add recipe'}
            </button>
          )}
        </div>

        {editingIngredients ? (
          <div>
            <p className="im-muted" style={{ marginBottom: '12px' }}>
              Enter quantity of each raw material needed per 1 {selectedItem.productionUnit} of {selectedItem.name}.
            </p>
            {data.items.filter(it => it.quantity > 0).length === 0 && (
              <p className="im-muted" style={{ marginBottom: '12px', color: '#a43932' }}>
                No items in stock. Purchase items first to add ingredients.
              </p>
            )}
            <div className="ingredient-rows" style={{ marginBottom: '12px' }}>
              {ingredientDrafts.map((draft, idx) => {
                const selectedUnit = draft.itemId ? data.items.find(it => it.id === draft.itemId)?.unit : '';
                return (
                  <div key={idx} className="ingredient-row">
                    <select value={draft.itemId} onChange={e => updateDraft(idx, { itemId: e.target.value })}>
                      <option value="">Select raw material…</option>
                      {data.items.filter(it => it.quantity > 0).map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
                    </select>
                    <input type="number" min="0.001" step="0.001" value={draft.quantityPerUnit}
                      onChange={e => updateDraft(idx, { quantityPerUnit: e.target.value })}
                      placeholder="0" />
                    <span className="ingredient-unit">{selectedUnit || '—'}</span>
                    {ingredientDrafts.length > 1 && (
                      <button type="button" className="ingredient-remove"
                        onClick={() => setIngredientDrafts(ingredientDrafts.filter((_, i) => i !== idx))}>×</button>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="im-text-button" type="button" onClick={() => setIngredientDrafts([...ingredientDrafts, { itemId: '', quantityPerUnit: '' }])}>+ Add ingredient</button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button className="im-secondary" type="button" onClick={() => setEditingIngredients(false)}>Cancel</button>
                <button className="im-primary" type="button" onClick={saveIngredients}>Save recipe</button>
              </div>
            </div>
          </div>
        ) : selectedRecipe && selectedRecipe.ingredients.length > 0 ? (
          <div className="im-table-scroll">
            <table>
              <thead><tr><th>Raw material</th><th>Qty per 1 {selectedItem.productionUnit}</th><th>Unit</th></tr></thead>
              <tbody>
                {selectedRecipe.ingredients.map((ing, idx) => (
                  <tr key={idx}>
                    <td><b>{ing.itemName}</b></td>
                    <td>{ing.quantityPerUnit.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</td>
                    <td>{ing.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No recipe yet"
            text={`Add the raw materials needed to produce 1 ${selectedItem.productionUnit} of ${selectedItem.name}.`}
            action="Add recipe"
            onAction={startEditIngredients}
          />
        )}
      </section>

      {showItemForm && (
        <div className="im-modal-backdrop">
          <div className="im-modal">
            <button className="im-modal-close" onClick={() => setShowItemForm(false)}>×</button>
            <h2>Edit production item</h2>
            <form className="im-modal-form" onSubmit={submitItem}>
              <label>Item name<input autoFocus required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} /></label>
              <label>Production unit
                <select value={itemForm.productionUnit} onChange={e => setItemForm({ ...itemForm, productionUnit: e.target.value as 'KG' | 'Tray' })}>
                  <option value="KG">KG</option>
                  <option value="Tray">Tray</option>
                </select>
              </label>
              <label>Pieces per {itemForm.productionUnit}
                <input required type="number" min="0.01" step="0.01" value={itemForm.piecesPerUnit}
                  onChange={e => setItemForm({ ...itemForm, piecesPerUnit: e.target.value })}
                  placeholder="e.g. 25" />
              </label>
              <button className="im-primary" type="submit">Save changes</button>
            </form>
          </div>
        </div>
      )}
    </>;
  }

  return <>
    <Feedback notice={notice} error={error} />
    <div className="im-section-actions">
      <div><p className="im-kicker">RECIPES</p><h2 className="im-page-title">Production items & recipes</h2></div>
      <button className="im-primary" onClick={openCreateItem}>+ Add production item</button>
    </div>

    {data.productionItems.length === 0 ? (
      <Empty
        title="No production items yet"
        text="Create a production item (e.g. Roll Cake) to define its recipe and track its stock."
        action="Add production item"
        onAction={openCreateItem}
      />
    ) : (
      <section className="im-panel">
        <div className="im-table-scroll">
          <table>
            <thead>
              <tr><th>Production item</th><th>Unit</th><th>Conversion</th><th>Recipe</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.productionItems.map(item => {
                const recipe = data.recipes.find(r => r.productionItemId === item.id);
                return (
                  <tr key={item.id}>
                    <td><button className="table-link" onClick={() => { setSelectedId(item.id); setEditingIngredients(false); }}><b>{item.name}</b></button></td>
                    <td>{item.productionUnit}</td>
                    <td>1 {item.productionUnit} = {item.piecesPerUnit} pcs</td>
                    <td>
                      {recipe && recipe.ingredients.length > 0
                        ? <span className="im-status settled">{recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? '' : 's'}</span>
                        : <span className="im-status due">No recipe</span>}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="action-edit" onClick={() => { setSelectedId(item.id); setEditingIngredients(false); }}>View</button>
                        <button className="action-edit" onClick={() => openEditItem(item)}>Edit</button>
                        <button className="action-delete" onClick={() => removeItem(item)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    )}

    {showItemForm && (
      <div className="im-modal-backdrop">
        <div className="im-modal">
          <button className="im-modal-close" onClick={() => setShowItemForm(false)}>×</button>
          <h2>Add production item</h2>
          <form className="im-modal-form" onSubmit={submitItem}>
            <label>Item name<input autoFocus required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Roll Cake" /></label>
            <label>Production unit
              <select value={itemForm.productionUnit} onChange={e => setItemForm({ ...itemForm, productionUnit: e.target.value as 'KG' | 'Tray' })}>
                <option value="KG">KG</option>
                <option value="Tray">Tray</option>
              </select>
            </label>
            <label>Pieces per {itemForm.productionUnit}
              <input required type="number" min="0.01" step="0.01" value={itemForm.piecesPerUnit}
                onChange={e => setItemForm({ ...itemForm, piecesPerUnit: e.target.value })}
                placeholder="e.g. 25" />
              <small style={{ color: 'var(--muted)' }}>How many pieces does 1 {itemForm.productionUnit || 'unit'} produce?</small>
            </label>
            <button className="im-primary" type="submit">Create production item</button>
          </form>
        </div>
      </div>
    )}
  </>;
}

export function ProductsWorkspace() {
  const { data, run, notice, error } = useSimpleInventory();
  const [mode, setMode] = useState<Mode>('cards');
  const [editing, setEditing] = useState<storage.Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', piecesPerPacket: '', count: '', conversionUnit: 'KG' as 'KG' | 'Tray', pricePerPacketPaise: 0, wholesalePricePerPacketPaise: '', productionItemId: '' });
  const [historyProduct, setHistoryProduct] = useState<storage.Product | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    const wholesale = form.wholesalePricePerPacketPaise !== '' ? Math.round(Number(form.wholesalePricePerPacketPaise) * 100) : undefined;
    const count = form.count !== '' ? Number(form.count) : undefined;
    const piecesPerPacket = form.piecesPerPacket !== '' ? Number(form.piecesPerPacket) : undefined;
    const productionItemId = form.productionItemId || undefined;
    run(() => {
      if (editing) storage.updateProduct(editing.id, { name: form.name, pricePerPacketPaise: form.pricePerPacketPaise, wholesalePricePerPacketPaise: wholesale, count, conversionUnit: form.conversionUnit, productionItemId, piecesPerPacket });
      else storage.addProduct({ name: form.name, pricePerPacketPaise: form.pricePerPacketPaise, wholesalePricePerPacketPaise: wholesale, count, conversionUnit: form.conversionUnit, productionItemId, piecesPerPacket });
    });
    setForm({ name: '', piecesPerPacket: '', count: '', conversionUnit: 'KG', pricePerPacketPaise: 0, wholesalePricePerPacketPaise: '', productionItemId: '' });
    setEditing(null);
    setShowForm(false);
  }

  function editProduct(product: storage.Product) {
    setEditing(product);
    setForm({
      name: product.name,
      piecesPerPacket: product.piecesPerPacket != null ? String(product.piecesPerPacket) : '',
      count: product.count != null ? String(product.count) : '',
      conversionUnit: product.conversionUnit ?? 'KG',
      pricePerPacketPaise: product.pricePerPacketPaise,
      wholesalePricePerPacketPaise: product.wholesalePricePerPacketPaise != null ? String(product.wholesalePricePerPacketPaise / 100) : '',
      productionItemId: product.productionItemId ?? '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function removeProduct(product: storage.Product) {
    if (window.confirm(`Delete ${product.name}? This cannot be undone.`)) run(() => storage.deleteProduct(product.id));
  }

  return <>
    <Feedback notice={notice} error={error} />
    <div className="im-section-actions">
      <div><p className="im-kicker">PRODUCTS</p><h2 className="im-page-title">Manage products & pricing</h2></div>
      <div className="action-group"><ViewToggle mode={mode} setMode={setMode} /><button className="im-primary" onClick={() => { setEditing(null); setForm({ name: '', piecesPerPacket: '', count: '', conversionUnit: 'KG', pricePerPacketPaise: 0, wholesalePricePerPacketPaise: '', productionItemId: '' }); setShowForm(true); }}>+ Add product</button></div>
    </div>

    {showForm && (
      <section className="im-panel">
        <h3>{editing ? 'Edit product' : 'New product'}</h3>
        <form onSubmit={handleSubmit}>
          <label>Product name<input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 20-Piece Roll Cake" /></label>
          <label>Pieces per packet<input required type="number" step="1" min="1" value={form.piecesPerPacket} onChange={(e) => setForm({ ...form, piecesPerPacket: e.target.value })} placeholder="e.g. 10" /></label>
          <div className="unit-conversion-wrap">
            <label>Unit conversion
              <div className="unit-conversion-row">
                <select value={form.conversionUnit} onChange={(e) => setForm({ ...form, conversionUnit: e.target.value as 'KG' | 'Tray' })}>
                  <option value="KG">KG</option>
                  <option value="Tray">Tray</option>
                </select>
                <span className="unit-eq">1 {form.conversionUnit} =</span>
                <input type="number" step="1" min="1" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} placeholder="e.g. 20" />
                <span className="unit-eq">pieces</span>
              </div>
            </label>
            <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px' }}>Number of pieces in one packet</small>
          </div>
          <label>Retail price per packet (₹)<input required type="number" step="0.01" min="0" value={form.pricePerPacketPaise / 100} onChange={(e) => setForm({ ...form, pricePerPacketPaise: Math.round(Number(e.target.value) * 100) })} /></label>
          <label>Wholesale price per packet (₹) <span style={{ fontWeight: 400, color: 'var(--muted)' }}>optional</span>
            <input type="number" step="0.01" min="0" value={form.wholesalePricePerPacketPaise} onChange={(e) => setForm({ ...form, wholesalePricePerPacketPaise: e.target.value })} placeholder="Leave blank to use retail price" />
          </label>
          <label>Production item (links stock)
            <select value={form.productionItemId} onChange={(e) => setForm({ ...form, productionItemId: e.target.value })}>
              <option value="">— Not linked —</option>
              {data.productionItems.map(pi => <option key={pi.id} value={pi.id}>{pi.name}</option>)}
            </select>
            {data.productionItems.length === 0 && <small style={{ color: 'var(--muted)' }}>Go to the Production page to create production items first.</small>}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="im-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="im-primary">Save</button>
          </div>
        </form>
      </section>
    )}

    <section className="im-panel">
      <div className="im-panel-title"><h2>Products</h2><span>{data.products.length} total</span></div>
      {data.products.length === 0 ? (
        <Empty title="No products yet" text="Add your first finished good to start tracking production and sales." />
      ) : mode === 'table' ? (
        <div className="im-table-scroll">
          <table>
            <thead>
              <tr><th>Product</th><th>Pcs/Packet</th><th>Conversion</th><th>Retail Price</th><th>Wholesale Price</th><th>Production Item</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.products.map((product) => {
                const prodItem = product.productionItemId ? data.productionItems.find(pi => pi.id === product.productionItemId) : undefined;
                return (
                  <tr key={product.id}>
                    <td><b>{product.name}</b></td>
                    <td>{product.piecesPerPacket ?? '—'}</td>
                    <td>{product.count ? `1 ${product.conversionUnit ?? 'KG'} = ${product.count} pcs` : '—'}</td>
                    <td>{money(product.pricePerPacketPaise)}</td>
                    <td>{product.wholesalePricePerPacketPaise != null ? money(product.wholesalePricePerPacketPaise) : '—'}</td>
                    <td>{prodItem ? prodItem.name : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td><div className="row-actions"><button className="action-history" onClick={() => setHistoryProduct(product)}>₹</button><button className="action-edit" onClick={() => editProduct(product)}>Edit</button><button className="action-delete" onClick={() => removeProduct(product)}>Delete</button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="im-party-grid">
          {data.products.map((product) => {
            const prodItem = product.productionItemId ? data.productionItems.find(pi => pi.id === product.productionItemId) : undefined;
            return (
              <article className="im-party-card product-card" key={product.id}>
                <div className="supplier-info-rows">
                  <span className="supplier-row-label">Product</span>
                  <span className="supplier-row-value">{product.name}</span>
                  <span className="supplier-row-label">Pcs/Packet</span>
                  <span className="supplier-row-value">{product.piecesPerPacket ?? '—'}</span>
                  <span className="supplier-row-label">Retail</span>
                  <span className="supplier-row-value">{money(product.pricePerPacketPaise)}</span>
                  <span className="supplier-row-label">Wholesale</span>
                  <span className="supplier-row-value">{product.wholesalePricePerPacketPaise != null ? money(product.wholesalePricePerPacketPaise) : '—'}</span>
                  <span className="supplier-row-label">Conversion</span>
                  <span className="supplier-row-value">{product.count ? `1 ${product.conversionUnit ?? 'KG'} = ${product.count} pcs` : '—'}</span>
                  <span className="supplier-row-label">Linked</span>
                  <span className="supplier-row-value">{prodItem ? prodItem.name : '—'}</span>
                </div>
                <div className="row-actions"><button className="action-history" onClick={() => setHistoryProduct(product)}>₹</button><button className="action-edit" onClick={() => editProduct(product)}>Edit</button><button className="action-delete" onClick={() => removeProduct(product)}>Delete</button></div>
              </article>
            );
          })}
        </div>
      )}
    </section>
    {historyProduct && <ProductPriceHistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />}
  </>;
}

export function ProductionWorkspace() {
  const { data, run, notice, error } = useSimpleInventory();
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [editingBatch, setEditingBatch] = useState<storage.ProductionBatch | null>(null);
  const [matDrafts, setMatDrafts] = useState<Array<{ itemId: string; quantity: string }>>([{ itemId: '', quantity: '' }]);
  const [prodDrafts, setProdDrafts] = useState<Array<{ productionItemId: string; quantity: string }>>([{ productionItemId: '', quantity: '' }]);
  const [historyTab, setHistoryTab] = useState<'today' | 'all'>('today');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<storage.ProductionItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: '' });

  const prevDay = (d: string) => { const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() - 1); return dt.toISOString().slice(0, 10); };
  const nextDay = (d: string) => { const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + 1); return dt.toISOString().slice(0, 10); };

  function submitItem(e: FormEvent) {
    e.preventDefault();
    if (!itemForm.name.trim()) return;
    const payload = { name: itemForm.name.trim(), piecesPerUnit: 1 };
    run(() => {
      if (editingItem) storage.updateProductionItem(editingItem.id, payload);
      else storage.addProductionItem(payload);
    });
    setShowItemForm(false);
    setEditingItem(null);
    setItemForm({ name: '' });
  }

  function editItem(item: storage.ProductionItem) {
    setEditingItem(item);
    setItemForm({ name: item.name });
    setShowItemForm(true);
  }

  function removeItem(item: storage.ProductionItem) {
    if (window.confirm(`Delete "${item.name}"?`)) run(() => storage.deleteProductionItem(item.id));
  }

  function resetForm() {
    setNotes('');
    setEditingBatch(null);
    setMatDrafts([{ itemId: '', quantity: '' }]);
    setProdDrafts([{ productionItemId: '', quantity: '' }]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rawMaterials = matDrafts
      .filter(d => d.itemId && Number(d.quantity) > 0)
      .map(d => {
        const item = data.items.find(it => it.id === d.itemId)!;
        return { itemId: item.id, itemName: item.name, quantity: Number(d.quantity), unit: item.unit };
      });
    if (rawMaterials.length === 0) return;

    // Stock validation — when editing, add back the old batch's qty (it will be reversed on save)
    const overStock: string[] = [];
    for (const mat of rawMaterials) {
      const item = data.items.find(it => it.id === mat.itemId);
      if (!item) continue;
      const oldQty = editingBatch?.rawMaterials?.find(m => m.itemId === mat.itemId)?.quantity ?? 0;
      const available = item.quantity + oldQty;
      if (mat.quantity > available) {
        overStock.push(`${mat.itemName}: need ${mat.quantity} ${mat.unit}, only ${available.toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${mat.unit} in stock`);
      }
    }
    if (overStock.length > 0) {
      alert(`Not enough stock:\n\n${overStock.join('\n')}`);
      return;
    }

    const productsProduced = prodDrafts
      .filter(d => d.productionItemId && Number(d.quantity) > 0)
      .map(d => {
        const item = data.productionItems.find(pi => pi.id === d.productionItemId)!;
        const unit = data.products.find(p => p.productionItemId === item.id)?.conversionUnit ?? 'KG';
        return { productionItemId: item.id, productionItemName: item.name, quantity: Number(d.quantity), unit };
      });
    const batchData = { date, rawMaterials, productsProduced, notes: notes || undefined };
    run(() => {
      if (editingBatch) storage.updateProductionBatch(editingBatch.id, batchData);
      else storage.addProductionBatch(batchData);
    });
    resetForm();
  }

  function startEdit(batch: storage.ProductionBatch) {
    setEditingBatch(batch);
    setDate(batch.date);
    setNotes(batch.notes || '');
    setMatDrafts(
      batch.rawMaterials?.length
        ? batch.rawMaterials.map(m => ({ itemId: m.itemId, quantity: String(m.quantity) }))
        : [{ itemId: '', quantity: '' }]
    );
    setProdDrafts(
      batch.productsProduced?.length
        ? batch.productsProduced.map(p => ({ productionItemId: p.productionItemId, quantity: String(p.quantity) }))
        : [{ productionItemId: '', quantity: '' }]
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function removeBatch(batch: storage.ProductionBatch) {
    if (window.confirm('Delete this production record? Raw material stock will be restored.'))
      run(() => storage.deleteProductionBatch(batch.id));
  }

  const allProduction = storage.getAllProductionBatches();

  const dayBatches = allProduction.filter(b => b.date === date);
  const matTotals: Record<string, { name: string; qty: number; unit: string }> = {};
  for (const batch of dayBatches) {
    for (const m of batch.rawMaterials ?? []) {
      if (!matTotals[m.itemId]) matTotals[m.itemId] = { name: m.itemName, qty: 0, unit: m.unit };
      matTotals[m.itemId].qty += m.quantity;
    }
  }
  const prodTotals: Record<string, { name: string; qty: number; unit: string; count?: number }> = {};
  for (const batch of dayBatches) {
    for (const p of batch.productsProduced ?? []) {
      if (!prodTotals[p.productionItemId]) prodTotals[p.productionItemId] = { name: p.productionItemName, qty: 0, unit: p.unit ?? 'KG', count: data.products.find(pr => pr.productionItemId === p.productionItemId)?.count };
      prodTotals[p.productionItemId].qty += p.quantity;
    }
  }
  const totalMatsCount = Object.keys(matTotals).length;
  const totalProdsCount = Object.keys(prodTotals).length;
  const totalPcs = Object.values(prodTotals).reduce((s, p) => s + (p.count ? Math.round(p.qty * p.count) : 0), 0);

  const availableStock = data.productionItems
    .map(pi => {
      const product = data.products.find(p => p.productionItemId === pi.id);
      const count = product?.count ?? 1;
      const unit = product?.conversionUnit ?? 'KG';
      const pcs = storage.getProductionItemStock(pi.id);
      const qty = count > 0 ? pcs / count : 0;
      return { id: pi.id, name: pi.name, pcs, qty, unit };
    })
    .filter(pi => pi.pcs > 0);

  const displayedBatches = historyTab === 'today' ? dayBatches : allProduction;

  const TrashIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );

  return <>
    <Feedback notice={notice} error={error} />

    {/* Header + date nav */}
    <div className="im-section-actions" style={{ flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
      <div>
        <p className="im-kicker">PRODUCTION</p>
        <h2 className="im-page-title">Record daily production</h2>
      </div>
      <div className="date-nav">
        <button type="button" className="date-nav-btn" onClick={() => setDate(prevDay(date))}>←</button>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button type="button" className="date-nav-btn" onClick={() => setDate(nextDay(date))} disabled={date >= today()}>→</button>
        <button type="button" className="date-nav-btn today-btn" onClick={() => setDate(today())}>Today</button>
      </div>
    </div>

    {/* Stats grid */}
    <div className="im-summary-grid" style={{ marginBottom: '20px' }}>
      <article>
        <span>Batches</span>
        <strong>{dayBatches.length}</strong>
      </article>
      <article className={totalMatsCount > 0 ? 'warning' : ''}>
        <span>Raw Materials Used</span>
        <strong>{totalMatsCount > 0 ? `${totalMatsCount} item${totalMatsCount !== 1 ? 's' : ''}` : '—'}</strong>
      </article>
      <article className={totalProdsCount > 0 ? 'positive' : ''}>
        <span>Products Made</span>
        <strong>{totalProdsCount > 0 ? `${totalProdsCount} item${totalProdsCount !== 1 ? 's' : ''}` : '—'}</strong>
      </article>
      <article>
        <span>Total Pieces</span>
        <strong>{totalPcs > 0 ? totalPcs.toLocaleString('en-IN') : '—'}</strong>
      </article>
    </div>

    {/* Edit banner */}
    {editingBatch && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', background: '#fff8ec', border: '1px solid #f2c48d', borderRadius: '10px', padding: '12px 16px' }}>
        <span style={{ font: '600 13px \'DM Sans\'', color: '#a05a00' }}>Editing production record</span>
        <button type="button" className="im-secondary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={resetForm}>✕ Cancel edit</button>
      </div>
    )}

    {/* New / Edit record form */}
    <form onSubmit={handleSubmit}>
      {/* Raw Materials Used */}
      <div className="exp-section">
        <div className="exp-section-head exp-head-salary">
          <div className="exp-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            Raw Materials Used
          </div>
          <button type="button" className="exp-add-btn"
            onClick={() => setMatDrafts(d => [...d, { itemId: '', quantity: '' }])}>
            + Add Material
          </button>
        </div>
        <div className="exp-section-body" style={{ padding: 0, display: 'block' }}>
          <div className="prod-line-head" style={{ padding: '8px 16px' }}><span>Item</span><span>Qty</span><span>Unit</span><span /></div>
          {matDrafts.map((draft, idx) => {
            const selectedItem = draft.itemId ? data.items.find(it => it.id === draft.itemId) : undefined;
            const oldQty = editingBatch?.rawMaterials?.find(m => m.itemId === draft.itemId)?.quantity ?? 0;
            const available = selectedItem ? selectedItem.quantity + oldQty : 0;
            const enteredQty = Number(draft.quantity);
            const overLimit = selectedItem && draft.quantity && enteredQty > available;
            return (
              <Fragment key={idx}>
                <div className="prod-line" style={{ padding: '10px 16px' }}>
                  <select value={draft.itemId} onChange={e => setMatDrafts(matDrafts.map((d, i) => i === idx ? { ...d, itemId: e.target.value } : d))}>
                    <option value="">Select item…</option>
                    {data.items.map(it => <option key={it.id} value={it.id} disabled={matDrafts.some((d, i) => i !== idx && d.itemId === it.id)}>{it.name} (stock: {it.quantity} {it.unit})</option>)}
                  </select>
                  <input type="number" min="0.001" step="0.001" value={draft.quantity}
                    onChange={e => setMatDrafts(matDrafts.map((d, i) => i === idx ? { ...d, quantity: e.target.value } : d))}
                    placeholder="0"
                    style={overLimit ? { borderColor: '#a43932' } : undefined} />
                  <span className="prod-unit-label">{selectedItem?.unit || '—'}</span>
                  <button type="button" className="exp-delete-btn" title="Remove"
                    onClick={() => matDrafts.length > 1 ? setMatDrafts(matDrafts.filter((_, i) => i !== idx)) : setMatDrafts([{ itemId: '', quantity: '' }])}>
                    <TrashIcon />
                  </button>
                </div>
                {overLimit && (
                  <p className="prod-over-stock-msg" style={{ padding: '0 16px 6px' }}>
                    Only {available.toLocaleString('en-IN', { maximumFractionDigits: 3 })} {selectedItem!.unit} in stock
                  </p>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Products Made */}
      <div className="exp-section">
        <div className="exp-section-head exp-head-other">
          <div className="exp-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            Products Made
          </div>
          <button type="button" className="exp-add-btn"
            onClick={() => setProdDrafts(d => [...d, { productionItemId: '', quantity: '' }])}>
            + Add Product
          </button>
        </div>
        <div className="exp-section-body" style={{ padding: 0, display: 'block' }}>
          <div className="prod-line-head" style={{ padding: '8px 16px' }}><span>Product</span><span>Qty</span><span>Unit</span><span /></div>
          {prodDrafts.map((draft, idx) => (
            <div key={idx} className="prod-line" style={{ padding: '10px 16px' }}>
              <select value={draft.productionItemId}
                onChange={e => setProdDrafts(prodDrafts.map((d, i) => i === idx ? { productionItemId: e.target.value, quantity: '' } : d))}>
                <option value="">Select production item…</option>
                {data.productionItems.map(pi => <option key={pi.id} value={pi.id} disabled={prodDrafts.some((d, i) => i !== idx && d.productionItemId === pi.id)}>{pi.name}</option>)}
              </select>
              <input type="number" min="0.001" step="0.001" value={draft.quantity}
                onChange={e => setProdDrafts(prodDrafts.map((d, i) => i === idx ? { ...d, quantity: e.target.value } : d))}
                placeholder="0" />
              <span className="prod-unit-label">{data.products.find(p => p.productionItemId === draft.productionItemId)?.conversionUnit ?? 'KG'}</span>
              <button type="button" className="exp-delete-btn" title="Remove"
                onClick={() => prodDrafts.length > 1 ? setProdDrafts(prodDrafts.filter((_, i) => i !== idx)) : setProdDrafts([{ productionItemId: '', quantity: '' }])}>
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notes + Save */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '12px' }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#506258', marginBottom: '6px' }}>Notes (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any production notes…" rows={2}
            style={{ display: 'block', width: '100%', border: '1px solid #dbe2d8', borderRadius: '7px', padding: '10px 11px', background: '#fcfdfb', color: 'var(--ink)', font: '13px \'DM Sans\'', resize: 'vertical', boxSizing: 'border-box' }} />
        </label>
        <button type="submit" className="im-primary">{editingBatch ? 'Update record' : 'Save production'}</button>
      </div>
    </form>

    {/* Production Records */}
    <div className="exp-section">
      <div className="exp-section-head exp-head-history">
        <div className="exp-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Production Records
        </div>
        <div className="expense-tabs">
          <button type="button" className={historyTab === 'today' ? 'active' : ''} onClick={() => setHistoryTab('today')}>Today</button>
          <button type="button" className={historyTab === 'all' ? 'active' : ''} onClick={() => setHistoryTab('all')}>All Records</button>
        </div>
      </div>
      <div style={{ padding: 0 }}>
        {displayedBatches.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            {historyTab === 'today' ? 'No production recorded for this date.' : 'No production records yet.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="exp-hist-table">
              <thead>
                <tr>
                  {historyTab === 'all' && <th>Date</th>}
                  <th>Raw Materials</th>
                  <th>Products Made</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedBatches.map(batch => {
                  const matsStr = batch.rawMaterials?.map(m => `${m.itemName} ${m.quantity} ${m.unit}`).join(', ') || '—';
                  const prodsStr = batch.productsProduced?.map(p => {
                    const linkedProd = data.products.find(pr => pr.productionItemId === p.productionItemId);
                    const pcs = linkedProd?.count ? ` · ${Math.round(p.quantity * linkedProd.count).toLocaleString('en-IN')} pcs` : '';
                    return `${p.productionItemName} ${p.quantity} ${p.unit}${pcs}`;
                  }).join(', ') || '—';
                  return (
                    <tr key={batch.id}>
                      {historyTab === 'all' && <td style={{ whiteSpace: 'nowrap' }}>{batch.date}</td>}
                      <td style={{ fontSize: '12px', maxWidth: '200px' }}>{matsStr}</td>
                      <td style={{ fontSize: '12px', maxWidth: '200px' }}>{prodsStr}</td>
                      <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{batch.notes || '—'}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="action-edit" onClick={() => startEdit(batch)}>Edit</button>
                          <button type="button" className="action-delete" onClick={() => removeBatch(batch)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {allProduction.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="action-delete" style={{ fontSize: '11px', padding: '6px 12px' }}
              onClick={() => { if (window.confirm('Delete ALL production records? This cannot be undone.')) run(() => storage.clearProductionHistory()); }}>
              Clear all records
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Product Stock */}
    {availableStock.length > 0 && (
      <section className="im-panel">
        <div className="im-panel-title"><h2>Product Stock</h2></div>
        {availableStock.map((pi, i) => (
          <div key={i} className="production-summary-row">
            <span>{pi.name}</span>
            <b>{pi.qty.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {pi.unit} · {pi.pcs.toLocaleString('en-IN')} pcs</b>
          </div>
        ))}
      </section>
    )}

    {/* Production Items management */}
    <section className="im-panel">
      <div className="im-panel-title">
        <h2>Production Items</h2>
        <button className="im-primary" onClick={() => { setEditingItem(null); setItemForm({ name: '' }); setShowItemForm(true); }}>+ Add item</button>
      </div>
      {showItemForm && (
        <form onSubmit={submitItem} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: '160px', margin: 0 }}>Name
            <input required autoFocus value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Roll Cake" />
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="im-secondary" onClick={() => { setShowItemForm(false); setEditingItem(null); }}>Cancel</button>
            <button type="submit" className="im-primary">{editingItem ? 'Update' : 'Save'}</button>
          </div>
        </form>
      )}
      {data.productionItems.length === 0 ? (
        <p className="im-muted" style={{ fontSize: '13px' }}>No production items yet. Add your first item above.</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {data.productionItems.map(item => {
            const linkedProducts = data.products.filter(p => p.productionItemId === item.id);
            return (
              <div key={item.id} className="production-summary-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <b style={{ fontSize: '13px' }}>{item.name}</b>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '8px' }}>{data.products.find(p => p.productionItemId === item.id)?.conversionUnit ?? '—'}</span>
                  {linkedProducts.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>→ {linkedProducts.map(p => p.name).join(', ')}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button className="action-edit" onClick={() => editItem(item)}>Edit</button>
                  <button className="action-delete" onClick={() => removeItem(item)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  </>;
}

type CustomerFormValue = { name: string; phone: string; type: 'wholesaler' | 'retailer'; previousBalance: string; previousAdvance: string };
function CustomerForm({ form, setForm, submit, close, editing }: { form: CustomerFormValue; setForm: (v: CustomerFormValue) => void; submit: (e: FormEvent) => void; close: () => void; editing: boolean }) {
  return <div className="im-modal-backdrop"><div className="im-modal"><button className="im-modal-close" onClick={close}>×</button><h2>{editing ? 'Edit customer' : 'Add customer'}</h2><form className="im-modal-form" onSubmit={submit}><label>Name<input required autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Phone<input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><label>Customer type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'wholesaler' | 'retailer' })}><option value="retailer">Retailer</option><option value="wholesaler">Wholesaler</option></select></label>{!editing && <><label>Previous balance (₹) <span style={{ fontWeight: 400, color: 'var(--muted)' }}>optional — opening dues</span><input type="number" min="0" step="0.01" value={form.previousBalance} onChange={e => setForm({ ...form, previousBalance: e.target.value })} placeholder="0" /></label><label>Opening advance (₹) <span style={{ fontWeight: 400, color: 'var(--muted)' }}>optional — prepaid credit</span><input type="number" min="0" step="0.01" value={form.previousAdvance} onChange={e => setForm({ ...form, previousAdvance: e.target.value })} placeholder="0" /></label></>}<button className="im-primary" type="submit">{editing ? 'Save changes' : 'Add customer'}</button></form></div></div>;
}

function CustomerBalance({ c }: { c: storage.Customer }) {
  if (c.outstandingPaise > 0) return <span style={{ color: '#a43932' }}>{money(c.outstandingPaise)} due</span>;
  if (c.advancePaise > 0) return <span style={{ color: '#2e7d32' }}>{money(c.advancePaise)} adv</span>;
  return <span style={{ color: '#666' }}>—</span>;
}

export function CustomersWorkspace() {
  const { data, run, notice, error } = useSimpleInventory();
  const [mode, setMode] = useState<Mode>('cards');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<storage.Customer | null>(null);
  const [form, setForm] = useState<CustomerFormValue>({ name: '', phone: '', type: 'retailer', previousBalance: '', previousAdvance: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);

  const blankForm = (): CustomerFormValue => ({ name: '', phone: '', type: 'retailer', previousBalance: '', previousAdvance: '' });

  function openCreate() { setEditing(null); setForm(blankForm()); setShowForm(true); }
  function openEdit(c: storage.Customer) { setEditing(c); setForm({ name: c.name, phone: c.phone, type: c.type, previousBalance: '', previousAdvance: '' }); setShowForm(true); }
  function remove(c: storage.Customer) { if (window.confirm(`Delete "${c.name}"?`)) run(() => storage.deleteCustomer(c.id)); }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    run(() => {
      if (editing) {
        storage.updateCustomer(editing.id, { name: form.name, phone: form.phone, type: form.type });
      } else {
        const previousBalancePaise = form.previousBalance !== '' ? Math.round(Number(form.previousBalance) * 100) : undefined;
        const previousAdvancePaise = form.previousAdvance !== '' ? Math.round(Number(form.previousAdvance) * 100) : undefined;
        storage.addCustomer({ name: form.name, phone: form.phone, type: form.type, previousBalancePaise, previousAdvancePaise });
      }
    });
    setEditing(null); setShowForm(false);
  }

  const selected = selectedId ? data.customers.find(c => c.id === selectedId) : null;

  return <>
    <Feedback notice={notice} error={error} />
    <div className="im-section-actions">
      <div><p className="im-kicker">CUSTOMERS</p><h2 className="im-page-title">Customer accounts</h2></div>
      <div className="action-group"><ViewToggle mode={mode} setMode={setMode} /><button className="im-primary" onClick={openCreate}>+ Add customer</button></div>
    </div>

    {selected ? (
      viewingInvoice ? (
        <section className="im-panel" style={{ textAlign: 'center' }}>
          <div className="bill-preview">{generateBillContent(viewingInvoice)}</div>
          <BillActions invoice={viewingInvoice} />
          <button className="im-primary" style={{ marginTop: '8px' }} onClick={() => setViewingInvoice(null)}>← Back to {selected.name}</button>
        </section>
      ) : <>
        <section className="im-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ margin: 0 }}>{selected.name}</h2>
            <span className={`im-status ${selected.type === 'wholesaler' ? 'credit' : 'settled'}`} style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selected.type}</span>
          </div>
          <p style={{ color: 'var(--muted)' }}>{selected.phone || 'No phone'}</p>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1, padding: '12px', background: selected.outstandingPaise > 0 ? '#fee7e5' : '#e8f5e9', borderRadius: '4px' }}>
              <small>Outstanding</small>
              <div style={{ fontSize: '20px', fontWeight: 600, color: selected.outstandingPaise > 0 ? '#a43932' : '#2e7d32' }}>{money(selected.outstandingPaise)}</div>
            </div>
            <div style={{ flex: 1, padding: '12px', background: selected.advancePaise > 0 ? '#e3f2fd' : '#f5f5f5', borderRadius: '4px' }}>
              <small>Advance</small>
              <div style={{ fontSize: '20px', fontWeight: 600, color: selected.advancePaise > 0 ? '#0d47a1' : '#666' }}>{money(selected.advancePaise)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="im-secondary" onClick={() => setSelectedId(null)}>← Back to list</button>
            <button className="action-edit" onClick={() => openEdit(selected)}>Edit</button>
            <button className="action-delete" onClick={() => { remove(selected); setSelectedId(null); }}>Delete</button>
          </div>
        </section>
        <section className="im-panel" style={{ marginTop: '16px' }}>
          {(() => {
            const salesHistory = storage.getSalesHistory(selected.id);
            return <>
              <div className="im-panel-title"><h2>Bill History</h2><span>{salesHistory.length} total</span></div>
              {salesHistory.length === 0
                ? <div className="im-empty"><b>No bills yet</b><p>Bills will appear here once sales are recorded for this customer.</p></div>
                : <div style={{ display: 'grid', gap: '10px' }}>
                  {salesHistory.map(sale => (
                    <div key={sale.id} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '12px 14px', background: '#fbfcf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{sale.date}</div>
                        <small style={{ color: 'var(--muted)', fontSize: '12px' }}>{sale.lines.length} item{sale.lines.length === 1 ? '' : 's'} · {money(sale.totalPaise)}</small>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="im-secondary" style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600 }} onClick={() => setViewingInvoice(sale)}>View</button>
                        <button type="button" style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: 'var(--muted)' }} onClick={() => { setViewingInvoice(sale); setTimeout(() => window.print(), 100); }}>Print</button>
                      </div>
                    </div>
                  ))}
                </div>}
            </>;
          })()}
        </section>
      </>
    ) : data.customers.length === 0 ? (
      <Empty title="No customers yet" text="Add customers to track their purchase history and balance." action="Add customer" onAction={openCreate} />
    ) : mode === 'cards' ? (
      <div className="im-party-grid">
        {data.customers.map(c => (
          <article className="im-party-card supplier-card" key={c.id}>
            <button className="card-open" onClick={() => setSelectedId(c.id)}>
              <div className="supplier-info-rows">
                <span className="supplier-row-label">Name</span><span className="supplier-row-value">{c.name}</span>
                <span className="supplier-row-label">Type</span><span className="supplier-row-value"><span className={`im-status ${c.type === 'wholesaler' ? 'credit' : 'settled'}`}>{c.type === 'wholesaler' ? 'Wholesaler' : 'Retailer'}</span></span>
                {c.phone && <><span className="supplier-row-label">Phone</span><span className="supplier-row-value">{c.phone}</span></>}
                <span className="supplier-row-label">Balance</span><span className="supplier-row-value"><CustomerBalance c={c} /></span>
              </div>
            </button>
            <SupplierActions edit={() => openEdit(c)} remove={() => remove(c)} />
          </article>
        ))}
      </div>
    ) : (
      <section className="im-panel im-table-scroll">
        <table><thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Balance</th><th>Actions</th></tr></thead>
          <tbody>{data.customers.map(c => (
            <tr key={c.id}>
              <td><button className="table-link" onClick={() => setSelectedId(c.id)}>{c.name}</button></td>
              <td><span className={`im-status ${c.type === 'wholesaler' ? 'credit' : 'settled'}`}>{c.type === 'wholesaler' ? 'Wholesaler' : 'Retailer'}</span></td>
              <td>{c.phone || '—'}</td>
              <td><CustomerBalance c={c} /></td>
              <td><SupplierActions edit={() => openEdit(c)} remove={() => remove(c)} /></td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    )}

    {showForm && <CustomerForm form={form} setForm={setForm} submit={submit} close={() => { setEditing(null); setShowForm(false); }} editing={!!editing} />}
  </>;
}

function generateBillContent(invoice: any) {
  const W = 43;
  const sep  = '═'.repeat(W);
  const dash = '─'.repeat(W);
  const ctr  = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
  const HDR  = `${'Item'.padEnd(15)} ${'Qty'.padStart(4)}  ${'Rate'.padStart(9)}  ${'Total'.padStart(10)}`;

  let content = `${sep}
${ctr('MRJ BEST BAKERY')}
${ctr('12A Main Bazaar St.')}
${ctr('New Aayakudi, Palani')}
${ctr('Phone: +91-8248395591')}
${sep}

Bill #: ${invoice.id.slice(0, 8).toUpperCase()}
Date  : ${invoice.date}
Name  : ${invoice.customerName}

${HDR}
${dash}
`;

  invoice.lines.forEach((l: any) => {
    const name  = l.productName.substring(0, 15).padEnd(15);
    const qty   = String(l.quantityPackets).padStart(4);
    const rate  = `₹${(l.pricePerPacketPaise / 100).toFixed(2)}`.padStart(9);
    const total = `₹${(l.totalPaise / 100).toFixed(2)}`.padStart(10);
    content += `${name} ${qty}  ${rate}  ${total}\n`;
  });

  const totalItems  = invoice.lines.reduce((sum: number, l: any) => sum + l.quantityPackets, 0);
  const prevDue     = invoice.previousOutstandingPaise ?? 0;
  const prevAdv     = invoice.previousAdvancePaise ?? 0;
  const hasPrev     = prevDue > 0 || prevAdv > 0;
  const disc        = invoice.discountPaise ?? 0;
  const extra       = invoice.extraChargePaise ?? 0;
  const finalTotal  = invoice.finalTotalPaise ?? invoice.totalPaise;
  const grandTotal  = finalTotal + prevDue - prevAdv;
  const netOut      = grandTotal - invoice.paidPaise;

  const fmt = (n: number) => `₹${(Math.abs(n) / 100).toFixed(2)}`.padStart(30);

  let summaryLines = `Subtotal    :${fmt(invoice.totalPaise)}\n`;
  if (disc > 0)    summaryLines += `Discount    :${fmt(disc)}\n`;
  if (extra > 0) {
    const noteLabel = invoice.extraChargesNote ? `Extra(${invoice.extraChargesNote.substring(0, 8)})` : 'Extra Chg  ';
    summaryLines += `${noteLabel.padEnd(12)}:${fmt(extra)}\n`;
  }
  if (disc > 0 || extra > 0) summaryLines += `Net Total   :${fmt(finalTotal)}\n`;
  if (prevDue > 0) summaryLines += `Old due     :${fmt(prevDue)}\n`;
  if (prevAdv > 0) summaryLines += `Old advance :${fmt(prevAdv)}\n`;
  if (hasPrev)     summaryLines += `Grand Total :${fmt(grandTotal)}\n`;
  summaryLines += `Amount Paid :${fmt(invoice.paidPaise)}\n`;
  summaryLines += `Paid Via    :${(invoice.paymentType ?? 'Cash').padStart(30)}\n`;
  summaryLines += `Outstanding :${(netOut <= 0 ? `₹${(Math.abs(netOut) / 100).toFixed(2)} adv` : `₹${(netOut / 100).toFixed(2)}`).padStart(30)}`;

  content += `${dash}
Total Items :${String(totalItems).padStart(30)}
${dash}
${summaryLines}
${sep}
${ctr('Thank you for your purchase!')}
${sep}`;

  return content;
}

async function generateBillBlob(content: string): Promise<Blob> {
  const lines = content.split('\n');
  const canvas = document.createElement('canvas');
  const fontSize = 13;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `600 ${fontSize}px "Courier New", Courier, monospace`;
  const cw = ctx.measureText('W').width;
  const lh = Math.ceil(fontSize * 1.65);
  const pad = 18;
  const maxLen = Math.max(...lines.map(l => l.length));
  canvas.width  = Math.ceil(maxLen * cw) + pad * 2;
  canvas.height = lines.length * lh + pad * 2;
  ctx.font = `600 ${fontSize}px "Courier New", Courier, monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111111';
  lines.forEach((line, i) => ctx.fillText(line, pad, pad + fontSize + i * lh));
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/png', 1.0));
}

async function generatePdfBlob(content: string): Promise<Blob> {
  const imgBlob = await generateBillBlob(content);
  const imgUrl = URL.createObjectURL(imgBlob);
  const img = new Image();
  img.src = imgUrl;
  await new Promise(resolve => { img.onload = resolve; });
  const widthMm = 80;
  const heightMm = (img.naturalHeight / img.naturalWidth) * widthMm;
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ format: [widthMm, heightMm], unit: 'mm', orientation: 'portrait' });
  doc.addImage(img, 'PNG', 0, 0, widthMm, heightMm);
  URL.revokeObjectURL(imgUrl);
  return doc.output('blob');
}

async function shareAsPdf(content: string, customerName: string) {
  const blob = await generatePdfBlob(content);
  const file = new File([blob], `bill-${customerName}.pdf`, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ title: `Bill — ${customerName}`, files: [file] }); return; } catch { /* cancelled */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `bill-${customerName}.pdf`; a.click();
  URL.revokeObjectURL(url);
}

async function savePdf(content: string, customerName: string) {
  const blob = await generatePdfBlob(content);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `bill-${customerName}.pdf`; a.click();
  URL.revokeObjectURL(url);
}

function BillActions({ invoice }: { invoice: any }) {
  const content = generateBillContent(invoice);
  return (
    <div className="bill-action-row">
      <button className="im-secondary" onClick={() => shareAsPdf(content, invoice.customerName)}>Share PDF</button>
      <button className="im-secondary" onClick={() => savePdf(content, invoice.customerName)}>Save PDF</button>
      <button className="im-secondary" onClick={() => window.print()}>Print</button>
    </div>
  );
}

export function BillingWorkspace() {
  const { data, run, refresh, notice, error } = useSimpleInventory();
  const [stage, setStage] = useState<'select-customer' | 'add-items' | 'confirm' | 'preview'>('select-customer');
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(today());
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number; pricePerPacketPaise: number }>>([{ productId: '', quantity: 0, pricePerPacketPaise: 0 }]);
  const [paid, setPaid] = useState(0);
  const [discountRupees, setDiscountRupees] = useState('0');
  const [extraChargesRupees, setExtraChargesRupees] = useState('0');
  const [extraChargesNote, setExtraChargesNote] = useState('');
  const [paymentType, setPaymentType] = useState<storage.PaymentType>('Cash');
  const [summaryDetailType, setSummaryDetailType] = useState<storage.PaymentType | null>(null);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);

  const selected = customerId ? data.customers.find(c => c.id === customerId) : null;
  const totalPaise = lines.reduce((sum, line) => sum + (line.quantity * line.pricePerPacketPaise), 0);
  const discountPaise = Math.round(Number(discountRupees || 0) * 100);
  const extraChargePaise = Math.round(Number(extraChargesRupees || 0) * 100);
  const finalTotalPaise = totalPaise - discountPaise + extraChargePaise;
  const outstandingPaise = finalTotalPaise - paid;
  const netPaise = finalTotalPaise + (selected?.outstandingPaise ?? 0) - (selected?.advancePaise ?? 0) - paid;

  function priceForCustomer(product: storage.Product): number {
    if (selected?.type === 'wholesaler' && product.wholesalePricePerPacketPaise != null) return product.wholesalePricePerPacketPaise;
    return product.pricePerPacketPaise;
  }

  function handleAddCustomer(e: FormEvent) {
    e.preventDefault();
    if (!customerId) return;
    setStage('add-items');
  }

  function handleConfirmSale(e: FormEvent) {
    e.preventDefault();
    if (!customerId || !selected) return;
    const validLines = lines.filter(l => l.productId && l.quantity > 0);
    if (validLines.length === 0) return;

    const ok = run(() => {
      const saleLines = validLines.map(line => {
        const product = data.products.find(p => p.id === line.productId);
        if (!product) throw new Error('Product not found');
        return { productId: line.productId, productName: product.name, quantityPackets: line.quantity, pricePerPacketPaise: line.pricePerPacketPaise, totalPaise: line.quantity * line.pricePerPacketPaise };
      });
      const invoice = storage.postSale({ date, customerId, customerName: selected.name, lines: saleLines, totalPaise, discountPaise: discountPaise > 0 ? discountPaise : undefined, extraChargePaise: extraChargePaise > 0 ? extraChargePaise : undefined, extraChargesNote: extraChargesNote.trim() || undefined, finalTotalPaise, paidPaise: paid, outstandingPaise, paymentType, previousOutstandingPaise: selected.outstandingPaise, previousAdvancePaise: selected.advancePaise });
      setLastInvoice({ ...invoice, customerName: selected.name });
    });

    if (ok) setStage('preview');
  }

  function newBill() {
    setCustomerId('');
    setStage('select-customer');
    setLines([{ productId: '', quantity: 0, pricePerPacketPaise: 0 }]);
    setPaid(0);
    setDiscountRupees('0');
    setExtraChargesRupees('0');
    setExtraChargesNote('');
    setPaymentType('Cash');
    setLastInvoice(null);
    setViewingInvoice(null);
  }


  if (stage === 'select-customer') {
    const todaySales = storage.getSalesForDate(today());
    const todayBilledPaise = todaySales.reduce((s, inv) => s + (inv.finalTotalPaise ?? inv.totalPaise), 0);
    const todayReceivedPaise = todaySales.reduce((s, inv) => s + inv.paidPaise, 0);
    const byType: Record<storage.PaymentType, number> = { UPI: 0, Cash: 0, Card: 0, Other: 0 };
    for (const inv of todaySales) byType[inv.paymentType ?? 'Cash'] += inv.paidPaise;
    const detailSales = summaryDetailType ? todaySales.filter(inv => (inv.paymentType ?? 'Cash') === summaryDetailType) : [];
    const PAYMENT_ICONS: Record<storage.PaymentType, string> = { UPI: '📲', Cash: '💵', Card: '💳', Other: '•' };

    return <>
      <Feedback notice={notice} error={error} />
      <div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">Customer sales</h2></div>
      <section className="im-panel">
        <form onSubmit={handleAddCustomer}>
          <label>Select customer
            <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Choose a customer…</option>
              {data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.outstandingPaise > 0 ? ` (₹${(c.outstandingPaise / 100).toFixed(0)} due)` : ''}</option>)}
            </select>
          </label>
          <button type="submit" className="im-primary">Next</button>
        </form>
      </section>

      <div className="exp-section" style={{ marginTop: '8px' }}>
        <div className="exp-section-head exp-head-history">
          <div className="exp-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            Today&apos;s Payment Summary
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{todaySales.length} bill{todaySales.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="exp-section-body">
          <div className="im-summary-grid" style={{ margin: 0 }}>
            <article>
              <span>Total Billed</span>
              <strong>{todayBilledPaise > 0 ? money(todayBilledPaise) : '—'}</strong>
            </article>
            <article className={todayReceivedPaise > 0 ? 'positive' : ''}>
              <span>Total Received</span>
              <strong>{todayReceivedPaise > 0 ? money(todayReceivedPaise) : '—'}</strong>
            </article>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
            {(['Cash', 'UPI', 'Card', 'Other'] as const).map(pt => {
              const amt = byType[pt];
              const isActive = summaryDetailType === pt;
              return (
                <button key={pt} type="button" onClick={() => setSummaryDetailType(isActive ? null : pt)}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', border: `1px solid ${isActive ? 'var(--coffee)' : 'var(--line)'}`, borderRadius: '8px', background: isActive ? '#fdf5ec' : '#fff', cursor: amt > 0 ? 'pointer' : 'default', textAlign: 'left' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{PAYMENT_ICONS[pt]} {pt}</span>
                  <strong style={{ fontSize: '15px', color: amt > 0 ? 'var(--ink)' : 'var(--muted)' }}>{amt > 0 ? money(amt) : '—'}</strong>
                </button>
              );
            })}
          </div>
          {summaryDetailType && detailSales.length > 0 && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>{summaryDetailType} transactions today</p>
              <table className="exp-hist-table">
                <thead><tr><th>Customer</th><th>Items</th><th>Billed</th><th>Paid</th><th>Date</th></tr></thead>
                <tbody>
                  {detailSales.map(inv => (
                    <tr key={inv.id}>
                      <td className="exp-hist-name">{inv.customerName}</td>
                      <td className="exp-hist-meta">{inv.lines.length} item{inv.lines.length !== 1 ? 's' : ''}</td>
                      <td>{money(inv.finalTotalPaise ?? inv.totalPaise)}</td>
                      <td style={{ fontWeight: 600 }}>{money(inv.paidPaise)}</td>
                      <td className="exp-hist-meta">{inv.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>;
  }

  if (stage === 'add-items' && selected) {
    const customerSalesHistory = storage.getSalesHistory(customerId);
    if (viewingInvoice) {
      const billContent = generateBillContent(viewingInvoice);
      return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">View bill</h2></div><section className="im-panel" style={{ textAlign: 'center' }}><div className="bill-preview">{billContent}</div><BillActions invoice={viewingInvoice} /><button className="im-primary" style={{ marginTop: '8px' }} onClick={() => setViewingInvoice(null)}>← Back to customer</button></section></>;
    }
    return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">{selected.name} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)' }}>({selected.type})</span></h2></div><section className="im-panel"><h3 style={{ marginTop: 0, marginBottom: '16px' }}>New bill</h3><form onSubmit={(e) => { e.preventDefault(); setStage('confirm'); }}><div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}><label style={{ flex: 1 }}>Date<input required type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><button type="button" className="im-secondary" onClick={() => { setCustomerId(''); setStage('select-customer'); }}>Change customer</button></div><div className="im-table-scroll"><table><thead><tr><th>Product</th><th>Qty</th><th>Price/Packet</th><th>Total</th><th /></tr></thead><tbody>{lines.map((line, idx) => { const product = data.products.find(p => p.id === line.productId); return <tr key={idx}><td><select value={line.productId} onChange={(e) => { const p = data.products.find(x => x.id === e.target.value); setLines(lines.map((l, i) => i === idx ? { ...l, productId: e.target.value, pricePerPacketPaise: p ? priceForCustomer(p) : 0 } : l)); }}><option value="">Select…</option>{data.products.map((p) => { const piStock = p.productionItemId ? storage.getProductionItemStock(p.productionItemId) : null; let label = ''; if (piStock != null) { if (piStock > 0) { const kgOrTray = (piStock / (p.count ?? 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 }); const unit = p.conversionUnit ?? 'KG'; label = ` (${kgOrTray} ${unit} · ${piStock} pcs)`; } else { label = ' (out)'; } } return <option key={p.id} value={p.id}>{p.name}{label}</option>; })}</select></td><td><input type="number" min="0" step="1" value={line.quantity} onChange={(e) => setLines(lines.map((l, i) => i === idx ? { ...l, quantity: Number(e.target.value) } : l))} /></td><td>{money(line.pricePerPacketPaise)}</td><td style={{ fontWeight: 600 }}>{money(line.quantity * line.pricePerPacketPaise)}</td><td>{lines.length > 1 && <button type="button" className="im-remove" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>×</button>}</td></tr>; })}</tbody></table></div><button type="button" className="im-secondary" onClick={() => setLines([...lines, { productId: '', quantity: 0, pricePerPacketPaise: 0 }])}>+ Add line</button><button type="submit" className="im-primary ml-5">Continue to payment</button></form></section><section className="im-panel" style={{ marginTop: '24px' }}><div className="im-panel-title"><h2>Bill history</h2><span>{customerSalesHistory.length} total</span></div>{customerSalesHistory.length === 0 ? <div className="im-empty"><b>No bills yet</b><p>Bills will appear here once you generate sales for this customer.</p></div> : <div style={{ display: 'grid', gap: '10px' }}>{customerSalesHistory.map((sale) => <div key={sale.id} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '12px 14px', background: '#fbfcf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{sale.date}</div><small style={{ color: 'var(--muted)', fontSize: '12px' }}>{sale.lines.length} item{sale.lines.length === 1 ? '' : 's'} · {money(sale.totalPaise)}</small></div><div style={{ display: 'flex', gap: '6px' }}><button type="button" className="im-secondary" style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600 }} onClick={() => setViewingInvoice(sale)}>View</button><button type="button" style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: 'var(--muted)' }} onClick={() => { setViewingInvoice(sale); setTimeout(() => window.print(), 100); }}>Print</button></div></div>)}</div>}</section></>;
  }

  if (stage === 'confirm' && selected) {
    return <>
      <Feedback notice={notice} error={error} />
      <div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">Confirm & pay</h2></div>
      <section className="im-panel">
        <form onSubmit={handleConfirmSale}>
          <div className="im-table-scroll">
            <table>
              <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
              <tbody>
                {lines.filter(l => l.productId).map((line, idx) => {
                  const product = data.products.find(p => p.id === line.productId);
                  return <tr key={idx}><td>{product?.name}</td><td>{line.quantity}</td><td>{money(line.pricePerPacketPaise)}</td><td style={{ fontWeight: 600 }}>{money(line.quantity * line.pricePerPacketPaise)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '10px 16px', alignItems: 'center', marginTop: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
            <span>Subtotal</span>
            <strong style={{ textAlign: 'right', fontSize: '18px' }}>{money(totalPaise)}</strong>

            <label style={{ margin: 0 }}>Discount (₹)</label>
            <input type="number" min="0" step="0.01" value={discountRupees} onChange={e => setDiscountRupees(e.target.value)} style={{ textAlign: 'right', width: '100%' }} />

            <label style={{ margin: 0 }}>Extra Charges (₹)</label>
            <input type="number" min="0" step="0.01" value={extraChargesRupees} onChange={e => setExtraChargesRupees(e.target.value)} style={{ textAlign: 'right', width: '100%' }} />

            <label style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>Extra Charges Note</label>
            <input type="text" value={extraChargesNote} onChange={e => setExtraChargesNote(e.target.value)} placeholder="e.g. Delivery fee" style={{ width: '100%' }} />

            {(discountPaise > 0 || extraChargePaise > 0) && <>
              <span style={{ fontWeight: 600 }}>Final Total</span>
              <strong style={{ textAlign: 'right', fontSize: '18px', color: 'var(--coffee)' }}>{money(finalTotalPaise)}</strong>
            </>}

            <span>Old advance / due</span>
            <span style={{ textAlign: 'right' }}>
              {selected.outstandingPaise > 0 ? <span style={{ color: '#a43932' }}>{money(selected.outstandingPaise)} due</span> : selected.advancePaise > 0 ? <span style={{ color: '#2e7d32' }}>{money(selected.advancePaise)} adv</span> : <span style={{ color: '#666' }}>—</span>}
            </span>

            <span>Outstanding</span>
            <strong style={{ textAlign: 'right', fontSize: '16px', color: netPaise > 0 ? '#a43932' : netPaise < 0 ? '#2e7d32' : '#666' }}>
              {netPaise !== 0 ? `${money(Math.abs(netPaise))} ${netPaise > 0 ? 'due' : 'adv'}` : '—'}
            </strong>

            <label style={{ margin: 0 }}>Customer pays now (₹)</label>
            <input type="number" min="0" step="0.01" value={paid / 100} onChange={(e) => setPaid(Math.round(Number(e.target.value) * 100))} style={{ textAlign: 'right', width: '100%' }} />

            <label style={{ margin: 0 }}>Payment Type</label>
            <select value={paymentType} onChange={e => setPaymentType(e.target.value as storage.PaymentType)} style={{ width: '100%' }}>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="im-secondary" onClick={() => setStage('add-items')}>← Back</button>
            <button type="submit" className="im-primary">Generate bill</button>
          </div>
        </form>
      </section>
    </>;
  }

  if (stage === 'preview' && lastInvoice) {
    const billContent = generateBillContent(lastInvoice);
    return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">Bill generated</h2></div><section className="im-panel" style={{ textAlign: 'center' }}><div className="bill-preview">{billContent}</div><BillActions invoice={lastInvoice} /><button className="im-primary" style={{ marginTop: '8px' }} onClick={newBill}>New bill</button></section></>;
  }

  // Unreachable in normal flow — reset to a safe state if stage/data get out of sync
  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">Customer sales</h2></div><section className="im-panel"><form onSubmit={handleAddCustomer}><label>Select customer<select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Choose a customer…</option>{data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.outstandingPaise > 0 ? ` (₹${(c.outstandingPaise / 100).toFixed(0)} due)` : ''}</option>)}</select></label><button type="submit" className="im-primary">Next</button></form></section></>;
}

export function EmployeesWorkspace() {
  const { run, notice, error } = useSimpleInventory();
  const [mode, setMode] = useState<Mode>('cards');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<storage.Employee | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', openingAdvance: '', openingDue: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<storage.Employee[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<ReturnType<typeof storage.getEmployeeSalaryHistory>>(null);

  useEffect(() => { setEmployees(storage.getAllEmployees()); }, [notice, error]);
  useEffect(() => {
    if (selectedId) setSalaryHistory(storage.getEmployeeSalaryHistory(selectedId));
    else setSalaryHistory(null);
  }, [selectedId, notice, error]);

  const selected = selectedId ? employees.find(e => e.id === selectedId) : null;

  function openAdd() {
    setEditingEmployee(null);
    setForm({ name: '', phone: '', openingAdvance: '', openingDue: '' });
    setShowForm(true);
  }

  function openEdit(emp: storage.Employee) {
    setEditingEmployee(emp);
    setForm({
      name: emp.name,
      phone: emp.phone,
      openingAdvance: emp.openingAdvancePaise ? String(emp.openingAdvancePaise / 100) : '',
      openingDue: emp.openingDuePaise ? String(emp.openingDuePaise / 100) : '',
    });
    setShowForm(true);
    setSelectedId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const openingAdvancePaise = form.openingAdvance !== '' ? Math.round(Number(form.openingAdvance) * 100) : undefined;
    const openingDuePaise = form.openingDue !== '' ? Math.round(Number(form.openingDue) * 100) : undefined;
    run(() => {
      if (editingEmployee) {
        storage.updateEmployee(editingEmployee.id, { name: form.name.trim(), phone: form.phone, openingAdvancePaise: openingAdvancePaise ?? editingEmployee.openingAdvancePaise, openingDuePaise: openingDuePaise ?? editingEmployee.openingDuePaise });
      } else {
        storage.addEmployee({ name: form.name.trim(), phone: form.phone, openingAdvancePaise: openingAdvancePaise ?? 0, openingDuePaise: openingDuePaise ?? 0 });
      }
    });
    setShowForm(false);
    setEditingEmployee(null);
    setForm({ name: '', phone: '', openingAdvance: '', openingDue: '' });
  }

  function handleDelete(emp: storage.Employee) {
    if (window.confirm(`Delete employee "${emp.name}"?`)) {
      run(() => storage.deleteEmployee(emp.id));
      if (selectedId === emp.id) setSelectedId(null);
    }
  }

  return <>
    <Feedback notice={notice} error={error} />
    <div className="im-section-actions">
      <div><p className="im-kicker">EMPLOYEES</p><h2 className="im-page-title">Employee accounts</h2></div>
      <div className="action-group"><ViewToggle mode={mode} setMode={setMode} /><button className="im-primary" onClick={openAdd}>+ Add employee</button></div>
    </div>

    {showForm && (
      <section className="im-panel">
        <h3>{editingEmployee ? 'Edit employee' : 'New employee'}</h3>
        <form onSubmit={handleSubmit}>
          <label>Name<input required autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label>Phone<input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Opening advance (₹) <span style={{ fontWeight: 400, color: 'var(--muted)' }}>optional</span><input type="number" min="0" step="0.01" value={form.openingAdvance} onChange={e => setForm({ ...form, openingAdvance: e.target.value })} placeholder="0" /></label>
          <label>Opening due (₹) <span style={{ fontWeight: 400, color: 'var(--muted)' }}>optional — salary owed to employee</span><input type="number" min="0" step="0.01" value={form.openingDue} onChange={e => setForm({ ...form, openingDue: e.target.value })} placeholder="0" /></label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="im-secondary" onClick={() => { setShowForm(false); setEditingEmployee(null); }}>Cancel</button>
            <button type="submit" className="im-primary">{editingEmployee ? 'Update' : 'Save'}</button>
          </div>
        </form>
      </section>
    )}

    {selected ? (
      <section className="im-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <h2 style={{ margin: 0 }}>{selected.name}</h2>
        </div>
        <p style={{ color: 'var(--muted)' }}>{selected.phone || 'No phone'}</p>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1, padding: '12px', background: selected.advancePaise > 0 ? '#e3f2fd' : '#f5f5f5', borderRadius: '4px' }}>
            <small>Advance given</small>
            <div style={{ fontSize: '20px', fontWeight: 600, color: selected.advancePaise > 0 ? '#0d47a1' : '#666' }}>{money(selected.advancePaise)}</div>
          </div>
          <div style={{ flex: 1, padding: '12px', background: selected.duePaise > 0 ? '#fff8e1' : '#f5f5f5', borderRadius: '4px' }}>
            <small>Salary due</small>
            <div style={{ fontSize: '20px', fontWeight: 600, color: selected.duePaise > 0 ? '#e65100' : '#666' }}>{money(selected.duePaise)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="im-secondary" onClick={() => setSelectedId(null)}>← Back to list</button>
          <button className="action-edit" onClick={() => openEdit(selected)}>Edit</button>
          <button className="action-delete" onClick={() => handleDelete(selected)}>Delete</button>
        </div>

        {salaryHistory && (
          <div style={{ marginTop: '24px' }}>
            <div className="im-panel-title">
              <h2>Salary history</h2>
              <span>{salaryHistory.entries.length} records</span>
            </div>
            {salaryHistory.entries.length === 0 ? (
              <div className="im-empty">
                <b>No salary transactions yet</b>
                <p>Salary expenses recorded for this employee will appear here.</p>
              </div>
            ) : (
              <div className="im-table-scroll">
                {(() => {
                  const fmtBalance = (n: number) =>
                    n > 0 ? <span className="credit">{money(n)} Adv.</span>
                    : n < 0 ? <span className="due">{money(-n)} Due</span>
                    : <span style={{ color: 'var(--muted)' }}>Settled</span>;
                  return (
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th><th>Actual</th><th>Given</th><th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><em style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Opening</em></td>
                          <td>—</td><td>—</td>
                          <td>{fmtBalance(salaryHistory.openingBalancePaise)}</td>
                        </tr>
                        {salaryHistory.entries.map(entry => (
                          <tr key={entry.expense.id}>
                            <td>{entry.expense.date}</td>
                            <td>{money(entry.expense.actualAmountPaise ?? entry.expense.amountPaise)}</td>
                            <td>{money(entry.expense.amountPaise)}</td>
                            <td><strong>{fmtBalance(entry.runningBalancePaise)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </section>
    ) : employees.length === 0 ? (
      <Empty title="No employees yet" text="Add employees to track their salary and advance." action="Add employee" onAction={openAdd} />
    ) : mode === 'cards' ? (
      <div className="im-party-grid">
        {employees.map(emp => (
          <article className="im-party-card supplier-card" key={emp.id}>
            <button className="card-open" onClick={() => setSelectedId(emp.id)}>
              <div className="supplier-info-rows">
                <span className="supplier-row-label">Name</span><span className="supplier-row-value">{emp.name}</span>
                {emp.phone && <><span className="supplier-row-label">Phone</span><span className="supplier-row-value">{emp.phone}</span></>}
                <span className="supplier-row-label">Balance</span><span className="supplier-row-value">
                  {emp.advancePaise > 0 ? <span style={{ color: '#0d47a1' }}>{money(emp.advancePaise)} adv</span>
                    : emp.duePaise > 0 ? <span style={{ color: '#e65100' }}>{money(emp.duePaise)} due</span>
                    : <span style={{ color: '#666' }}>—</span>}
                </span>
              </div>
            </button>
            <SupplierActions edit={() => openEdit(emp)} remove={() => handleDelete(emp)} />
          </article>
        ))}
      </div>
    ) : (
      <section className="im-panel im-table-scroll">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Balance</th><th>Actions</th></tr></thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td><button className="table-link" onClick={() => setSelectedId(emp.id)}>{emp.name}</button></td>
                <td>{emp.phone || '—'}</td>
                <td>
                  {emp.advancePaise > 0 ? <span style={{ color: '#0d47a1' }}>{money(emp.advancePaise)} adv</span>
                    : emp.duePaise > 0 ? <span style={{ color: '#e65100' }}>{money(emp.duePaise)} due</span>
                    : <span style={{ color: '#666' }}>—</span>}
                </td>
                <td><SupplierActions edit={() => openEdit(emp)} remove={() => handleDelete(emp)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )}
  </>;
}
