// The initial inventory product intentionally uses a small, versioned browser store.
// It does not read the previous ERP data set.
const STORAGE_KEY = 'bakery_inventory_v1';

export type Supplier = { id: string; name: string; address: string; contactPerson: string; phone: string };
export type InventoryItem = { id: string; name: string; unit: string; quantity: number };
export type PurchaseLine = { itemId: string; itemName: string; quantity: number; unit: string; unitPricePaise: number; totalPaise: number };
export type Purchase = { id: string; date: string; supplierId: string; supplierName: string; lines: PurchaseLine[]; totalPaise: number; paidPaise: number };
export type InventoryData = { suppliers: Supplier[]; items: InventoryItem[]; purchases: Purchase[] };

const emptyData = (): InventoryData => ({ suppliers: [], items: [], purchases: [] });
function id() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }

export function initStorage() {
  if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData()));
}

export function getData(): InventoryData {
  if (typeof window === 'undefined') return emptyData();
  initStorage();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '');
    return { suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [], items: Array.isArray(parsed.items) ? parsed.items : [], purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [] };
  } catch { return emptyData(); }
}

function save(data: InventoryData) { if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

export function addSupplier(input: Omit<Supplier, 'id'>) {
  const data = getData();
  const supplier = { id: id(), ...input };
  data.suppliers.push(supplier);
  save(data);
  return supplier;
}

export function addItem(input: Omit<InventoryItem, 'id' | 'quantity'> & { quantity?: number }) {
  const data = getData();
  const item = { id: id(), name: input.name, unit: input.unit, quantity: input.quantity || 0 };
  data.items.push(item);
  save(data);
  return item;
}

export function postPurchase(input: Omit<Purchase, 'id' | 'supplierName'>) {
  const data = getData();
  const supplier = data.suppliers.find((candidate) => candidate.id === input.supplierId);
  if (!supplier) throw new Error('Please select a supplier.');
  const purchase: Purchase = { id: id(), supplierName: supplier.name, ...input };
  data.purchases.push(purchase);
  for (const line of input.lines) {
    const item = data.items.find((candidate) => candidate.id === line.itemId);
    if (item) item.quantity += line.quantity;
  }
  save(data);
  return purchase;
}

export function getSupplierSummary(supplierId: string) {
  const purchases = getData().purchases.filter((purchase) => purchase.supplierId === supplierId);
  const totalPurchasePaise = purchases.reduce((sum, purchase) => sum + purchase.totalPaise, 0);
  const totalPaidPaise = purchases.reduce((sum, purchase) => sum + purchase.paidPaise, 0);
  const balancePaise = totalPurchasePaise - totalPaidPaise;
  return { purchases, totalPurchasePaise, totalPaidPaise, pendingPaise: Math.max(balancePaise, 0), advancePaise: Math.max(-balancePaise, 0) };
}

export function getAllPurchases() {
  return getData().purchases.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
