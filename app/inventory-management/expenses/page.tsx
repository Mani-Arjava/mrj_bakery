'use client';
import { ExpenseForm, useInventoryData } from '../browser-app';

export default function ExpensesPage() {
  const { save, refresh, notice, error } = useInventoryData();
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <ExpenseForm save={save} refresh={refresh} />
    </>
  );
}
