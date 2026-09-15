'use client';
import { ProductsWorkspace, useInventoryData } from '../browser-app';

export default function ProductsPage() {
  const { items, save, refresh, notice, error } = useInventoryData();
  const finishedProducts = items.filter(i => i.type === 'FINISHED_GOOD');
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <ProductsWorkspace products={finishedProducts} save={save} refresh={refresh} />
    </>
  );
}
