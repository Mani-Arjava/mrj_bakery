'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import * as storage from '@/lib/inventory/storage';
import { useSimpleInventory, Feedback } from './simple-workspaces';
import './simple.css';
import './simple-actions.css';

const today = () => new Date().toISOString().slice(0, 10);
const money = (p: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p / 100);

const CATEGORY_LABELS: Record<storage.ExpenseCategory, string> = {
  salary: 'Salary',
  petrol: 'Petrol',
  courier: 'Courier',
  'cover-packing': 'Cover & Packing',
  tea: 'Tea',
  other: 'Other',
};

const OTHER_CATS: Array<{ value: storage.ExpenseCategory; label: string }> = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'courier', label: 'Courier' },
  { value: 'cover-packing', label: 'Cover & Packing' },
  { value: 'tea', label: 'Tea' },
  { value: 'other', label: 'Other' },
];

type SalaryDraft = { employeeId: string; actualSalary: string; givenSalary: string; note: string };
type OtherDraft = { category: storage.ExpenseCategory; customName: string; amount: string; note: string };

const emptySalary = (): SalaryDraft => ({ employeeId: '', actualSalary: '', givenSalary: '', note: '' });
const emptyOther = (): OtherDraft => ({ category: 'petrol', customName: '', amount: '', note: '' });

function prevDay(d: string) { const x = new Date(d); x.setDate(x.getDate() - 1); return x.toISOString().slice(0, 10); }
function nextDay(d: string) { const x = new Date(d); x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); }
function fmtDate(d: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d + 'T00:00:00'));
}

function salaryDiff(given: string, actual: string): { paise: number; cls: 'advance' | 'partial' | 'settled' } | null {
  const g = Number(given); const a = Number(actual);
  if (!given || !actual || isNaN(g) || isNaN(a)) return null;
  const diff = Math.round((g - a) * 100);
  return { paise: diff, cls: diff > 0 ? 'advance' : diff < 0 ? 'partial' : 'settled' };
}

function StatusBadge({ expense }: { expense: storage.Expense }) {
  if (expense.category === 'salary') {
    const given = expense.amountPaise;
    const actual = expense.actualAmountPaise ?? given;
    if (given > actual) return <span className="im-status credit">Advance</span>;
    if (given < actual) return <span className="im-status due">Partial</span>;
    return <span className="im-status settled">Settled</span>;
  }
  return <span className="im-status settled">Paid</span>;
}

export default function ExpensesWorkspace() {
  const { run, notice, error } = useSimpleInventory();
  const formRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState(today());
  const [expenses, setExpenses] = useState<storage.Expense[]>([]);
  const [employees, setEmployees] = useState<storage.Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'salary' | 'other'>('all');

  const [salaryDrafts, setSalaryDrafts] = useState<SalaryDraft[]>([emptySalary()]);
  const [otherDrafts, setOtherDrafts] = useState<OtherDraft[]>([emptyOther()]);
  const [editingExpense, setEditingExpense] = useState<storage.Expense | null>(null);

  useEffect(() => {
    setExpenses(storage.getExpensesByDate(selectedDate));
    setEmployees(storage.getAllEmployees());
  }, [notice, error, selectedDate]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const salaryTotal = expenses.filter(e => e.category === 'salary').reduce((s, e) => s + e.amountPaise, 0);
  const otherTotal = expenses.filter(e => e.category !== 'salary').reduce((s, e) => s + e.amountPaise, 0);

  const filteredExpenses =
    activeTab === 'salary' ? expenses.filter(e => e.category === 'salary') :
    activeTab === 'other' ? expenses.filter(e => e.category !== 'salary') :
    expenses;

  // ── Salary draft helpers ──────────────────────────────────────────────────
  function updateSalary(idx: number, patch: Partial<SalaryDraft>) {
    setSalaryDrafts(d => d.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }
  function onEmployeeChange(idx: number, empId: string) {
    updateSalary(idx, { employeeId: empId });
  }
  function onActualChange(idx: number, val: string) {
    updateSalary(idx, { actualSalary: val, givenSalary: val });
  }
  function removeSalaryRow(idx: number) {
    setSalaryDrafts(d => d.length === 1 ? [emptySalary()] : d.filter((_, i) => i !== idx));
  }

  // ── Other draft helpers ───────────────────────────────────────────────────
  function updateOther(idx: number, patch: Partial<OtherDraft>) {
    setOtherDrafts(d => d.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }
  function removeOtherRow(idx: number) {
    setOtherDrafts(d => d.length === 1 ? [emptyOther()] : d.filter((_, i) => i !== idx));
  }

  // ── Reset form ────────────────────────────────────────────────────────────
  function resetForm() {
    setSalaryDrafts([emptySalary()]);
    setOtherDrafts([emptyOther()]);
    setEditingExpense(null);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function handleSave(e: FormEvent) {
    e.preventDefault();

    if (editingExpense) {
      // Edit mode — update the single edited expense
      if (editingExpense.category === 'salary') {
        const row = salaryDrafts[0];
        if (!row.employeeId) return;
        const actualPaise = Math.round(Number(row.actualSalary) * 100);
        const givenPaise = Math.round(Number(row.givenSalary) * 100);
        if (givenPaise <= 0) return;
        const emp = employees.find(e => e.id === row.employeeId);
        const ok = run(() => storage.updateExpense(editingExpense.id, {
          date: selectedDate, category: 'salary',
          amountPaise: givenPaise, actualAmountPaise: actualPaise,
          employeeId: row.employeeId, employeeName: emp?.name || '',
          note: row.note.trim() || undefined,
        }));
        if (ok) resetForm();
      } else {
        const row = otherDrafts[0];
        const amountPaise = Math.round(Number(row.amount) * 100);
        if (amountPaise <= 0) return;
        if (row.category === 'other' && !row.customName.trim()) return;
        const ok = run(() => storage.updateExpense(editingExpense.id, {
          date: selectedDate, category: row.category, amountPaise,
          customName: row.category === 'other' ? row.customName.trim() : undefined,
          note: row.note.trim() || undefined,
        }));
        if (ok) resetForm();
      }
      return;
    }

    // Add mode — save all valid rows
    const validSalary = salaryDrafts.filter(r => r.employeeId && Number(r.givenSalary) > 0);
    const validOther = otherDrafts.filter(r => {
      const amt = Number(r.amount);
      if (amt <= 0) return false;
      if (r.category === 'other' && !r.customName.trim()) return false;
      return true;
    });

    if (validSalary.length === 0 && validOther.length === 0) return;

    run(() => {
      validSalary.forEach(row => {
        const emp = employees.find(e => e.id === row.employeeId);
        storage.addExpense({
          date: selectedDate, category: 'salary',
          amountPaise: Math.round(Number(row.givenSalary) * 100),
          actualAmountPaise: Math.round(Number(row.actualSalary) * 100),
          employeeId: row.employeeId, employeeName: emp?.name || '',
          note: row.note.trim() || undefined,
        });
      });
      validOther.forEach(row => {
        storage.addExpense({
          date: selectedDate, category: row.category,
          amountPaise: Math.round(Number(row.amount) * 100),
          customName: row.category === 'other' ? row.customName.trim() : undefined,
          note: row.note.trim() || undefined,
        });
      });
    });
    resetForm();
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  function startEdit(expense: storage.Expense) {
    if (expense.category === 'salary') {
      setSalaryDrafts([{
        employeeId: expense.employeeId || '',
        actualSalary: expense.actualAmountPaise !== undefined ? String(expense.actualAmountPaise / 100) : '',
        givenSalary: String(expense.amountPaise / 100),
        note: expense.note || '',
      }]);
      setOtherDrafts([emptyOther()]);
    } else {
      setOtherDrafts([{
        category: expense.category,
        customName: expense.customName || '',
        amount: String(expense.amountPaise / 100),
        note: expense.note || '',
      }]);
      setSalaryDrafts([emptySalary()]);
    }
    setEditingExpense(expense);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleDelete(expense: storage.Expense) {
    const label = expense.category === 'salary'
      ? `salary expense for ${expense.employeeName}`
      : expense.customName || CATEGORY_LABELS[expense.category];
    if (window.confirm(`Delete this ${label} expense?`)) {
      run(() => storage.deleteExpense(expense.id));
    }
  }

  const isEditMode = editingExpense !== null;
  const isSalaryEdit = isEditMode && editingExpense!.category === 'salary';
  const isOtherEdit = isEditMode && editingExpense!.category !== 'salary';

  return (
    <>
      <Feedback notice={notice} error={error} />

      {/* ── Header ── */}
      <div className="im-section-actions" style={{ flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p className="im-kicker">EXPENSES</p>
          <h2 className="im-page-title">Expense tracker</h2>
        </div>
        <div className="date-nav">
          <button className="date-nav-btn" onClick={() => setSelectedDate(prevDay(selectedDate))}>←</button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          <button
            className="date-nav-btn"
            onClick={() => setSelectedDate(nextDay(selectedDate))}
            disabled={selectedDate >= today()}
          >→</button>
          <button className="date-nav-btn today-btn" onClick={() => setSelectedDate(today())}>Today</button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="im-summary-grid expense-stats" style={{ marginBottom: '20px' }}>
        <article className={salaryTotal + otherTotal > 0 ? 'warning' : ''}>
          <span>Total Expenses</span>
          <strong>{money(salaryTotal + otherTotal)}</strong>
        </article>
        <article className={salaryTotal > 0 ? 'warning' : ''}>
          <span>Salary</span>
          <strong>{money(salaryTotal)}</strong>
        </article>
        <article className={otherTotal > 0 ? 'warning' : ''}>
          <span>Other</span>
          <strong>{money(otherTotal)}</strong>
        </article>
        <article>
          <span>Entries</span>
          <strong>{expenses.length}</strong>
        </article>
      </div>

      {/* ── Form ── */}
      <div ref={formRef} style={{ marginBottom: '24px' }}>
        {isEditMode && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Editing expense</h3>
            <button className="im-secondary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={resetForm}>
              ✕ Cancel edit
            </button>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* ── Salary section ── */}
          {(!isOtherEdit) && (
            <div className="exp-section">
              <div className="exp-section-head exp-head-salary">
                <div className="exp-section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Salary Payments
                </div>
                {!isEditMode && (
                  <button type="button" className="exp-add-btn" onClick={() => setSalaryDrafts(d => [...d, emptySalary()])}>
                    + Add Salary Payment
                  </button>
                )}
              </div>
              <div className="exp-section-body">
                {salaryDrafts.map((row, idx) => {
                  const diff = salaryDiff(row.givenSalary, row.actualSalary);
                  return (
                    <div key={idx}>
                      <div className="exp-salary-row">
                        <div className="exp-field">
                          <label>Employee *</label>
                          <select value={row.employeeId} onChange={e => onEmployeeChange(idx, e.target.value)}>
                            <option value="">Select employee...</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="exp-field">
                          <label>Actual (₹)</label>
                          <input type="number" min="0" step="0.01" placeholder="0.00"
                            value={row.actualSalary} onChange={e => onActualChange(idx, e.target.value)} />
                        </div>
                        <div className="exp-field">
                          <label>Given (₹)</label>
                          <input type="number" min="0" step="0.01" placeholder="0.00"
                            value={row.givenSalary} onChange={e => updateSalary(idx, { givenSalary: e.target.value })} />
                        </div>
                        <div className="exp-field">
                          <label>Note</label>
                          <input placeholder="Add a note (optional)" value={row.note}
                            onChange={e => updateSalary(idx, { note: e.target.value })} />
                        </div>
                        <button type="button" className="exp-delete-btn" title="Remove" onClick={() => removeSalaryRow(idx)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                      {diff && row.employeeId && (
                        <div className={`exp-diff-hint ${diff.cls}`}>
                          {diff.paise > 0
                            ? `${money(diff.paise)} extra → advance added to employee balance`
                            : diff.paise < 0
                              ? `${money(-diff.paise)} less than owed → added to salary due`
                              : 'Fully settled — no advance or due change'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Other expenses section ── */}
          {(!isSalaryEdit) && (
            <div className="exp-section">
              <div className="exp-section-head exp-head-other">
                <div className="exp-section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                  Other Expenses
                </div>
                {!isEditMode && (
                  <button type="button" className="exp-add-btn" onClick={() => setOtherDrafts(d => [...d, emptyOther()])}>
                    + Add Other Expense
                  </button>
                )}
              </div>
              <div className="exp-section-body">
                {otherDrafts.map((row, idx) => (
                  <div key={idx}>
                    <div className="exp-other-row">
                      <div className="exp-field">
                        <label>Category *</label>
                        <select value={row.category}
                          onChange={e => updateOther(idx, { category: e.target.value as storage.ExpenseCategory, customName: '' })}>
                          {OTHER_CATS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="exp-field">
                        <label>Amount (₹)</label>
                        <input type="number" min="0.01" step="0.01" placeholder="0.00"
                          value={row.amount} onChange={e => updateOther(idx, { amount: e.target.value })} />
                      </div>
                      <div className="exp-field">
                        <label>Note</label>
                        <input placeholder="Add a note (optional)" value={row.note}
                          onChange={e => updateOther(idx, { note: e.target.value })} />
                      </div>
                      <button type="button" className="exp-delete-btn" title="Remove" onClick={() => removeOtherRow(idx)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                    {row.category === 'other' && (
                      <div className="exp-custom-name-row">
                        <input required placeholder="Expense name (required)"
                          value={row.customName} onChange={e => updateOther(idx, { customName: e.target.value })} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save row */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="im-primary">
              {isEditMode ? 'Update expense' : 'Save Expenses'}
            </button>
            {isEditMode && (
              <button type="button" className="im-secondary" onClick={resetForm}>✕ Cancel</button>
            )}
          </div>
        </form>
      </div>

      {/* ── History panel ── */}
      <section className="im-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <h3 style={{ margin: 0 }}>Saved for {fmtDate(selectedDate)}</h3>
          <div className="expense-tabs">
            <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
              All ({expenses.length})
            </button>
            <button className={activeTab === 'salary' ? 'active' : ''} onClick={() => setActiveTab('salary')}>
              Salary ({expenses.filter(e => e.category === 'salary').length})
            </button>
            <button className={activeTab === 'other' ? 'active' : ''} onClick={() => setActiveTab('other')}>
              Other ({expenses.filter(e => e.category !== 'salary').length})
            </button>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="im-empty">
            <b>No expenses recorded for {fmtDate(selectedDate)}</b>
            <p>Use the form above to add salary payments or other expenses.</p>
          </div>
        ) : (
          <div className="expense-hist-list">
            {filteredExpenses.map(expense => {
              const name = expense.category === 'salary'
                ? expense.employeeName || 'Employee'
                : expense.category === 'other' && expense.customName
                  ? expense.customName
                  : CATEGORY_LABELS[expense.category];

              const meta = expense.category === 'salary'
                ? `Salary · Actual ${money(expense.actualAmountPaise ?? expense.amountPaise)}`
                : CATEGORY_LABELS[expense.category];

              return (
                <div className="expense-hist-card" key={expense.id}>
                  <div className="expense-hist-card-left">
                    <div className="expense-hist-card-name">{name}</div>
                    <div className="expense-hist-card-meta">
                      {meta}{expense.note && ` · ${expense.note}`}
                    </div>
                  </div>
                  <div className="expense-hist-card-right">
                    <div className="expense-hist-card-amount">{money(expense.amountPaise)}</div>
                    <StatusBadge expense={expense} />
                    <div className="row-actions">
                      <button className="action-edit" onClick={() => startEdit(expense)}>Edit</button>
                      <button className="action-delete" onClick={() => handleDelete(expense)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
