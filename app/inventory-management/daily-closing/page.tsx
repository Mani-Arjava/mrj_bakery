'use client';
import { DailyClosingWorkspace, useInventoryData } from '../browser-app';

export default function DailyClosingPage() {
  const { save, refresh, notice, error } = useInventoryData();
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <DailyClosingWorkspace save={save} refresh={refresh} />
    </>
  );
}
