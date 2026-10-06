'use client';

import { FormEvent, useEffect, useState } from 'react';
import * as storage from '@/lib/inventory/storage';
import './simple.css';
import './simple-actions.css';

const UNITS = ['Kg', 'Gram', 'Liter', 'Piece', 'Packet', 'Box', 'Bag', 'Bottle'];
const today = () => new Date().toISOString().slice(0, 10);
const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
type Mode = 'cards' | 'table';

export function useSimpleInventory() {
  const [data, setData] = useState<storage.InventoryData>({ suppliers: [], items: [], purchases: [] });
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

type SupplierFormValue = { name: string; address: string; contactPerson: string; phone: string };
function SupplierForm({ form, setForm, submit, close, editing }: { form: SupplierFormValue; setForm: (value: SupplierFormValue) => void; submit: (event: FormEvent) => void; close: () => void; editing: boolean }) {
  return <div className="im-modal-backdrop"><div className="im-modal"><button className="im-modal-close" onClick={close}>×</button><h2>{editing ? 'Edit supplier' : 'Add supplier'}</h2><form className="im-modal-form" onSubmit={submit}><label>Shop / supplier name<input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shop A" /></label><label>Contact person<input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></label><label>Contact number<input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Address<textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><button className="im-primary" type="submit">{editing ? 'Save changes' : 'Create supplier'}</button></form></div></div>;
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
  const [form, setForm] = useState<SupplierFormValue>({ name: '', address: '', contactPerson: '', phone: '' });
  const selected = data.suppliers.find((supplier) => supplier.id === selectedId);

  function openCreate() { setEditing(null); setForm({ name: '', address: '', contactPerson: '', phone: '' }); setShowForm(true); }
  function openEdit(supplier: storage.Supplier) { setEditing(supplier); setForm({ name: supplier.name, address: supplier.address, contactPerson: supplier.contactPerson, phone: supplier.phone }); setShowForm(true); }
  function submit(event: FormEvent) { event.preventDefault(); if (!form.name.trim()) return; run(() => editing ? storage.updateSupplier(editing.id, { ...form, name: form.name.trim() }) : storage.addSupplier({ ...form, name: form.name.trim() })); setEditing(null); setShowForm(false); }
  function remove(supplier: storage.Supplier) { if (window.confirm(`Delete ${supplier.name}?`)) run(() => storage.deleteSupplier(supplier.id)); }

  if (selected) {
    const summary = storage.getSupplierSummary(selected.id);
    return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><button className="im-secondary" onClick={() => setSelectedId(null)}>← All suppliers</button><div className="action-group"><button className="im-secondary" onClick={() => openEdit(selected)}>Edit supplier</button><button className="action-delete standalone-delete" onClick={() => remove(selected)}>Delete supplier</button><button className="im-primary" onClick={openCreate}>+ Add supplier</button></div></div><section className="im-detail-hero"><div className="im-avatar large">{selected.name.slice(0, 1).toUpperCase()}</div><div><p className="im-kicker">SUPPLIER</p><h2>{selected.name}</h2><p>{[selected.contactPerson, selected.phone, selected.address].filter(Boolean).join(' · ') || 'No contact details added'}</p></div></section><div className="im-summary-grid"><article><span>Total purchase</span><strong>{money(summary.totalPurchasePaise)}</strong></article><article><span>Paid / settled</span><strong>{money(summary.totalPaidPaise)}</strong></article><article className={summary.pendingPaise ? 'warning' : ''}><span>Pending</span><strong>{money(summary.pendingPaise)}</strong></article><article className={summary.advancePaise ? 'positive' : ''}><span>Advance / credit</span><strong>{money(summary.advancePaise)}</strong></article></div><section className="im-panel im-history-panel"><div className="im-panel-title"><h2>Purchase & payment history</h2><span>{summary.purchases.length} records</span></div>{summary.purchases.length === 0 ? <div className="im-empty"><b>No purchases yet</b><p>Purchases recorded for this supplier will appear here.</p></div> : <div className="im-table-scroll"><table><thead><tr><th>Date</th><th>Items</th><th>Purchase</th><th>Paid</th><th>Status</th></tr></thead><tbody>{summary.purchases.map((purchase) => { const balance = purchase.totalPaise - purchase.paidPaise; return <tr key={purchase.id}><td>{purchase.date}</td><td>{purchase.lines.length}</td><td>{money(purchase.totalPaise)}</td><td>{money(purchase.paidPaise)}</td><td><span className={balance < 0 ? 'credit' : balance > 0 ? 'due' : 'settled'}>{balance < 0 ? `${money(Math.abs(balance))} advance` : balance > 0 ? `${money(balance)} pending` : 'Settled'}</span></td></tr>; })}</tbody></table></div>}</section>{showForm && <SupplierForm form={form} setForm={setForm} submit={submit} close={() => { setEditing(null); setShowForm(false); }} editing={!!editing} />}</>;
  }

  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">SUPPLIERS</p><h2 className="im-page-title">Shops you buy from</h2></div><div className="action-group"><ViewToggle mode={mode} setMode={setMode} /><button className="im-primary" onClick={openCreate}>+ Add supplier</button></div></div>{data.suppliers.length === 0 ? <Empty title="No suppliers yet" text="Add your first shop or vendor to start recording purchases." action="Add supplier" onAction={openCreate} /> : mode === 'table' ? <SupplierTable suppliers={data.suppliers} open={setSelectedId} edit={openEdit} remove={remove} /> : <div className="im-party-grid">{data.suppliers.map((supplier) => { const summary = storage.getSupplierSummary(supplier.id); return <article className="im-party-card supplier-card" key={supplier.id}><button className="card-open" onClick={() => setSelectedId(supplier.id)}><span className="im-avatar">{supplier.name.slice(0, 1).toUpperCase()}</span><strong>{supplier.name}</strong>{supplier.contactPerson && <small>{supplier.contactPerson}</small>}{supplier.phone && <small>{supplier.phone}</small>}<div className="supplier-card-balance"><span>Purchase {money(summary.totalPurchasePaise)}</span><Status summary={summary} /></div></button><SupplierActions edit={() => openEdit(supplier)} remove={() => remove(supplier)} /></article>; })}</div>}{showForm && <SupplierForm form={form} setForm={setForm} submit={submit} close={() => { setEditing(null); setShowForm(false); }} editing={!!editing} />}</>;
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
  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">ITEMS</p><h2 className="im-page-title">Your regular purchases</h2></div><div className="action-group"><ViewToggle mode={mode} setMode={setMode} /><button className="im-primary" onClick={openCreate}>+ Add item</button></div></div>{data.items.length === 0 ? <Empty title="No items yet" text="Create an item to make it available in Purchases." action="Add item" onAction={openCreate} /> : mode === 'table' ? <div className="im-panel im-table-scroll"><table><thead><tr><th>Item</th><th>Unit</th><th>Current stock</th><th>Actions</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td>{item.unit}</td><td className="stock-value">{item.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {item.unit}</td><td><ItemActions edit={() => openEdit(item)} remove={() => remove(item)} /></td></tr>)}</tbody></table></div> : <div className="im-party-grid item-card-grid">{data.items.map((item) => <article className="im-party-card item-card" key={item.id}><strong>{item.name}</strong><small>{item.unit}</small><b className="stock-value">{item.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {item.unit} in stock</b><ItemActions edit={() => openEdit(item)} remove={() => remove(item)} /></article>)}</div>}{showForm && <ItemForm form={form} setForm={setForm} submit={submit} close={() => { setEditing(null); setShowForm(false); }} editing={!!editing} />}</>;
}

type PurchaseLineDraft = { itemId: string; quantity: string; unit: string; rate: string };
function PurchaseEditor({ data, run, refresh, editingPurchase, done }: { data: storage.InventoryData; run: (action: () => void) => boolean; refresh: () => void; editingPurchase: storage.Purchase | null; done: () => void }) {
  const [supplierId, setSupplierId] = useState(editingPurchase?.supplierId || '');
  const [date, setDate] = useState(editingPurchase?.date || today());
  const [paid, setPaid] = useState(editingPurchase ? String(editingPurchase.paidPaise / 100) : '');
  const [lines, setLines] = useState<PurchaseLineDraft[]>(editingPurchase?.lines.map((line) => ({ itemId: line.itemId, quantity: String(line.quantity), unit: line.unit, rate: String(line.unitPricePaise / 100) })) || [{ itemId: '', quantity: '', unit: 'Kg', rate: '' }]);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: 'Kg' });
  const totalPaise = lines.reduce((sum, line) => sum + Math.round(Number(line.quantity || 0) * Number(line.rate || 0) * 100), 0);
  const paidPaise = Math.round(Number(paid || 0) * 100);
  const balancePaise = totalPaise - paidPaise;
  function updateLine(index: number, updates: Partial<PurchaseLineDraft>) { setLines(lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...updates } : line)); }
  function addInlineItem() { if (!newItem.name.trim()) return; const item = storage.addItem({ name: newItem.name.trim(), unit: newItem.unit }); refresh(); setNewItem({ name: '', unit: 'Kg' }); setShowNewItem(false); setLines((current) => { const blank = current.findIndex((line) => !line.itemId); if (blank >= 0) return current.map((line, index) => index === blank ? { ...line, itemId: item.id, unit: item.unit } : line); return [...current, { itemId: item.id, quantity: '', unit: item.unit, rate: '' }]; }); }
  function submit(event: FormEvent) { event.preventDefault(); const valid = lines.filter((line) => line.itemId && Number(line.quantity) > 0 && Number(line.rate) >= 0); if (!supplierId || !valid.length || totalPaise <= 0) return; const success = run(() => { const prepared = valid.map((line) => { const item = data.items.find((candidate) => candidate.id === line.itemId); if (!item) throw new Error('Please select a valid item.'); const lineTotal = Math.round(Number(line.quantity) * Number(line.rate) * 100); return { itemId: item.id, itemName: item.name, quantity: Number(line.quantity), unit: line.unit, unitPricePaise: Math.round(Number(line.rate) * 100), totalPaise: lineTotal }; }); const input = { date, supplierId, lines: prepared, totalPaise, paidPaise }; if (editingPurchase) storage.updatePurchase(editingPurchase.id, input); else storage.postPurchase(input); }); if (success) done(); }
  return <section className="im-panel purchase-editor"><div className="im-purchase-header"><div><h2>{editingPurchase ? 'Edit purchase' : 'New purchase'}</h2><p className="im-muted">Add stock and settle the supplier in one quick entry.</p></div><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></div><form onSubmit={submit}><div className="im-two"><label>Supplier<select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Select supplier…</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><div className="purchase-balance-note"><span>Purchase total</span><strong>{money(totalPaise)}</strong></div></div><div className="im-purchase-lines"><div className="im-line-head"><span>Item</span><span>Qty</span><span>Unit</span><span>Rate (₹)</span><span>Total</span><span /></div>{lines.map((line, index) => <div className="im-purchase-line" key={index}><select required value={line.itemId} onChange={(e) => { const item = data.items.find((candidate) => candidate.id === e.target.value); updateLine(index, { itemId: e.target.value, unit: item?.unit || line.unit }); }}><option value="">Select item…</option>{data.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} placeholder="0" /><select value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select><input required type="number" min="0" step="0.01" value={line.rate} onChange={(e) => updateLine(index, { rate: e.target.value })} placeholder="0" /><b>{money(Math.round(Number(line.quantity || 0) * Number(line.rate || 0) * 100))}</b>{lines.length > 1 && <button type="button" className="im-remove" onClick={() => setLines(lines.filter((_, lineIndex) => lineIndex !== index))}>×</button>}</div>)}</div><div className="purchase-actions"><button type="button" className="im-text-button" onClick={() => setLines([...lines, { itemId: '', quantity: '', unit: 'Kg', rate: '' }])}>+ Add item</button><button type="button" className="im-text-button" onClick={() => setShowNewItem(!showNewItem)}>+ New item</button></div>{showNewItem && <div className="inline-item-form"><label>Item name<input required autoFocus value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Sugar" /></label><label>Unit<select value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label><button className="im-primary" type="button" onClick={addInlineItem}>Add to purchase</button></div>}<div className="purchase-total-row"><label>Amount paid (₹)<input type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" /></label><div><span>Purchase amount</span><strong>{money(totalPaise)}</strong></div><div className={balancePaise < 0 ? 'credit' : balancePaise > 0 ? 'due' : 'settled'}><span>{balancePaise < 0 ? 'Advance / credit' : balancePaise > 0 ? 'Pending' : 'Settlement'}</span><strong>{money(Math.abs(balancePaise))}</strong></div><button className="im-primary" type="submit">{editingPurchase ? 'Save changes' : 'Save purchase'}</button></div></form></section>;
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
  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">PURCHASES</p><h2 className="im-page-title">Record a purchase</h2></div><div className="action-group"><ViewToggle mode={mode} setMode={setMode} /><button className="im-primary" onClick={newPurchase}>+ New purchase</button></div></div>{showEditor && <PurchaseEditor data={data} run={run} refresh={refresh} editingPurchase={editing} done={() => { setEditing(null); setShowEditor(false); }} />}<section className="im-panel purchase-history-panel"><div className="im-panel-title"><h2>Purchase history</h2><span>{data.purchases.length} total</span></div>{data.purchases.length === 0 ? <Empty title="No purchases yet" text="Your saved purchases will appear here." /> : mode === 'table' ? <div className="im-table-scroll"><table><thead><tr><th>Date</th><th>Supplier</th><th>Items</th><th>Purchase</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.purchases.map((purchase) => <tr key={purchase.id}><td>{purchase.date}</td><td><b>{purchase.supplierName}</b></td><td>{purchase.lines.length}</td><td>{money(purchase.totalPaise)}</td><td>{money(purchase.paidPaise)}</td><td><PurchaseStatus purchase={purchase} /></td><td><PurchaseActions edit={() => edit(purchase)} remove={() => remove(purchase)} /></td></tr>)}</tbody></table></div> : <div className="purchase-history">{data.purchases.map((purchase) => <article className="purchase-history-card" key={purchase.id}><div><div><b>{purchase.supplierName}</b><small>{purchase.date} · {purchase.lines.length} item{purchase.lines.length === 1 ? '' : 's'}</small></div><strong>{money(purchase.totalPaise)}</strong></div><ul>{purchase.lines.map((line) => <li key={line.itemId + line.totalPaise}><span>{line.itemName} <small>{line.quantity} {line.unit} × {money(line.unitPricePaise)}</small></span><b>{money(line.totalPaise)}</b></li>)}</ul><footer><span>Paid {money(purchase.paidPaise)}</span><PurchaseStatus purchase={purchase} /></footer><PurchaseActions edit={() => edit(purchase)} remove={() => remove(purchase)} /></article>)}</div>}</section></>;
}
