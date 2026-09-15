'use client';
import { SuppliersWorkspace, useInventoryData } from '../browser-app';

export default function SuppliersPage() {
  const { suppliers, save, refresh, notice, error } = useInventoryData();
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <SuppliersWorkspace suppliers={suppliers} save={save} refresh={refresh} />
    </>
  );
}
