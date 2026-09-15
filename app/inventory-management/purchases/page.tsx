'use client';
import { PurchaseWorkspace, useInventoryData } from '../browser-app';

export default function PurchasesPage() {
  const { items, suppliers, save, refresh, notice, error } = useInventoryData();
  const rawMaterials = items.filter(i => i.type === 'RAW_MATERIAL');
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <PurchaseWorkspace suppliers={suppliers} items={rawMaterials} save={save} refresh={refresh} />
    </>
  );
}
