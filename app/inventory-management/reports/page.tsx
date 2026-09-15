'use client';
import { ReportsWorkspace, useInventoryData } from '../browser-app';

export default function ReportsPage() {
  const { notice, error } = useInventoryData();
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <ReportsWorkspace />
    </>
  );
}
