'use client';

import { FormEvent, useEffect, useState } from 'react';
import * as storage from '@/lib/inventory/storage';
import './simple.css';
import './simple-actions.css';

const UNITS = ['Kg', 'Gm', 'Lt', 'Pc', 'Pkt', 'Box', 'Bag', 'Btl'];
const today = () => new Date().toISOString().slice(0, 10);
const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
type Mode = 'cards' | 'table';

export function useSimpleInventory() {
  const [data, setData] = useState<storage.InventoryData>({ suppliers: [], items: [], purchases: [], products: [], productionItems: [], recipes: [], productionBatches: [], customers: [], saleInvoices: [], stockMovements: [] });
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

function Feedback({ notice, error }: { notice: string; error: string }) {
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

function ItemActions({ edit, remove }: { edit: () => void; remove: () => void }) { return <div className="row-actions"><button className="action-edit" onClick={edit}>Edit</button><button className="action-delete" onClick={remove}>Delete</button></div>; }

export function ItemsWorkspace() {
  const { data, run, notice, error } = useSimpleInventory();
  const [mode, setMode] = useState<Mode>('table');
  const [editing, setEditing] = useState<storage.InventoryItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ItemFormValue>({ name: '', unit: 'Kg' });
  function openCreate() { setEditing(null); setForm({ name: '', unit: 'Kg' }); setShowForm(true); }
  function openEdit(item: storage.InventoryItem) { setEditing(item); setForm({ name: item.name, unit: item.unit }); setShowForm(true); }
  function submit(event: FormEvent) { event.preventDefault(); if (!form.name.trim()) return; run(() => editing ? storage.updateItem(editing.id, { ...form, name: form.name.trim() }) : storage.addItem({ ...form, name: form.name.trim() })); setEditing(null); setShowForm(false); }
  function remove(item: storage.InventoryItem) { if (window.confirm(`Delete ${item.name}?`)) run(() => storage.deleteItem(item.id)); }
  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">ITEMS</p><h2 className="im-page-title">Your regular purchases</h2></div><div className="action-group"><ViewToggle mode={mode} setMode={setMode} /><button className="im-primary" onClick={openCreate}>+ Add item</button></div></div>{data.items.length === 0 ? <Empty title="No items yet" text="Create an item to make it available in Purchases." action="Add item" onAction={openCreate} /> : mode === 'table' ? <div className="im-panel im-table-scroll"><table><thead><tr><th>Item</th><th>Unit</th><th>Current stock</th><th>Actions</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td>{item.unit}</td><td className="stock-value">{item.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {item.unit}</td><td><ItemActions edit={() => openEdit(item)} remove={() => remove(item)} /></td></tr>)}</tbody></table></div> : <div className="im-party-grid item-card-grid">{data.items.map((item) => <article className="im-party-card item-card" key={item.id}><div className="supplier-info-rows"><span className="supplier-row-label">Item</span><span className="supplier-row-value">{item.name}</span><span className="supplier-row-label">Unit</span><span className="supplier-row-value">{item.unit}</span><span className="supplier-row-label">Stock</span><span className="supplier-row-value stock-value">{item.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {item.unit}</span></div><ItemActions edit={() => openEdit(item)} remove={() => remove(item)} /></article>)}</div>}{showForm && <ItemForm form={form} setForm={setForm} submit={submit} close={() => { setEditing(null); setShowForm(false); }} editing={!!editing} />}</>;
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
  return <section className="im-panel purchase-editor"><div className="im-purchase-header"><div><h2>{editingPurchase ? 'Edit purchase' : 'New purchase'}</h2><p className="im-muted">Add stock and settle the supplier in one quick entry.</p></div><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><div className="view-toggle"><button type="button" className={entryMode==='rate'?'active':''} onClick={()=>setEntryMode('rate')}>Rate-based</button><button type="button" className={entryMode==='total'?'active':''} onClick={()=>setEntryMode('total')}>Total-based</button></div></div><form onSubmit={submit}><div className="im-two"><label>Supplier<select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Select supplier…</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><div className="purchase-balance-note"><div><span>This purchase</span><strong>{money(totalPaise)}</strong></div>{prevPendingPaise > 0 && <div><span>Prev. pending</span><strong style={{color:'#b45309'}}>+{money(prevPendingPaise)}</strong></div>}{prevAdvancePaise > 0 && <div><span>Prev. advance</span><strong style={{color:'#1d4ed8'}}>−{money(prevAdvancePaise)}</strong></div>}{(prevPendingPaise > 0 || prevAdvancePaise > 0) && <div><span>Net to settle</span><strong>{money(Math.max(0, totalPaise + prevPendingPaise - prevAdvancePaise))}</strong></div>}</div></div><div className="im-purchase-lines"><div className="im-line-head"><span>Item</span><span>Qty</span><span>Unit</span><span>{entryMode==='rate'?'Rate (₹)':'Total (₹)'}</span><span>{entryMode==='rate'?'Total':'Rate'}</span><span /></div>{lines.map((line, index) => <div className="im-purchase-line" key={index}><select required value={line.itemId} onChange={(e) => { const item = data.items.find((candidate) => candidate.id === e.target.value); updateLine(index, { itemId: e.target.value, unit: item?.unit || line.unit }); }}><option value="">Select item…</option>{data.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} placeholder="0" /><select value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select>{entryMode==='rate' ? <input required type="number" min="0" step="0.01" value={line.rate} onChange={(e) => updateLine(index, { rate: e.target.value })} placeholder="0" /> : <input required type="number" min="0.01" step="0.01" value={line.total} onChange={(e) => updateLine(index, { total: e.target.value })} placeholder="0" />}{entryMode==='rate' ? <b>{money(Math.round(Number(line.quantity||0)*Number(line.rate||0)*100))}</b> : <b>{Number(line.quantity||0)>0 ? money(Math.round(Number(line.total||0)*100/Number(line.quantity))) : '—'}</b>}<button type="button" className="im-remove" onClick={() => lines.length > 1 ? setLines(lines.filter((_, lineIndex) => lineIndex !== index)) : setLines([{itemId:'',quantity:'',unit:'Kg',rate:'',total:''}])}>×</button></div>)}</div><div className="purchase-actions"><button type="button" className="im-text-button" onClick={() => setLines([...lines, { itemId: '', quantity: '', unit: 'Kg', rate: '', total: '' }])}>+ Add item</button><button type="button" className="im-text-button" onClick={() => setShowNewItem(!showNewItem)}>+ New item</button></div>{showNewItem && <div className="inline-item-form"><label>Item name<input required autoFocus value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Sugar" /></label><label>Unit<select value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label><button className="im-primary" type="button" onClick={addInlineItem}>Add to purchase</button></div>}<div className="purchase-total-row"><label>Amount paid (₹)<input type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" /></label><div><span>Purchase amount</span><strong>{money(totalPaise)}</strong></div><div className={balancePaise < 0 ? 'credit' : balancePaise > 0 ? 'due' : 'settled'}><span>{balancePaise < 0 ? 'Advance / credit' : balancePaise > 0 ? 'Pending' : 'Settlement'}</span><strong>{money(Math.abs(balancePaise))}</strong></div><button className="im-primary" type="submit">{editingPurchase ? 'Save changes' : 'Save purchase'}</button></div></form></section>;
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
    setItemForm({ name: item.name, productionUnit: item.productionUnit, piecesPerUnit: String(item.piecesPerUnit) });
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
            {data.productionItems.length === 0 && <small style={{ color: 'var(--muted)' }}>Create production items on the Recipes page first.</small>}
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
                    <td><div className="row-actions"><button className="action-edit" onClick={() => editProduct(product)}>Edit</button><button className="action-delete" onClick={() => removeProduct(product)}>Delete</button></div></td>
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
                <div className="row-actions"><button className="action-edit" onClick={() => editProduct(product)}>Edit</button><button className="action-delete" onClick={() => removeProduct(product)}>Delete</button></div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  </>;
}

function packetBreakdown(pieces: number, piecesPerPacket: number): string {
  const pkts = Math.floor(pieces / piecesPerPacket);
  const rem = pieces % piecesPerPacket;
  return rem === 0 ? `${pkts} pkts` : `${pkts} pkts · ${rem} pcs`;
}

export function ProductionWorkspace() {
  const { data, run, notice, error } = useSimpleInventory();
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [editingBatch, setEditingBatch] = useState<storage.ProductionBatch | null>(null);
  const [matDrafts, setMatDrafts] = useState<Array<{ itemId: string; quantity: string }>>([{ itemId: '', quantity: '' }]);
  const [prodDrafts, setProdDrafts] = useState<Array<{ productId: string; quantity: string; unit: string }>>([{ productId: '', quantity: '', unit: 'Pcs' }]);
  const [summaryDate, setSummaryDate] = useState(today());

  function getProductUnit(productId: string): string {
    const product = data.products.find(p => p.id === productId);
    if (!product) return 'Pcs';
    if (product.conversionUnit) return product.conversionUnit;
    const pi = product.productionItemId ? data.productionItems.find(pi => pi.id === product.productionItemId) : undefined;
    return pi?.productionUnit ?? 'Pcs';
  }

  function resetForm() {
    setDate(today());
    setNotes('');
    setEditingBatch(null);
    setMatDrafts([{ itemId: '', quantity: '' }]);
    setProdDrafts([{ productId: '', quantity: '', unit: 'Pcs' }]);
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
      .filter(d => d.productId && Number(d.quantity) > 0)
      .map(d => {
        const product = data.products.find(p => p.id === d.productId)!;
        return { productId: product.id, productName: product.name, quantity: Number(d.quantity), unit: d.unit };
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
        ? batch.productsProduced.map(p => ({ productId: p.productId, quantity: String(p.quantity), unit: p.unit ?? getProductUnit(p.productId) }))
        : [{ productId: '', quantity: '', unit: 'Pcs' }]
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function removeBatch(batch: storage.ProductionBatch) {
    if (window.confirm('Delete this production record? Raw material stock will be restored.'))
      run(() => storage.deleteProductionBatch(batch.id));
  }

  const allProduction = storage.getAllProductionBatches();

  const dayBatches = allProduction.filter(b => b.date === summaryDate);
  const matTotals: Record<string, { name: string; qty: number; unit: string }> = {};
  for (const batch of dayBatches) {
    for (const m of batch.rawMaterials ?? []) {
      if (!matTotals[m.itemId]) matTotals[m.itemId] = { name: m.itemName, qty: 0, unit: m.unit };
      matTotals[m.itemId].qty += m.quantity;
    }
  }
  const prodTotals: Record<string, { name: string; qty: number; unit: string; productId: string }> = {};
  for (const batch of dayBatches) {
    for (const p of batch.productsProduced ?? []) {
      if (!prodTotals[p.productId]) prodTotals[p.productId] = { name: p.productName, qty: 0, unit: p.unit ?? 'Pcs', productId: p.productId };
      prodTotals[p.productId].qty += p.quantity;
    }
  }

  const allProdStock: Record<string, { name: string; qty: number; unit: string; productId: string }> = {};
  for (const batch of allProduction) {
    for (const p of batch.productsProduced ?? []) {
      if (!allProdStock[p.productId]) allProdStock[p.productId] = { name: p.productName, qty: 0, unit: p.unit ?? 'Pcs', productId: p.productId };
      allProdStock[p.productId].qty += p.quantity;
    }
  }

  return <>
    <Feedback notice={notice} error={error} />
    <div className="im-section-actions"><div><p className="im-kicker">PRODUCTION</p><h2 className="im-page-title">Record daily production</h2></div></div>

    <section className="im-panel">
      <div className="im-purchase-header" style={{ marginBottom: '16px' }}>
        <div><h2 style={{ font: '700 22px/1 \'Playfair Display\'', margin: 0 }}>{editingBatch ? 'Edit production record' : 'New production record'}</h2>
          <p className="im-muted" style={{ marginTop: '4px' }}>Record raw materials used and products made.</p>
        </div>
        <label style={{ margin: 0 }}>Date<input required type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <form onSubmit={handleSubmit}>

        <p className="im-kicker" style={{ marginBottom: '6px' }}>Raw Materials Used</p>
        <div className="im-purchase-lines">
          <div className="prod-line-head">
            <span>Item</span><span>Qty</span><span>Unit</span><span />
          </div>
          {matDrafts.map((draft, idx) => {
            const selectedItem = draft.itemId ? data.items.find(it => it.id === draft.itemId) : undefined;
            const oldQty = editingBatch?.rawMaterials?.find(m => m.itemId === draft.itemId)?.quantity ?? 0;
            const available = selectedItem ? selectedItem.quantity + oldQty : 0;
            const enteredQty = Number(draft.quantity);
            const overLimit = selectedItem && draft.quantity && enteredQty > available;
            return (
              <div key={idx}>
                <div className="prod-line">
                  <select value={draft.itemId} onChange={e => setMatDrafts(matDrafts.map((d, i) => i === idx ? { ...d, itemId: e.target.value } : d))}>
                    <option value="">Select item…</option>
                    {data.items.map(it => <option key={it.id} value={it.id}>{it.name} (stock: {it.quantity} {it.unit})</option>)}
                  </select>
                  <input type="number" min="0.001" step="0.001" value={draft.quantity}
                    onChange={e => setMatDrafts(matDrafts.map((d, i) => i === idx ? { ...d, quantity: e.target.value } : d))}
                    placeholder="0"
                    style={overLimit ? { borderColor: '#a43932' } : undefined} />
                  <span className="prod-unit-label">{selectedItem?.unit || '—'}</span>
                  <button type="button" className="im-remove"
                    onClick={() => matDrafts.length > 1 ? setMatDrafts(matDrafts.filter((_, i) => i !== idx)) : setMatDrafts([{ itemId: '', quantity: '' }])}>×</button>
                </div>
                {overLimit && (
                  <p className="prod-over-stock-msg" style={{ paddingLeft: '8px' }}>
                    Only {available.toLocaleString('en-IN', { maximumFractionDigits: 3 })} {selectedItem!.unit} in stock
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="purchase-actions">
          <button type="button" className="im-text-button" onClick={() => setMatDrafts([...matDrafts, { itemId: '', quantity: '' }])}>+ Add material</button>
        </div>

        <p className="im-kicker" style={{ marginBottom: '6px', marginTop: '20px' }}>Products Made</p>
        <div className="im-purchase-lines">
          <div className="prod-line-head">
            <span>Product</span><span>Qty</span><span>Unit</span><span />
          </div>
          {prodDrafts.map((draft, idx) => (
            <div key={idx} className="prod-line">
              <select value={draft.productId}
                onChange={e => setProdDrafts(prodDrafts.map((d, i) => i === idx ? { productId: e.target.value, quantity: '', unit: getProductUnit(e.target.value) } : d))}>
                <option value="">Select product…</option>
                {data.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" min="0.001" step="0.001" value={draft.quantity}
                onChange={e => setProdDrafts(prodDrafts.map((d, i) => i === idx ? { ...d, quantity: e.target.value } : d))}
                placeholder="0" />
              <span className="prod-unit-label">{draft.unit || '—'}</span>
              <button type="button" className="im-remove"
                onClick={() => prodDrafts.length > 1 ? setProdDrafts(prodDrafts.filter((_, i) => i !== idx)) : setProdDrafts([{ productId: '', quantity: '', unit: 'Pcs' }])}>×</button>
            </div>
          ))}
        </div>
        <div className="purchase-actions">
          <button type="button" className="im-text-button" onClick={() => setProdDrafts([...prodDrafts, { productId: '', quantity: '', unit: 'Pcs' }])}>+ Add product</button>
        </div>

        <label>Notes (optional)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any production notes…" rows={2} />
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {editingBatch && <button type="button" className="im-secondary" onClick={resetForm}>Cancel</button>}
          <button type="submit" className="im-primary">{editingBatch ? 'Update record' : 'Save production'}</button>
        </div>
      </form>
    </section>

    <section className="im-panel">
      <div className="im-panel-title">
        <h2>Daily summary</h2>
        <input type="date" value={summaryDate} onChange={e => setSummaryDate(e.target.value)}
          style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', background: '#fcfdfb', fontFamily: 'inherit' }} />
      </div>
      {dayBatches.length === 0 ? (
        <p className="im-muted" style={{ fontSize: '13px' }}>No production recorded for this date.</p>
      ) : (
        <div className="production-summary-grid">
          <div>
            <p className="im-kicker" style={{ marginBottom: '6px' }}>Raw Materials Used</p>
            {Object.values(matTotals).map((m, i) => (
              <div key={i} className="production-summary-row">
                <span>{m.name}</span>
                <b>{m.qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })} {m.unit}</b>
              </div>
            ))}
            {Object.keys(matTotals).length === 0 && <p className="im-muted" style={{ fontSize: '12px' }}>—</p>}
          </div>
          <div>
            <p className="im-kicker" style={{ marginBottom: '6px' }}>Products Made</p>
            {Object.values(prodTotals).map((p, i) => {
              const product = data.products.find(pr => pr.id === p.productId);
              const pieces = product?.count ? Math.round(p.qty * product.count) : null;
              const pkts = pieces != null && product?.piecesPerPacket ? packetBreakdown(pieces, product.piecesPerPacket) : null;
              return (
                <div key={i} className="production-summary-row">
                  <span>{p.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <b>{p.qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })} {p.unit}{pieces != null ? ` · ${pieces.toLocaleString('en-IN')} pcs` : ''}</b>
                    {pkts && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{pkts}</div>}
                  </div>
                </div>
              );
            })}
            {Object.keys(prodTotals).length === 0 && <p className="im-muted" style={{ fontSize: '12px' }}>—</p>}
          </div>
        </div>
      )}
      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '10px', marginBottom: 0 }}>
        {dayBatches.length} batch{dayBatches.length === 1 ? '' : 'es'} recorded on this date
      </p>
    </section>

    {Object.keys(allProdStock).length > 0 && (
      <section className="im-panel">
        <div className="im-panel-title"><h2>Product Stock</h2></div>
        {Object.values(allProdStock).map((p, i) => {
          const product = data.products.find(pr => pr.id === p.productId);
          const pieces = product?.count ? Math.round(p.qty * product.count) : null;
          const pkts = pieces != null && product?.piecesPerPacket ? packetBreakdown(pieces, product.piecesPerPacket) : null;
          return (
            <div key={i} className="production-summary-row">
              <span>{p.name}</span>
              <div style={{ textAlign: 'right' }}>
                <b>{pieces != null ? `${pieces.toLocaleString('en-IN')} pcs` : `${p.qty} ${p.unit}`}</b>
                {pkts && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{pkts}</div>}
              </div>
            </div>
          );
        })}
      </section>
    )}

    <section className="im-panel">
      <div className="im-panel-title">
        <h2>Production records</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="date" value={summaryDate} onChange={e => setSummaryDate(e.target.value)}
            style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', background: '#fcfdfb', fontFamily: 'inherit' }} />
          {allProduction.length > 0 && (
            <button className="action-delete" style={{ fontSize: '11px', padding: '6px 12px' }}
              onClick={() => { if (window.confirm('Delete ALL production records? This cannot be undone.')) run(() => storage.clearProductionHistory()); }}>
              Clear all
            </button>
          )}
        </div>
      </div>
      {dayBatches.length === 0 ? (
        <Empty title="No records for this date" text="Select a date above to view production records for that day." />
      ) : (
        <div className="im-party-grid">
          {dayBatches.map((batch) => (
            <article className="im-party-card production-batch-card" key={batch.id}>
              {batch.notes && (
                <div className="supplier-info-rows" style={{ marginBottom: '10px' }}>
                  <span className="supplier-row-label">Notes</span>
                  <span className="supplier-row-value">{batch.notes}</span>
                </div>
              )}
              {(batch.rawMaterials?.length ?? 0) > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <p className="im-kicker" style={{ marginBottom: '4px' }}>Raw Materials Used</p>
                  {batch.rawMaterials!.map((m, i) => (
                    <div key={i} className="production-summary-row">
                      <span>{m.itemName}</span>
                      <b>{m.quantity} {m.unit}</b>
                    </div>
                  ))}
                </div>
              )}
              {(batch.productsProduced?.length ?? 0) > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <p className="im-kicker" style={{ marginBottom: '4px' }}>Products Made</p>
                  {batch.productsProduced!.map((p, i) => (
                    <div key={i} className="production-summary-row">
                      <span>{p.productName}</span>
                      <b>{p.quantity} {p.unit ?? 'Pcs'}</b>
                    </div>
                  ))}
                </div>
              )}
              <div className="row-actions">
                <button className="action-edit" onClick={() => startEdit(batch)}>Edit</button>
                <button className="action-delete" onClick={() => removeBatch(batch)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  </>;
}

export function CustomersWorkspace() {
  const { data, run, refresh, notice, error } = useSimpleInventory();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', type: 'retailer' as 'wholesaler' | 'retailer', previousBalance: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    const previousBalancePaise = form.previousBalance !== '' ? Math.round(Number(form.previousBalance) * 100) : undefined;
    run(() => storage.addCustomer({ name: form.name, phone: form.phone, type: form.type, previousBalancePaise }));
    setForm({ name: '', phone: '', type: 'retailer', previousBalance: '' });
    setShowForm(false);
  }

  const selected = selectedId ? data.customers.find(c => c.id === selectedId) : null;
  const salesHistory = selected ? storage.getSalesHistory(selected.id) : [];

  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">CUSTOMERS</p><h2 className="im-page-title">Customer accounts</h2></div><button className="im-primary" onClick={() => { setForm({ name: '', phone: '', type: 'retailer', previousBalance: '' }); setShowForm(true); }}>+ Add customer</button></div>{showForm && <section className="im-panel"><h3>New customer</h3><form onSubmit={handleSubmit}><label>Name<input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Phone<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Customer type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'wholesaler' | 'retailer' })}><option value="retailer">Retailer</option><option value="wholesaler">Wholesaler</option></select></label><label>Previous balance (₹) <span style={{ fontWeight: 400, color: 'var(--muted)' }}>optional — enter any opening dues</span><input type="number" min="0" step="0.01" value={form.previousBalance} onChange={(e) => setForm({ ...form, previousBalance: e.target.value })} placeholder="0" /></label><div style={{ display: 'flex', gap: '8px' }}><button type="button" className="im-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="im-primary">Save</button></div></form></section>}{selected ? <section className="im-panel"><div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}><h2 style={{ margin: 0 }}>{selected.name}</h2><span className={`im-status ${selected.type === 'wholesaler' ? 'credit' : 'settled'}`} style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selected.type}</span></div><p style={{ color: 'var(--muted)' }}>{selected.phone || 'No phone'}</p><div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}><div style={{ flex: 1, padding: '12px', background: selected.outstandingPaise > 0 ? '#fee7e5' : '#e8f5e9', borderRadius: '4px' }}><small>Outstanding</small><div style={{ fontSize: '20px', fontWeight: 600, color: selected.outstandingPaise > 0 ? '#a43932' : '#2e7d32' }}>{money(selected.outstandingPaise)}</div></div><div style={{ flex: 1, padding: '12px', background: selected.advancePaise > 0 ? '#e3f2fd' : '#f5f5f5', borderRadius: '4px' }}><small>Advance</small><div style={{ fontSize: '20px', fontWeight: 600, color: selected.advancePaise > 0 ? '#0d47a1' : '#666' }}>{money(selected.advancePaise)}</div></div></div><button className="im-secondary" onClick={() => setSelectedId(null)}>← Back to list</button></section> : <section className="im-panel"><div className="im-panel-title"><h2>Customers</h2><span>{data.customers.length} total</span></div>{data.customers.length === 0 ? <Empty title="No customers yet" text="Add customers to track their purchase history and balance." /> : <div className="im-table-scroll"><table><thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Outstanding</th><th>Advance</th></tr></thead><tbody>{data.customers.map((customer) => <tr key={customer.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(customer.id)}><td><b>{customer.name}</b></td><td><span className={`im-status ${customer.type === 'wholesaler' ? 'credit' : 'settled'}`}>{customer.type === 'wholesaler' ? 'Wholesaler' : 'Retailer'}</span></td><td>{customer.phone || '—'}</td><td style={{ color: customer.outstandingPaise > 0 ? '#a43932' : '#666' }}>{money(customer.outstandingPaise)}</td><td style={{ color: customer.advancePaise > 0 ? '#0d47a1' : '#666' }}>{money(customer.advancePaise)}</td></tr>)}</tbody></table></div>}</section>}</>;
}

export function BillingWorkspace() {
  const { data, run, refresh, notice, error } = useSimpleInventory();
  const [stage, setStage] = useState<'select-customer' | 'add-items' | 'confirm' | 'preview'>('select-customer');
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(today());
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number; pricePerPacketPaise: number }>>([{ productId: '', quantity: 0, pricePerPacketPaise: 0 }]);
  const [paid, setPaid] = useState(0);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);

  const selected = customerId ? data.customers.find(c => c.id === customerId) : null;
  const totalPaise = lines.reduce((sum, line) => sum + (line.quantity * line.pricePerPacketPaise), 0);
  const outstandingPaise = totalPaise - paid;

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
      const invoice = storage.postSale({ date, customerId, customerName: selected.name, lines: saleLines, totalPaise, paidPaise: paid, outstandingPaise });

      const balance = storage.getCustomerBalance(customerId);
      storage.updateCustomer(customerId, { outstandingPaise: balance.outstandingPaise + outstandingPaise, advancePaise: balance.advancePaise });

      setLastInvoice({ ...invoice, customerName: selected.name });
    });

    if (ok) setStage('preview');
  }

  function newBill() {
    setCustomerId('');
    setStage('select-customer');
    setLines([{ productId: '', quantity: 0, pricePerPacketPaise: 0 }]);
    setPaid(0);
    setLastInvoice(null);
    setViewingInvoice(null);
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
    const subtotal    = `₹${(invoice.totalPaise / 100).toFixed(2)}`.padStart(30);
    const paidAmt     = `₹${(invoice.paidPaise / 100).toFixed(2)}`.padStart(30);
    const outstanding = `₹${(invoice.outstandingPaise / 100).toFixed(2)}`.padStart(30);

    content += `${dash}
Total Items :${String(totalItems).padStart(30)}
${dash}
Subtotal    :${subtotal}
Amount Paid :${paidAmt}
Outstanding :${outstanding}
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

  async function sendWhatsApp(content: string, customerName: string) {
    const blob = await generatePdfBlob(content);
    const file = new File([blob], `bill-${customerName}.pdf`, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: `Bill — ${customerName}`, files: [file] }); return; } catch { /* cancelled */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(content)}`, '_blank', 'noopener');
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

  if (stage === 'select-customer') {
    return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">Customer sales</h2></div><section className="im-panel"><form onSubmit={handleAddCustomer}><label>Select customer<select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Choose a customer…</option>{data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.outstandingPaise > 0 ? ` (₹${(c.outstandingPaise / 100).toFixed(0)} due)` : ''}</option>)}</select></label><button type="submit" className="im-primary">Next</button></form></section></>;
  }

  if (stage === 'add-items' && selected) {
    const customerSalesHistory = storage.getSalesHistory(customerId);
    if (viewingInvoice) {
      const billContent = generateBillContent(viewingInvoice);
      return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">View bill</h2></div><section className="im-panel" style={{ textAlign: 'center' }}><div className="bill-preview">{billContent}</div><BillActions invoice={viewingInvoice} /><button className="im-primary" style={{ marginTop: '8px' }} onClick={() => setViewingInvoice(null)}>← Back to customer</button></section></>;
    }
    return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">{selected.name} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)' }}>({selected.type})</span></h2></div><section className="im-panel"><h3 style={{ marginTop: 0, marginBottom: '16px' }}>New bill</h3><form onSubmit={(e) => { e.preventDefault(); setStage('confirm'); }}><div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}><label style={{ flex: 1 }}>Date<input required type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><button type="button" className="im-secondary" onClick={() => { setCustomerId(''); setStage('select-customer'); }}>Change customer</button></div><div className="im-table-scroll"><table><thead><tr><th>Product</th><th>Qty</th><th>Price/Packet</th><th>Total</th><th /></tr></thead><tbody>{lines.map((line, idx) => { const product = data.products.find(p => p.id === line.productId); return <tr key={idx}><td><select value={line.productId} onChange={(e) => { const p = data.products.find(x => x.id === e.target.value); setLines(lines.map((l, i) => i === idx ? { ...l, productId: e.target.value, pricePerPacketPaise: p ? priceForCustomer(p) : 0 } : l)); }}><option value="">Select…</option>{data.products.map((p) => { const piStock = p.productionItemId ? storage.getProductionItemStock(p.productionItemId) : null; const label = piStock == null ? '' : piStock > 0 ? ` (${piStock} pcs)` : ' (out)'; return <option key={p.id} value={p.id}>{p.name}{label}</option>; })}</select></td><td><input type="number" min="0" step="1" value={line.quantity} onChange={(e) => setLines(lines.map((l, i) => i === idx ? { ...l, quantity: Number(e.target.value) } : l))} /></td><td>{money(line.pricePerPacketPaise)}</td><td style={{ fontWeight: 600 }}>{money(line.quantity * line.pricePerPacketPaise)}</td><td>{lines.length > 1 && <button type="button" className="im-remove" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>×</button>}</td></tr>; })}</tbody></table></div><button type="button" className="im-secondary" onClick={() => setLines([...lines, { productId: '', quantity: 0, pricePerPacketPaise: 0 }])}>+ Add line</button><button type="submit" className="im-primary">Continue to payment</button></form></section><section className="im-panel" style={{ marginTop: '24px' }}><div className="im-panel-title"><h2>Bill history</h2><span>{customerSalesHistory.length} total</span></div>{customerSalesHistory.length === 0 ? <div className="im-empty"><b>No bills yet</b><p>Bills will appear here once you generate sales for this customer.</p></div> : <div style={{ display: 'grid', gap: '10px' }}>{customerSalesHistory.map((sale) => <div key={sale.id} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '12px 14px', background: '#fbfcf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{sale.date}</div><small style={{ color: 'var(--muted)', fontSize: '12px' }}>{sale.lines.length} item{sale.lines.length === 1 ? '' : 's'} · {money(sale.totalPaise)}</small></div><div style={{ display: 'flex', gap: '6px' }}><button type="button" className="im-secondary" style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600 }} onClick={() => setViewingInvoice(sale)}>View</button><button type="button" style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: 'var(--muted)' }} onClick={() => { setViewingInvoice(sale); setTimeout(() => window.print(), 100); }}>Print</button></div></div>)}</div>}</section></>;
  }

  if (stage === 'confirm' && selected) {
    return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">Confirm & pay</h2></div><section className="im-panel"><form onSubmit={handleConfirmSale}><div className="im-table-scroll"><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>{lines.filter(l => l.productId).map((line, idx) => { const product = data.products.find(p => p.id === line.productId); return <tr key={idx}><td>{product?.name}</td><td>{line.quantity}</td><td>{money(line.pricePerPacketPaise)}</td><td style={{ fontWeight: 600 }}>{money(line.quantity * line.pricePerPacketPaise)}</td></tr>; })}</tbody></table></div><div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '4px', marginTop: '16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}><span>Total bill:</span><strong style={{ fontSize: '18px' }}>{money(totalPaise)}</strong></div><label>Customer pays now (₹)<input type="number" min="0" step="0.01" value={paid / 100} onChange={(e) => setPaid(Math.round(Number(e.target.value) * 100))} /></label><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '8px 0', borderTop: '1px solid #ddd' }}><span>Outstanding:</span><strong style={{ fontSize: '16px', color: outstandingPaise > 0 ? '#a43932' : '#2e7d32' }}>{money(Math.abs(outstandingPaise))}</strong></div></div><div style={{ display: 'flex', gap: '8px' }}><button type="button" className="im-secondary" onClick={() => setStage('add-items')}>← Back</button><button type="submit" className="im-primary">Generate bill</button></div></form></section></>;
  }

  if (stage === 'preview' && lastInvoice) {
    const billContent = generateBillContent(lastInvoice);
    return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">Bill generated</h2></div><section className="im-panel" style={{ textAlign: 'center' }}><div className="bill-preview">{billContent}</div><BillActions invoice={lastInvoice} /><button className="im-primary" style={{ marginTop: '8px' }} onClick={newBill}>New bill</button></section></>;
  }

  // Unreachable in normal flow — reset to a safe state if stage/data get out of sync
  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><p className="im-kicker">BILLING</p><h2 className="im-page-title">Customer sales</h2></div><section className="im-panel"><form onSubmit={handleAddCustomer}><label>Select customer<select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Choose a customer…</option>{data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.outstandingPaise > 0 ? ` (₹${(c.outstandingPaise / 100).toFixed(0)} due)` : ''}</option>)}</select></label><button type="submit" className="im-primary">Next</button></form></section></>;
}
