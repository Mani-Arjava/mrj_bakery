'use client';
import { CustomerLedgerWorkspace, useInventoryData } from '../browser-app';

export default function CustomerLedgerPage() {
  const { customers, save, refresh, notice, error } = useInventoryData();
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <CustomerLedgerWorkspace customers={customers} save={save} refresh={refresh} />
    </>
  );
}
