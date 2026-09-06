import { redirect } from 'next/navigation';
import { isInventoryAuthenticated } from '@/lib/inventory/auth';
import EnhancedApp from './enhanced-app';
import './inventory.css';

export default async function InventoryPage() {
  if (!await isInventoryAuthenticated()) redirect('/inventory-management/login');
  return <EnhancedApp />;
}
