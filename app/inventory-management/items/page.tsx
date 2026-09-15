'use client';
import { ItemsWorkspace, useInventoryData } from '../browser-app';

export default function ItemsPage() {
  const { items, save, refresh, notice, error } = useInventoryData();
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <ItemsWorkspace items={items} save={save} refresh={refresh} />
    </>
  );
}
