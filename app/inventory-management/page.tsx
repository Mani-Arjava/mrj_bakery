'use client';
import { Dashboard, useInventoryData } from './browser-app';

export default function DashboardPage() {
  const { dashboard, items, suppliers, customers, notice, error } = useInventoryData();
  const hasData = suppliers.length > 0 || customers.length > 0 || items.length > 0;
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <Dashboard data={dashboard} onNavigate={() => {}} hasData={hasData} />
    </>
  );
}
