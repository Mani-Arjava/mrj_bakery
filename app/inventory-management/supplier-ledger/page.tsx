'use client';
import { SupplierLedgerWorkspace, useInventoryData } from '../browser-app';

export default function SupplierLedgerPage() {
  const { suppliers, save, refresh, notice, error } = useInventoryData();
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <SupplierLedgerWorkspace suppliers={suppliers} save={save} refresh={refresh} />
    </>
  );
}
