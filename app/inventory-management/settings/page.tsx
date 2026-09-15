'use client';
import { SettingsWorkspace, useInventoryData } from '../browser-app';

export default function SettingsPage() {
  const { notice, error } = useInventoryData();
  return (
    <>
      {notice && <div className="im-notice">{notice}</div>}
      {error && <div className="im-error im-banner">{error}</div>}
      <SettingsWorkspace onLogout={() => { localStorage.removeItem('bakery_auth'); window.location.reload(); }} />
    </>
  );
}
