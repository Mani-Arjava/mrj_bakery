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

export function updateSupplier(supplierId: string, updates: Omit<Supplier, 'id'>) {
  const data = getData();
  const supplier = data.suppliers.find((candidate) => candidate.id === supplierId);
  if (!supplier) throw new Error('Supplier not found.');
  Object.assign(supplier, updates);
  data.purchases.forEach((purchase) => { if (purchase.supplierId === supplierId) purchase.supplierName = supplier.name; });
  save(data);
}

export function deleteSupplier(supplierId: string) {
  const data = getData();
  if (data.purchases.some((purchase) => purchase.supplierId === supplierId)) throw new Error('This supplier has purchase history and cannot be deleted.');
  data.suppliers = data.suppliers.filter((supplier) => supplier.id !== supplierId);
  save(data);
}

export function updateItem(itemId: string, updates: Omit<InventoryItem, 'id' | 'quantity'>) {
  const data = getData();
  const item = data.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error('Item not found.');
  Object.assign(item, updates);
  data.purchases.forEach((purchase) => purchase.lines.forEach((line) => { if (line.itemId === itemId) { line.itemName = item.name; } }));
  save(data);
}

export function deleteItem(itemId: string) {
  const data = getData();
  if (data.purchases.some((purchase) => purchase.lines.some((line) => line.itemId === itemId))) throw new Error('This item has purchase history and cannot be deleted.');
  data.items = data.items.filter((item) => item.id !== itemId);
  save(data);
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

function changeStock(data: InventoryData, lines: PurchaseLine[], direction: 1 | -1) {
  for (const line of lines) {
    const item = data.items.find((candidate) => candidate.id === line.itemId);
    if (item) item.quantity += line.quantity * direction;
  }
}

export function updatePurchase(purchaseId: string, input: Omit<Purchase, 'id' | 'supplierName'>) {
  const data = getData();
  const purchase = data.purchases.find((candidate) => candidate.id === purchaseId);
  const supplier = data.suppliers.find((candidate) => candidate.id === input.supplierId);
  if (!purchase || !supplier) throw new Error('Purchase or supplier not found.');
  changeStock(data, purchase.lines, -1);
  changeStock(data, input.lines, 1);
  Object.assign(purchase, { ...input, supplierName: supplier.name });
  save(data);
}

export function deletePurchase(purchaseId: string) {
  const data = getData();
  const purchase = data.purchases.find((candidate) => candidate.id === purchaseId);
  if (!purchase) throw new Error('Purchase not found.');
  changeStock(data, purchase.lines, -1);
  data.purchases = data.purchases.filter((candidate) => candidate.id !== purchaseId);
  save(data);
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
