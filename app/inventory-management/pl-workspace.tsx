'use client';

import { useEffect, useState } from 'react';
import * as storage from '@/lib/inventory/storage';
import { Feedback, useSimpleInventory } from './simple-workspaces';
import './simple.css';
import './simple-actions.css';

const today = () => new Date().toISOString().slice(0, 10);
const money = (p: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p / 100);
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

function prevDay(d: string) { const x = new Date(d); x.setDate(x.getDate() - 1); return x.toISOString().slice(0, 10); }
function nextDay(d: string) { const x = new Date(d); x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); }
function fmtDate(d: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d + 'T00:00:00'));
}

const CATEGORY_LABEL: Record<string, string> = {
  petrol: 'Petrol', courier: 'Courier', 'cover-packing': 'Cover & Packing', tea: 'Tea', other: 'Other',
};

export default function PLWorkspace() {
  const { notice, error } = useSimpleInventory();
  const [selectedDate, setSelectedDate] = useState(today());
  const [summary, setSummary] = useState<storage.PLDaySummary | null>(null);
  const [history, setHistory] = useState<storage.PLDaySummary[]>([]);

  useEffect(() => {
    setSummary(storage.getPLSummary(selectedDate));
  }, [selectedDate, notice, error]);

  useEffect(() => {
    const dates = storage.getPLDates();
    setHistory(dates.map(d => storage.getPLSummary(d)));
  }, [notice, error]);

  const s = summary;
  const isProfit = (s?.profitPaise ?? 0) >= 0;
  const hasData = s && (s.productionLines.length > 0 || s.materialLines.length > 0 || s.salaryExpenses.length > 0 || s.otherExpenses.length > 0);

  return (
    <>
      <Feedback notice={notice} error={error} />

      {/* ── Header ── */}
      <div className="im-section-actions" style={{ flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="im-kicker">PROFIT &amp; LOSS</p>
          <h2 className="im-page-title">Daily Statement</h2>
        </div>
        <div className="date-nav">
          <button className="date-nav-btn" onClick={() => setSelectedDate(prevDay(selectedDate))}>←</button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          <button className="date-nav-btn" onClick={() => setSelectedDate(nextDay(selectedDate))} disabled={selectedDate >= today()}>→</button>
          <button className="date-nav-btn today-btn" onClick={() => setSelectedDate(today())}>Today</button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="im-summary-grid" style={{ marginBottom: '20px' }}>
        <article className={s && s.totalProductionValuePaise > 0 ? 'positive' : ''}>
          <span>Production Value</span>
          <strong>{money(s?.totalProductionValuePaise ?? 0)}</strong>
        </article>
        <article className={s && s.totalCostPaise > 0 ? 'warning' : ''}>
          <span>Total Cost</span>
          <strong>{money(s?.totalCostPaise ?? 0)}</strong>
        </article>
        <article className={s ? (isProfit ? 'positive' : 'warning') : ''}>
          <span>Profit / Loss</span>
          <strong style={{ color: s ? (isProfit ? '#18804b' : '#a43932') : undefined }}>
            {money(s?.profitPaise ?? 0)}
          </strong>
        </article>
        <article className={s ? (isProfit ? 'positive' : 'warning') : ''}>
          <span>Margin</span>
          <strong style={{ color: s ? (isProfit ? '#18804b' : '#a43932') : undefined }}>
            {s && s.totalProductionValuePaise > 0 ? pct(s.profitPercent) : '—'}
          </strong>
        </article>
      </div>

      {!hasData && (
        <div className="im-panel">
          <div className="im-empty">
            <b>No data for {fmtDate(selectedDate)}</b>
            <p>Record production and expenses for this date to see the P&amp;L breakdown.</p>
          </div>
        </div>
      )}

      {/* ── Production ── */}
      {s && (s.productionLines.length > 0 || hasData) && (
        <div className="im-panel" style={{ marginBottom: '16px' }}>
          <div className="im-panel-title">
            <h2>Production</h2>
            {s.productionLines.length > 0 && <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{s.productionLines.length} items</span>}
          </div>
          {s.productionLines.length === 0 ? (
            <div className="im-empty" style={{ padding: '20px 0' }}>
              <b>No production recorded</b>
              <p>Record production batches to include in P&amp;L.</p>
            </div>
          ) : (
            <div className="im-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Pieces</th>
                    <th style={{ textAlign: 'right' }}>Packets</th>
                    <th style={{ textAlign: 'right' }}>Value (Retail)</th>
                  </tr>
                </thead>
                <tbody>
                  {s.productionLines.map(line => (
                    <tr key={line.productionItemId}>
                      <td>{line.productionItemName}</td>
                      <td style={{ textAlign: 'right' }}>{line.quantityInUnit} {line.unit}</td>
                      <td style={{ textAlign: 'right' }}>{Math.round(line.piecesProduced)}</td>
                      <td style={{ textAlign: 'right' }}>{line.packets % 1 === 0 ? line.packets : line.packets.toFixed(1)}</td>
                      <td style={{ textAlign: 'right' }}><strong>{money(line.retailValuePaise)}</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--line)' }}>
                    <td colSpan={4} style={{ fontWeight: 700 }}>Total Production Value</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#18804b' }}>{money(s.totalProductionValuePaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Raw Material Cost ── */}
      {s && hasData && (
        <div className="im-panel" style={{ marginBottom: '16px' }}>
          <div className="im-panel-title">
            <h2>Raw Material Cost</h2>
            {s.materialLines.length > 0 && <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{s.materialLines.length} items</span>}
          </div>
          {s.materialLines.length === 0 ? (
            <div className="im-empty" style={{ padding: '20px 0' }}>
              <b>No raw materials recorded</b>
              <p>Raw materials used in production batches will appear here.</p>
            </div>
          ) : (
            <div className="im-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'right' }}>Qty Used</th>
                    <th style={{ textAlign: 'right' }}>Unit</th>
                    <th style={{ textAlign: 'right' }}>Rate</th>
                    <th style={{ textAlign: 'right' }}>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {s.materialLines.map(line => (
                    <tr key={line.itemId}>
                      <td>{line.itemName}</td>
                      <td style={{ textAlign: 'right' }}>{line.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{line.unit}</td>
                      <td style={{ textAlign: 'right' }}>
                        {line.unitRatePaise > 0
                          ? money(line.unitRatePaise)
                          : <span style={{ color: '#b45309', fontSize: '11px' }}>No rate — add purchase</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{money(line.totalCostPaise)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--line)' }}>
                    <td colSpan={4} style={{ fontWeight: 700 }}>Total Material Cost</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#b45309' }}>{money(s.totalMaterialCostPaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Salary Expenses ── */}
      {s && hasData && (
        <div className="im-panel" style={{ marginBottom: '16px' }}>
          <div className="im-panel-title">
            <h2>Salary Expenses</h2>
            {s.salaryExpenses.length > 0 && <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{s.salaryExpenses.length} entries</span>}
          </div>
          {s.salaryExpenses.length === 0 ? (
            <div className="im-empty" style={{ padding: '20px 0' }}>
              <b>No salary expenses</b>
              <p>Salary payments recorded for this date will appear here.</p>
            </div>
          ) : (
            <div className="im-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th style={{ textAlign: 'right' }}>Actual Salary</th>
                    <th style={{ textAlign: 'right' }}>Given</th>
                    <th style={{ textAlign: 'right' }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {s.salaryExpenses.map(exp => (
                    <tr key={exp.id}>
                      <td>{exp.employeeName ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{exp.actualAmountPaise != null ? money(exp.actualAmountPaise) : '—'}</td>
                      <td style={{ textAlign: 'right' }}>{money(exp.amountPaise)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--muted)', fontSize: '12px' }}>{exp.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--line)' }}>
                    <td colSpan={3} style={{ fontWeight: 700 }}>Total Salary</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#b45309' }}>{money(s.totalSalaryCostPaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Other Expenses ── */}
      {s && hasData && (
        <div className="im-panel" style={{ marginBottom: '16px' }}>
          <div className="im-panel-title">
            <h2>Other Expenses</h2>
            {s.otherExpenses.length > 0 && <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{s.otherExpenses.length} entries</span>}
          </div>
          {s.otherExpenses.length === 0 ? (
            <div className="im-empty" style={{ padding: '20px 0' }}>
              <b>No other expenses</b>
              <p>Petrol, courier, packing and other expenses will appear here.</p>
            </div>
          ) : (
            <div className="im-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {s.otherExpenses.map(exp => (
                    <tr key={exp.id}>
                      <td>{CATEGORY_LABEL[exp.category] ?? exp.category}</td>
                      <td style={{ color: 'var(--muted)', fontSize: '12px' }}>{exp.customName || exp.note || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{money(exp.amountPaise)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--line)' }}>
                    <td colSpan={2} style={{ fontWeight: 700 }}>Total Other Expenses</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#b45309' }}>{money(s.totalOtherCostPaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Cost Summary ── */}
      {s && hasData && (
        <div className="im-panel" style={{ marginBottom: '24px', background: '#f7f4f0' }}>
          <table>
            <tbody>
              <tr>
                <td style={{ color: 'var(--muted)', fontWeight: 400 }}>Raw Material Cost</td>
                <td style={{ textAlign: 'right' }}>{money(s.totalMaterialCostPaise)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted)', fontWeight: 400 }}>Salary Expenses</td>
                <td style={{ textAlign: 'right' }}>{money(s.totalSalaryCostPaise)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted)', fontWeight: 400 }}>Other Expenses</td>
                <td style={{ textAlign: 'right' }}>{money(s.totalOtherCostPaise)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid var(--line)' }}>
                <td style={{ fontWeight: 700 }}>Total Cost</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(s.totalCostPaise)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>Production Value</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(s.totalProductionValuePaise)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid var(--line)' }}>
                <td style={{ fontWeight: 700, fontSize: '15px' }}>
                  {isProfit ? '✦ Profit' : '▼ Loss'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '15px', color: isProfit ? '#18804b' : '#a43932' }}>
                  {money(s.profitPaise)}
                  {s.totalProductionValuePaise > 0 && (
                    <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.75 }}>({pct(s.profitPercent)})</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── P&L History ── */}
      <div className="im-panel">
        <div className="im-panel-title">
          <h2>P&amp;L History</h2>
          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{history.length} dates</span>
        </div>
        {history.length === 0 ? (
          <div className="im-empty">
            <b>No history yet</b>
            <p>P&amp;L data will appear here once production or expenses are recorded.</p>
          </div>
        ) : (
          <div className="im-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Production</th>
                  <th style={{ textAlign: 'right' }}>Material</th>
                  <th style={{ textAlign: 'right' }}>Salary</th>
                  <th style={{ textAlign: 'right' }}>Other</th>
                  <th style={{ textAlign: 'right' }}>Total Cost</th>
                  <th style={{ textAlign: 'right' }}>Profit / Loss</th>
                  <th style={{ textAlign: 'right' }}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => {
                  const profit = row.profitPaise;
                  const isP = profit >= 0;
                  const isSelected = row.date === selectedDate;
                  return (
                    <tr
                      key={row.date}
                      style={{ background: isSelected ? '#f0f7ee' : undefined, cursor: 'pointer' }}
                      onClick={() => setSelectedDate(row.date)}
                    >
                      <td>
                        <span style={{ fontWeight: isSelected ? 700 : 600 }}>{row.date}</span>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>{fmtDate(row.date)}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{money(row.totalProductionValuePaise)}</td>
                      <td style={{ textAlign: 'right' }}>{money(row.totalMaterialCostPaise)}</td>
                      <td style={{ textAlign: 'right' }}>{money(row.totalSalaryCostPaise)}</td>
                      <td style={{ textAlign: 'right' }}>{money(row.totalOtherCostPaise)}</td>
                      <td style={{ textAlign: 'right' }}>{money(row.totalCostPaise)}</td>
                      <td style={{ textAlign: 'right', color: isP ? '#18804b' : '#a43932', fontWeight: 700 }}>{money(profit)}</td>
                      <td style={{ textAlign: 'right', color: isP ? '#18804b' : '#a43932' }}>
                        {row.totalProductionValuePaise > 0 ? pct(row.profitPercent) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
