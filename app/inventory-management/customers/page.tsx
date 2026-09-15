'use client';
import { CustomerWorkspace, useInventoryData } from '../browser-app';

export default function CustomersPage() {
  const { items, customers, save, refresh, notice, error } = useInventoryData();
  const finishedProducts = items.filter(i => i.type === 'FINISHED_GOOD');
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <CustomerWorkspace customers={customers} items={finishedProducts} save={save} refresh={refresh} />
    </>
  );
}
