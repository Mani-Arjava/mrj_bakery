'use client';
import { RecipesWorkspace, useInventoryData } from '../browser-app';

export default function RecipesPage() {
  const { items, save, refresh, notice, error } = useInventoryData();
  const finishedProducts = items.filter(i => i.type === 'FINISHED_GOOD');
  const rawMaterials = items.filter(i => i.type === 'RAW_MATERIAL');
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <RecipesWorkspace products={finishedProducts} materials={rawMaterials} save={save} refresh={refresh} />
    </>
  );
}
