'use client';

import { FormEvent, useEffect, useState } from 'react';
import * as storage from '@/lib/inventory/storage';
import './simple.css';

const UNITS = ['Kg', 'Gram', 'Liter', 'Piece', 'Packet', 'Box', 'Bag', 'Bottle'];
const today = () => new Date().toISOString().slice(0, 10);
const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

export function useSimpleInventory() {
  const [data, setData] = useState<storage.InventoryData>({ suppliers: [], items: [], purchases: [] });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = () => setData(storage.getData());
  useEffect(() => { storage.initStorage(); refresh(); }, []);

  function run(action: () => void) {
    try { setError(''); action(); refresh(); setNotice('Saved successfully'); window.setTimeout(() => setNotice(''), 2500); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to save'); }
  }

  return { data, run, refresh, notice, error };
}

function Status({ summary }: { summary: ReturnType<typeof storage.getSupplierSummary> }) {
  if (summary.advancePaise > 0) return <span className="im-status credit">{money(summary.advancePaise)} advance</span>;
  if (summary.pendingPaise > 0) return <span className="im-status due">{money(summary.pendingPaise)} pending</span>;
  return <span className="im-status settled">Settled</span>;
}

function Feedback({ notice, error }: { notice: string; error: string }) {
  return <>{notice && <div className="im-notice">{notice}</div>}{error && <div className="im-error im-banner">{error}</div>}</>;
}

export function SuppliersWorkspace() {
  const { data, run, notice, error } = useSimpleInventory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', contactPerson: '', phone: '' });
  const selected = data.suppliers.find((supplier) => supplier.id === selectedId);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    run(() => storage.addSupplier({ ...form, name: form.name.trim() }));
    setForm({ name: '', address: '', contactPerson: '', phone: '' });
    setShowForm(false);
  }

  if (selected) {
    const summary = storage.getSupplierSummary(selected.id);
    return <>
      <Feedback notice={notice} error={error} />
      <div className="im-section-actions"><button className="im-secondary" onClick={() => setSelectedId(null)}>← All suppliers</button><button className="im-primary" onClick={() => setShowForm(true)}>+ Add supplier</button></div>
      <section className="im-detail-hero"><div className="im-avatar large">{selected.name.slice(0, 1).toUpperCase()}</div><div><p className="im-kicker">SUPPLIER</p><h2>{selected.name}</h2><p>{[selected.contactPerson, selected.phone, selected.address].filter(Boolean).join(' · ') || 'No contact details added'}</p></div></section>
      <div className="im-summary-grid">
        <article><span>Total purchase</span><strong>{money(summary.totalPurchasePaise)}</strong></article>
        <article><span>Paid / settled</span><strong>{money(summary.totalPaidPaise)}</strong></article>
        <article className={summary.pendingPaise ? 'warning' : ''}><span>Pending</span><strong>{summary.pendingPaise ? money(summary.pendingPaise) : '₹0'}</strong></article>
        <article className={summary.advancePaise ? 'positive' : ''}><span>Advance / credit</span><strong>{summary.advancePaise ? money(summary.advancePaise) : '₹0'}</strong></article>
      </div>
      <section className="im-panel im-history-panel"><div className="im-panel-title"><h2>Purchase & payment history</h2><span>{summary.purchases.length} records</span></div>{summary.purchases.length === 0 ? <div className="im-empty"><b>No purchases yet</b><p>Purchases recorded for this supplier will appear here.</p></div> : <div className="im-table-scroll"><table><thead><tr><th>Date</th><th>Items</th><th>Purchase</th><th>Paid</th><th>Status</th></tr></thead><tbody>{summary.purchases.map((purchase) => <tr key={purchase.id}><td>{purchase.date}</td><td>{purchase.lines.length}</td><td>{money(purchase.totalPaise)}</td><td>{money(purchase.paidPaise)}</td><td><Status summary={{ purchases: [purchase], totalPurchasePaise: purchase.totalPaise, totalPaidPaise: purchase.paidPaise, pendingPaise: Math.max(purchase.totalPaise - purchase.paidPaise, 0), advancePaise: Math.max(purchase.paidPaise - purchase.totalPaise, 0) }} /></td></tr>)}</tbody></table></div>}</section>
      {showForm && <SupplierForm form={form} setForm={setForm} submit={submit} close={() => setShowForm(false)} />}
    </>;
  }

  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">SUPPLIERS</p><h2 className="im-page-title">Shops you buy from</h2></div><button className="im-primary" onClick={() => setShowForm(true)}>+ Add supplier</button></div>{data.suppliers.length === 0 ? <Empty title="No suppliers yet" text="Add your first shop or vendor to start recording purchases." action="Add supplier" onAction={() => setShowForm(true)} /> : <div className="im-party-grid">{data.suppliers.map((supplier) => { const summary = storage.getSupplierSummary(supplier.id); return <button className="im-party-card supplier-card" key={supplier.id} onClick={() => setSelectedId(supplier.id)}><span className="im-avatar">{supplier.name.slice(0, 1).toUpperCase()}</span><strong>{supplier.name}</strong>{supplier.contactPerson && <small>{supplier.contactPerson}</small>}{supplier.phone && <small>{supplier.phone}</small>}<div className="supplier-card-balance"><span>Purchase {money(summary.totalPurchasePaise)}</span><Status summary={summary} /></div></button>; })}</div>}{showForm && <SupplierForm form={form} setForm={setForm} submit={submit} close={() => setShowForm(false)} />}</>;
}

function SupplierForm({ form, setForm, submit, close }: { form: { name: string; address: string; contactPerson: string; phone: string }; setForm: (value: { name: string; address: string; contactPerson: string; phone: string }) => void; submit: (event: FormEvent) => void; close: () => void }) {
  return <div className="im-modal-backdrop"><div className="im-modal"><button className="im-modal-close" onClick={close}>×</button><h2>Add supplier</h2><form className="im-modal-form" onSubmit={submit}><label>Shop / supplier name<input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shop A" /></label><label>Contact person<input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></label><label>Contact number<input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Address<textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><button className="im-primary" type="submit">Create supplier</button></form></div></div>;
}

export function ItemsWorkspace() {
  const { data, run, notice, error } = useSimpleInventory();
  const [form, setForm] = useState({ name: '', unit: 'Kg' });
  function submit(event: FormEvent) { event.preventDefault(); if (!form.name.trim()) return; run(() => storage.addItem({ name: form.name.trim(), unit: form.unit })); setForm({ name: '', unit: 'Kg' }); }
  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">ITEMS</p><h2 className="im-page-title">Your regular purchases</h2></div></div><div className="im-two-column"><section className="im-panel"><div className="im-panel-title"><h2>Stock items</h2><span>{data.items.length} items</span></div>{data.items.length === 0 ? <Empty title="No items yet" text="Create an item to make it available in Purchases." /> : <div className="im-table-scroll"><table><thead><tr><th>Item</th><th>Unit</th><th>Current stock</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td>{item.unit}</td><td className="stock-value">{item.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {item.unit}</td></tr>)}</tbody></table></div>}</section><section className="im-panel"><p className="im-kicker">NEW ITEM</p><h2>Add an item</h2><form onSubmit={submit}><label>Item name<input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Maida" /></label><label>Unit of measurement<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label><p className="im-muted">New items start with 0 stock. Purchases will increase the quantity automatically.</p><button className="im-primary" type="submit">Add item</button></form></section></div></>;
}

export function PurchasesWorkspace() {
  const { data, run, refresh, notice, error } = useSimpleInventory();
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(today());
  const [paid, setPaid] = useState('');
  const [lines, setLines] = useState([{ itemId: '', quantity: '', unit: 'Kg', rate: '' }]);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: 'Kg' });
  const totalPaise = lines.reduce((sum, line) => sum + Math.round(Number(line.quantity || 0) * Number(line.rate || 0) * 100), 0);
  const paidPaise = Math.round(Number(paid || 0) * 100);
  const balancePaise = totalPaise - paidPaise;
  const selectedSupplier = data.suppliers.find((supplier) => supplier.id === supplierId);
  const history = data.purchases;

  function updateLine(index: number, updates: Partial<typeof lines[number]>) { setLines(lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...updates } : line)); }
  function addInlineItem() { if (!newItem.name.trim()) return; const item = storage.addItem({ name: newItem.name.trim(), unit: newItem.unit }); refresh(); setNewItem({ name: '', unit: 'Kg' }); setShowNewItem(false); setLines([{ ...lines[0], itemId: item.id, unit: item.unit }, ...lines.slice(1)]); }
  function submit(event: FormEvent) {
    event.preventDefault();
    const valid = lines.filter((line) => line.itemId && Number(line.quantity) > 0 && Number(line.rate) >= 0);
    if (!supplierId || !valid.length || totalPaise <= 0) return;
    run(() => storage.postPurchase({ date, supplierId, lines: valid.map((line) => { const item = data.items.find((candidate) => candidate.id === line.itemId)!; const lineTotal = Math.round(Number(line.quantity) * Number(line.rate) * 100); return { itemId: item.id, itemName: item.name, quantity: Number(line.quantity), unit: line.unit, unitPricePaise: Math.round(Number(line.rate) * 100), totalPaise: lineTotal }; }), totalPaise, paidPaise }));
    setSupplierId(''); setDate(today()); setPaid(''); setLines([{ itemId: '', quantity: '', unit: 'Kg', rate: '' }]);
  }

  return <><Feedback notice={notice} error={error} /><div className="im-section-actions"><div><p className="im-kicker">PURCHASES</p><h2 className="im-page-title">Record a purchase</h2></div></div><div className="im-purchase-layout"><section className="im-panel purchase-editor"><form onSubmit={submit}><div className="im-purchase-header"><div><h2>New purchase</h2><p className="im-muted">Add stock and settle the supplier in one quick entry.</p></div><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></div><div className="im-two"><label>Supplier<select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Select supplier…</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>{data.suppliers.length === 0 && <small className="im-field-hint">Add a supplier first from the Suppliers screen.</small>}</label><div className="purchase-balance-note">{selectedSupplier ? <><span>Current balance</span><strong>{(() => { const summary = storage.getSupplierSummary(selectedSupplier.id); return summary.pendingPaise ? `${money(summary.pendingPaise)} pending` : summary.advancePaise ? `${money(summary.advancePaise)} credit` : 'Settled'; })()}</strong></> : <><span>Purchase total</span><strong>{money(totalPaise)}</strong></>}</div></div><div className="im-purchase-lines"><div className="im-line-head"><span>Item</span><span>Qty</span><span>Unit</span><span>Rate (₹)</span><span>Total</span><span /></div>{lines.map((line, index) => <div className="im-purchase-line" key={index}><select required value={line.itemId} onChange={(e) => { const item = data.items.find((candidate) => candidate.id === e.target.value); updateLine(index, { itemId: e.target.value, unit: item?.unit || line.unit }); }}><option value="">Select item…</option>{data.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} placeholder="0" /><select value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select><input required type="number" min="0" step="0.01" value={line.rate} onChange={(e) => updateLine(index, { rate: e.target.value })} placeholder="0" /><b>{money(Math.round(Number(line.quantity || 0) * Number(line.rate || 0) * 100))}</b>{lines.length > 1 && <button type="button" className="im-remove" onClick={() => setLines(lines.filter((_, lineIndex) => lineIndex !== index))}>×</button>}</div>)}</div><div className="purchase-actions"><button type="button" className="im-text-button" onClick={() => setLines([...lines, { itemId: '', quantity: '', unit: 'Kg', rate: '' }])}>+ Add item</button><button type="button" className="im-text-button" onClick={() => setShowNewItem(!showNewItem)}>+ New item</button></div>{showNewItem && <div className="inline-item-form"><label>Item name<input required autoFocus value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Sugar" /></label><label>Unit<select value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label><button className="im-primary" type="button" onClick={addInlineItem}>Add to purchase</button></div>}<div className="purchase-total-row"><label>Amount paid (₹)<input type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" /></label><div><span>Purchase amount</span><strong>{money(totalPaise)}</strong></div><div className={balancePaise < 0 ? 'credit' : balancePaise > 0 ? 'due' : 'settled'}><span>{balancePaise < 0 ? 'Advance / credit' : balancePaise > 0 ? 'Pending' : 'Settlement'}</span><strong>{money(Math.abs(balancePaise))}</strong></div><button className="im-primary" type="submit">Save purchase</button></div></form></section><section className="im-panel"><div className="im-panel-title"><h2>Recent purchases</h2><span>{history.length} total</span></div>{history.length === 0 ? <Empty title="No purchases yet" text="Your saved purchases will appear here." /> : <div className="purchase-history">{history.map((purchase) => { const diff = purchase.totalPaise - purchase.paidPaise; return <article className="purchase-history-card" key={purchase.id}><div><div><b>{purchase.supplierName}</b><small>{purchase.date} · {purchase.lines.length} item{purchase.lines.length === 1 ? '' : 's'}</small></div><strong>{money(purchase.totalPaise)}</strong></div><ul>{purchase.lines.map((line) => <li key={line.itemId + line.totalPaise}><span>{line.itemName} <small>{line.quantity} {line.unit} × {money(line.unitPricePaise)}</small></span><b>{money(line.totalPaise)}</b></li>)}</ul><footer><span>Paid {money(purchase.paidPaise)}</span><span className={diff < 0 ? 'credit' : diff > 0 ? 'due' : 'settled'}>{diff < 0 ? `${money(Math.abs(diff))} credit` : diff > 0 ? `${money(diff)} pending` : 'Settled'}</span></footer></article>; })}</div>}</section></div></>;
}

function Empty({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="im-empty"><b>{title}</b><p>{text}</p>{action && onAction && <button className="im-secondary" onClick={onAction}>{action}</button>}</div>;
}
