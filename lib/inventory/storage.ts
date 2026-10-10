// The initial inventory product intentionally uses a small, versioned browser store.
// It does not read the previous ERP data set.
const STORAGE_KEY = 'bakery_inventory_v1';

export type Supplier = { id: string; name: string; address: string; contactPerson: string; phone: string };
export type InventoryItem = { id: string; name: string; unit: string; quantity: number };
export type PurchaseLine = { itemId: string; itemName: string; quantity: number; unit: string; unitPricePaise: number; totalPaise: number };
export type Purchase = { id: string; date: string; supplierId: string; supplierName: string; lines: PurchaseLine[]; totalPaise: number; paidPaise: number };

// Finished goods (distinct from raw materials)
export type Product = { id: string; name: string; pricePerPacketPaise: number; createdAt: string };
export type ProductionBatch = { id: string; date: string; productId: string; productName: string; quantityPackets: number; notes?: string };
export type Customer = { id: string; name: string; phone: string; outstandingPaise: number; advancePaise: number };
export type SaleLine = { productId: string; productName: string; quantityPackets: number; pricePerPacketPaise: number; totalPaise: number };
export type SaleInvoice = { id: string; date: string; customerId: string; customerName: string; lines: SaleLine[]; totalPaise: number; paidPaise: number; outstandingPaise: number };
export type StockMovement = { id: string; date: string; productId: string; quantityPackets: number; movementType: 'PRODUCTION' | 'SALE'; sourceId: string };

export type InventoryData = { suppliers: Supplier[]; items: InventoryItem[]; purchases: Purchase[]; products: Product[]; productionBatches: ProductionBatch[]; customers: Customer[]; saleInvoices: SaleInvoice[]; stockMovements: StockMovement[] };

const emptyData = (): InventoryData => ({ suppliers: [], items: [], purchases: [], products: [], productionBatches: [], customers: [], saleInvoices: [], stockMovements: [] });
function id() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }

export function initStorage() {
  if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData()));
}

export function getData(): InventoryData {
  if (typeof window === 'undefined') return emptyData();
  initStorage();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '');
    return {
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
      items: Array.isArray(parsed.items) ? parsed.items : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      productionBatches: Array.isArray(parsed.productionBatches) ? parsed.productionBatches : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      saleInvoices: Array.isArray(parsed.saleInvoices) ? parsed.saleInvoices : [],
      stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : []
    };
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

// ========== PRODUCTS & STOCK ==========
export function addProduct(input: Omit<Product, 'id' | 'createdAt'>) {
  const data = getData();
  const product: Product = { id: id(), ...input, createdAt: new Date().toISOString().slice(0, 10) };
  data.products.push(product);
  save(data);
  return product;
}

export function updateProduct(productId: string, updates: Omit<Product, 'id' | 'createdAt'>) {
  const data = getData();
  const product = data.products.find(p => p.id === productId);
  if (!product) throw new Error('Product not found.');
  Object.assign(product, updates);
  data.saleInvoices.forEach(inv => inv.lines.forEach(line => { if (line.productId === productId) line.productName = product.name; }));
  data.productionBatches.forEach(batch => { if (batch.productId === productId) batch.productName = product.name; });
  save(data);
}

export function getProductStock(productId: string): number {
  const data = getData();
  const movements = data.stockMovements.filter(m => m.productId === productId);
  return movements.reduce((sum, m) => sum + (m.movementType === 'PRODUCTION' ? m.quantityPackets : -m.quantityPackets), 0);
}

// ========== PRODUCTION ==========
export function addProductionBatch(input: Omit<ProductionBatch, 'id'>) {
  const data = getData();
  const batch: ProductionBatch = { id: id(), ...input };
  data.productionBatches.push(batch);

  // Create stock movement (IN)
  const movement: StockMovement = { id: id(), date: input.date, productId: input.productId, quantityPackets: input.quantityPackets, movementType: 'PRODUCTION', sourceId: batch.id };
  data.stockMovements.push(movement);

  save(data);
  return batch;
}

export function getDailyProduction(date: string) {
  const data = getData();
  return data.productionBatches.filter(b => b.date === date).sort((a, b) => b.id.localeCompare(a.id));
}

// ========== CUSTOMERS ==========
export function addCustomer(input: Omit<Customer, 'id' | 'outstandingPaise' | 'advancePaise'>) {
  const data = getData();
  const customer: Customer = { id: id(), ...input, outstandingPaise: 0, advancePaise: 0 };
  data.customers.push(customer);
  save(data);
  return customer;
}

export function updateCustomer(customerId: string, updates: Partial<Omit<Customer, 'id'>>) {
  const data = getData();
  const customer = data.customers.find(c => c.id === customerId);
  if (!customer) throw new Error('Customer not found.');
  Object.assign(customer, updates);
  save(data);
}

export function getCustomerBalance(customerId: string): { outstandingPaise: number; advancePaise: number } {
  const data = getData();
  const customer = data.customers.find(c => c.id === customerId);
  if (!customer) return { outstandingPaise: 0, advancePaise: 0 };
  return { outstandingPaise: customer.outstandingPaise, advancePaise: customer.advancePaise };
}

export function getSalesHistory(customerId: string) {
  const data = getData();
  return data.saleInvoices.filter(inv => inv.customerId === customerId).sort((a, b) => b.date.localeCompare(a.date));
}

// ========== SALES ==========
export function postSale(input: Omit<SaleInvoice, 'id'>) {
  const data = getData();
  const customer = data.customers.find(c => c.id === input.customerId);
  if (!customer) throw new Error('Customer not found.');

  // Check stock availability
  for (const line of input.lines) {
    const stock = getProductStock(line.productId);
    if (stock < line.quantityPackets) throw new Error(`Insufficient stock for ${line.productName}`);
  }

  const invoice: SaleInvoice = { id: id(), ...input };
  data.saleInvoices.push(invoice);

  // Create stock movements (OUT) and update customer balance
  for (const line of input.lines) {
    const movement: StockMovement = { id: id(), date: input.date, productId: line.productId, quantityPackets: line.quantityPackets, movementType: 'SALE', sourceId: invoice.id };
    data.stockMovements.push(movement);
  }

  // Update customer outstanding/advance
  const oldOutstanding = customer.outstandingPaise;
  customer.outstandingPaise = oldOutstanding + input.outstandingPaise;
  if (input.paidPaise > 0 && customer.outstandingPaise < 0) {
    customer.advancePaise = -customer.outstandingPaise;
    customer.outstandingPaise = 0;
  }

  save(data);
  return invoice;
}

export function getSalesForDate(date: string) {
  const data = getData();
  return data.saleInvoices.filter(inv => inv.date === date).sort((a, b) => b.id.localeCompare(a.id));
}
