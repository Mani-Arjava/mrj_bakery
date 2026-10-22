const STORAGE_KEY = 'bakery_inventory_v2';
const STORAGE_KEY_V1 = 'bakery_inventory_v1';

const UNIT_NORMALIZE: Record<string, string> = {
  Liter: 'Lt', Litre: 'Lt', Liters: 'Lt', Litres: 'Lt', liter: 'Lt', litre: 'Lt',
  Gram: 'Gm', Grams: 'Gm', gram: 'Gm', grams: 'Gm',
  Kilogram: 'Kg', Kilograms: 'Kg', Kilo: 'Kg', kilo: 'Kg', kilogram: 'Kg',
  Piece: 'Pc', Pieces: 'Pc', piece: 'Pc', pieces: 'Pc',
  Packet: 'Pkt', Packets: 'Pkt', packet: 'Pkt', packets: 'Pkt',
  Bottle: 'Btl', Bottles: 'Btl', bottle: 'Btl', bottles: 'Btl',
};
function nu(unit: string): string { return UNIT_NORMALIZE[unit] ?? unit; }

export type Supplier = { id: string; name: string; address: string; contactPerson: string; phone: string };
export type InventoryItem = { id: string; name: string; unit: string; quantity: number };
export type PurchaseLine = { itemId: string; itemName: string; quantity: number; unit: string; unitPricePaise: number; totalPaise: number };
export type Purchase = { id: string; date: string; supplierId: string; supplierName: string; lines: PurchaseLine[]; totalPaise: number; paidPaise: number };

// Underlying bakery items that get produced (Roll Cake, ₹5 Bun, etc.)
export type ProductionItem = { id: string; name: string; productionUnit: 'KG' | 'Tray'; piecesPerUnit: number };

export type RecipeIngredient = { itemId: string; itemName: string; quantityPerUnit: number; unit: string };
export type Recipe = { id: string; productionItemId: string; ingredients: RecipeIngredient[] };

// Finished goods / packaging variants sold to customers
export type Product = { id: string; name: string; pricePerPacketPaise: number; wholesalePricePerPacketPaise?: number; createdAt: string; productionItemId?: string; count?: number; conversionUnit?: 'KG' | 'Tray' };

export type ProductionBatch = { id: string; date: string; productionItemId: string; productionItemName: string; productionQuantity: number; productionUnit: 'KG' | 'Tray'; piecesProduced: number; notes?: string };
export type Customer = { id: string; name: string; phone: string; type: 'wholesaler' | 'retailer'; outstandingPaise: number; advancePaise: number };
export type SaleLine = { productId: string; productName: string; quantityPackets: number; pricePerPacketPaise: number; totalPaise: number };
export type SaleInvoice = { id: string; date: string; customerId: string; customerName: string; lines: SaleLine[]; totalPaise: number; paidPaise: number; outstandingPaise: number };
export type StockMovement = { id: string; date: string; productionItemId: string; quantityPieces: number; movementType: 'PRODUCTION' | 'SALE'; sourceId: string };

export type InventoryData = {
  suppliers: Supplier[];
  items: InventoryItem[];
  purchases: Purchase[];
  products: Product[];
  productionItems: ProductionItem[];
  recipes: Recipe[];
  productionBatches: ProductionBatch[];
  customers: Customer[];
  saleInvoices: SaleInvoice[];
  stockMovements: StockMovement[];
};

const emptyData = (): InventoryData => ({ suppliers: [], items: [], purchases: [], products: [], productionItems: [], recipes: [], productionBatches: [], customers: [], saleInvoices: [], stockMovements: [] });
function id() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }

function migrateV1toV2(v1: any): InventoryData {
  const data = emptyData();
  data.suppliers = Array.isArray(v1.suppliers) ? v1.suppliers : [];
  data.items = Array.isArray(v1.items) ? v1.items.map((it: any) => ({ ...it, unit: nu(it.unit) })) : [];
  data.purchases = Array.isArray(v1.purchases) ? v1.purchases.map((p: any) => ({ ...p, lines: Array.isArray(p.lines) ? p.lines.map((l: any) => ({ ...l, unit: nu(l.unit) })) : [] })) : [];
  data.customers = Array.isArray(v1.customers) ? v1.customers.map((c: any) => ({ ...c, type: c.type ?? 'retailer' })) : [];
  data.saleInvoices = Array.isArray(v1.saleInvoices) ? v1.saleInvoices : [];

  const oldProducts: any[] = Array.isArray(v1.products) ? v1.products : [];
  const productIdToItemId: Record<string, string> = {};

  data.productionItems = oldProducts.map((p: any) => {
    const piId = id();
    productIdToItemId[p.id] = piId;
    return { id: piId, name: p.name, productionUnit: 'KG' as const, piecesPerUnit: 1 };
  });

  data.products = oldProducts.map((p: any) => ({ ...p, productionItemId: productIdToItemId[p.id], count: 1 }));

  data.productionBatches = (Array.isArray(v1.productionBatches) ? v1.productionBatches : []).map((b: any) => ({
    id: b.id, date: b.date,
    productionItemId: productIdToItemId[b.productId] ?? b.productId,
    productionItemName: b.productName ?? '',
    productionQuantity: b.quantityPackets ?? 0,
    productionUnit: 'KG' as const,
    piecesProduced: b.quantityPackets ?? 0,
    notes: b.notes,
  }));

  data.stockMovements = (Array.isArray(v1.stockMovements) ? v1.stockMovements : []).map((m: any) => ({
    id: m.id, date: m.date,
    productionItemId: productIdToItemId[m.productId] ?? m.productId,
    quantityPieces: m.quantityPackets ?? 0,
    movementType: m.movementType,
    sourceId: m.sourceId,
  }));

  return data;
}

export function initStorage() {
  if (typeof window !== 'undefined') getData();
}

export function getData(): InventoryData {
  if (typeof window === 'undefined') return emptyData();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const v1Raw = localStorage.getItem(STORAGE_KEY_V1);
    if (v1Raw) {
      try {
        const migrated = migrateV1toV2(JSON.parse(v1Raw));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      } catch { /* fall through to fresh init */ }
    }
    const empty = emptyData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    return empty;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
      items: Array.isArray(parsed.items) ? parsed.items.map((it: any) => ({ ...it, unit: nu(it.unit) })) : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases.map((p: any) => ({ ...p, lines: Array.isArray(p.lines) ? p.lines.map((l: any) => ({ ...l, unit: nu(l.unit) })) : [] })) : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      productionItems: Array.isArray(parsed.productionItems) ? parsed.productionItems : [],
      recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
      productionBatches: Array.isArray(parsed.productionBatches) ? parsed.productionBatches : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers.map((c: any) => ({ ...c, type: c.type ?? 'retailer' })) : [],
      saleInvoices: Array.isArray(parsed.saleInvoices) ? parsed.saleInvoices : [],
      stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : [],
    };
  } catch { return emptyData(); }
}

function save(data: InventoryData) { if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ========== SUPPLIERS ==========
export function addSupplier(input: Omit<Supplier, 'id'>) {
  const data = getData();
  const supplier = { id: id(), ...input };
  data.suppliers.push(supplier);
  save(data);
  return supplier;
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

// ========== ITEMS ==========
export function addItem(input: Omit<InventoryItem, 'id' | 'quantity'> & { quantity?: number }) {
  const data = getData();
  const item = { id: id(), name: input.name, unit: input.unit, quantity: input.quantity || 0 };
  data.items.push(item);
  save(data);
  return item;
}

export function updateItem(itemId: string, updates: Omit<InventoryItem, 'id' | 'quantity'>) {
  const data = getData();
  const item = data.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error('Item not found.');
  Object.assign(item, updates);
  data.purchases.forEach((purchase) => purchase.lines.forEach((line) => { if (line.itemId === itemId) line.itemName = item.name; }));
  data.recipes.forEach((recipe) => recipe.ingredients.forEach((ing) => { if (ing.itemId === itemId) ing.itemName = item.name; }));
  save(data);
}

export function deleteItem(itemId: string) {
  const data = getData();
  if (data.purchases.some((purchase) => purchase.lines.some((line) => line.itemId === itemId))) throw new Error('This item has purchase history and cannot be deleted.');
  if (data.recipes.some((recipe) => recipe.ingredients.some((ing) => ing.itemId === itemId))) throw new Error('This item is used in a recipe and cannot be deleted.');
  data.items = data.items.filter((item) => item.id !== itemId);
  save(data);
}

// ========== PURCHASES ==========
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

// ========== PRODUCTION ITEMS ==========
export function addProductionItem(input: Omit<ProductionItem, 'id'>) {
  const data = getData();
  const item: ProductionItem = { id: id(), ...input };
  data.productionItems.push(item);
  save(data);
  return item;
}

export function updateProductionItem(productionItemId: string, updates: Omit<ProductionItem, 'id'>) {
  const data = getData();
  const item = data.productionItems.find(pi => pi.id === productionItemId);
  if (!item) throw new Error('Production item not found.');
  Object.assign(item, updates);
  data.productionBatches.forEach(batch => { if (batch.productionItemId === productionItemId) batch.productionItemName = item.name; });
  save(data);
}

export function deleteProductionItem(productionItemId: string) {
  const data = getData();
  if (data.productionBatches.some(b => b.productionItemId === productionItemId)) throw new Error('This production item has production history and cannot be deleted.');
  if (data.products.some(p => p.productionItemId === productionItemId)) throw new Error('This production item is linked to products and cannot be deleted.');
  data.productionItems = data.productionItems.filter(pi => pi.id !== productionItemId);
  data.recipes = data.recipes.filter(r => r.productionItemId !== productionItemId);
  save(data);
}

// ========== RECIPES ==========
export function getRecipeByProductionItem(productionItemId: string): Recipe | undefined {
  return getData().recipes.find(r => r.productionItemId === productionItemId);
}

export function saveRecipe(productionItemId: string, ingredients: RecipeIngredient[]) {
  const data = getData();
  const existing = data.recipes.find(r => r.productionItemId === productionItemId);
  if (existing) {
    existing.ingredients = ingredients;
  } else {
    data.recipes.push({ id: id(), productionItemId, ingredients });
  }
  save(data);
}

export function deleteRecipe(productionItemId: string) {
  const data = getData();
  data.recipes = data.recipes.filter(r => r.productionItemId !== productionItemId);
  save(data);
}

// ========== PRODUCTS ==========
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
  save(data);
}

export function deleteProduct(productId: string) {
  const data = getData();
  if (data.saleInvoices.some(inv => inv.lines.some(l => l.productId === productId))) throw new Error('This product has sales history and cannot be deleted.');
  data.products = data.products.filter(p => p.id !== productId);
  save(data);
}

// ========== PRODUCTION STOCK ==========
function getProductionItemStockFromData(data: InventoryData, productionItemId: string): number {
  return data.stockMovements
    .filter(m => m.productionItemId === productionItemId)
    .reduce((sum, m) => sum + (m.movementType === 'PRODUCTION' ? m.quantityPieces : -m.quantityPieces), 0);
}

export function getProductionItemStock(productionItemId: string): number {
  return getProductionItemStockFromData(getData(), productionItemId);
}

// Legacy helper — returns pieces for the production item linked to a product
export function getProductStock(productId: string): number {
  const data = getData();
  const product = data.products.find(p => p.id === productId);
  if (!product?.productionItemId) return 0;
  return getProductionItemStockFromData(data, product.productionItemId);
}

// ========== PRODUCTION ==========
function applyRecipeEffect(data: InventoryData, productionItemId: string, productionQuantity: number, direction: 1 | -1) {
  const recipe = data.recipes.find(r => r.productionItemId === productionItemId);
  if (!recipe) return;
  for (const ingredient of recipe.ingredients) {
    const item = data.items.find(it => it.id === ingredient.itemId);
    if (item) item.quantity += ingredient.quantityPerUnit * productionQuantity * direction;
  }
}

export function addProductionBatch(input: Omit<ProductionBatch, 'id'>) {
  const data = getData();
  const batch: ProductionBatch = { id: id(), ...input };
  data.productionBatches.push(batch);
  applyRecipeEffect(data, input.productionItemId, input.productionQuantity, -1);
  const movement: StockMovement = { id: id(), date: input.date, productionItemId: input.productionItemId, quantityPieces: input.piecesProduced, movementType: 'PRODUCTION', sourceId: batch.id };
  data.stockMovements.push(movement);
  save(data);
  return batch;
}

export function getDailyProduction(date: string) {
  return getData().productionBatches.filter(b => b.date === date).sort((a, b) => b.id.localeCompare(a.id));
}

export function getAllProductionBatches() {
  return getData().productionBatches.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function updateProductionBatch(batchId: string, input: Omit<ProductionBatch, 'id'>) {
  const data = getData();
  const batch = data.productionBatches.find(b => b.id === batchId);
  if (!batch) throw new Error('Production batch not found.');
  // Reverse old effects
  applyRecipeEffect(data, batch.productionItemId, batch.productionQuantity, 1);
  data.stockMovements = data.stockMovements.filter(m => m.sourceId !== batchId);
  // Apply new effects
  Object.assign(batch, input);
  applyRecipeEffect(data, input.productionItemId, input.productionQuantity, -1);
  const movement: StockMovement = { id: id(), date: input.date, productionItemId: input.productionItemId, quantityPieces: input.piecesProduced, movementType: 'PRODUCTION', sourceId: batchId };
  data.stockMovements.push(movement);
  save(data);
}

export function deleteProductionBatch(batchId: string) {
  const data = getData();
  const batch = data.productionBatches.find(b => b.id === batchId);
  if (!batch) throw new Error('Production batch not found.');
  applyRecipeEffect(data, batch.productionItemId, batch.productionQuantity, 1);
  data.stockMovements = data.stockMovements.filter(m => m.sourceId !== batchId);
  data.productionBatches = data.productionBatches.filter(b => b.id !== batchId);
  save(data);
}

// ========== CUSTOMERS ==========
export function addCustomer(input: Omit<Customer, 'id' | 'outstandingPaise' | 'advancePaise'> & { previousBalancePaise?: number }) {
  const data = getData();
  const { previousBalancePaise, ...rest } = input;
  const customer: Customer = { id: id(), ...rest, outstandingPaise: previousBalancePaise ?? 0, advancePaise: 0 };
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
  return getData().saleInvoices.filter(inv => inv.customerId === customerId).sort((a, b) => b.date.localeCompare(a.date));
}

// ========== SALES ==========
export function postSale(input: Omit<SaleInvoice, 'id'>) {
  const data = getData();
  const customer = data.customers.find(c => c.id === input.customerId);
  if (!customer) throw new Error('Customer not found.');

  // Aggregate pieces needed per production item first (multiple lines can share one item)
  const neededByProductionItem: Record<string, number> = {};
  for (const line of input.lines) {
    const product = data.products.find(p => p.id === line.productId);
    if (product?.productionItemId) {
      neededByProductionItem[product.productionItemId] =
        (neededByProductionItem[product.productionItemId] ?? 0) + line.quantityPackets * (product.count ?? 1);
    }
  }
  for (const [piId, needed] of Object.entries(neededByProductionItem)) {
    const available = getProductionItemStockFromData(data, piId);
    if (available < needed) {
      const pi = data.productionItems.find(p => p.id === piId);
      throw new Error(`Insufficient stock for ${pi?.name ?? piId} (need ${needed} pcs, have ${available} pcs)`);
    }
  }

  const invoice: SaleInvoice = { id: id(), ...input };
  data.saleInvoices.push(invoice);

  // Create stock movements (OUT) — piece-based per production item
  for (const line of input.lines) {
    const product = data.products.find(p => p.id === line.productId);
    if (product?.productionItemId) {
      const quantityPieces = line.quantityPackets * (product.count ?? 1);
      const movement: StockMovement = { id: id(), date: input.date, productionItemId: product.productionItemId, quantityPieces, movementType: 'SALE', sourceId: invoice.id };
      data.stockMovements.push(movement);
    }
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
  return getData().saleInvoices.filter(inv => inv.date === date).sort((a, b) => b.id.localeCompare(a.id));
}
