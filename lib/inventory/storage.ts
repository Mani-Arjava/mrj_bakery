import { db } from '@/lib/firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  writeBatch, runTransaction, increment, onSnapshot,
  query, where, type Unsubscribe,
} from 'firebase/firestore';

// ========== UNIT NORMALIZE ==========
const UNIT_NORMALIZE: Record<string, string> = {
  Liter: 'Lt', Litre: 'Lt', Liters: 'Lt', Litres: 'Lt', liter: 'Lt', litre: 'Lt',
  Gram: 'Gm', Grams: 'Gm', gram: 'Gm', grams: 'Gm',
  Kilogram: 'Kg', Kilograms: 'Kg', Kilo: 'Kg', kilo: 'Kg', kilogram: 'Kg',
  Piece: 'Pc', Pieces: 'Pc', piece: 'Pc', pieces: 'Pc',
  Packet: 'Pkt', Packets: 'Pkt', packet: 'Pkt', packets: 'Pkt',
  Bottle: 'Btl', Bottles: 'Btl', bottle: 'Btl', bottles: 'Btl',
};
function nu(unit: string): string { return UNIT_NORMALIZE[unit] ?? unit; }

// ========== TYPES ==========
export type Supplier = { id: string; name: string; address: string; contactPerson: string; phone: string; openingPendingPaise?: number; openingAdvancePaise?: number };
export type InventoryItem = { id: string; name: string; unit: string; quantity: number };
export type PurchaseLine = { itemId: string; itemName: string; quantity: number; unit: string; unitPricePaise: number; totalPaise: number };
export type Purchase = { id: string; date: string; supplierId: string; supplierName: string; lines: PurchaseLine[]; totalPaise: number; paidPaise: number };

export type ProductionItem = { id: string; name: string; productionUnit?: 'KG' | 'Tray'; piecesPerUnit: number; currentStockPieces?: number };

export type RecipeIngredient = { itemId: string; itemName: string; quantityPerUnit: number; unit: string };
export type Recipe = { id: string; productionItemId: string; ingredients: RecipeIngredient[] };

export type ProductPriceEntry = { date: string; retailPricePaise: number; wholesalePricePaise: number };
export type ItemRateEntry = { date: string; supplierName: string; quantity: number; unit: string; unitRatePaise: number };

export type Product = { id: string; name: string; pricePerPacketPaise: number; wholesalePricePerPacketPaise?: number; createdAt: string; productionItemId?: string; count?: number; conversionUnit?: 'KG' | 'Tray'; piecesPerPacket?: number; priceHistory?: ProductPriceEntry[] };

export type ProductionBatchMaterial = { itemId: string; itemName: string; quantity: number; unit: string };
export type ProductionBatchOutput = { productionItemId: string; productionItemName: string; quantity: number; unit: string };
export type ProductionBatch = {
  id: string; date: string;
  productionItemId?: string; productionItemName?: string;
  productionQuantity?: number; productionUnit?: 'KG' | 'Tray'; piecesProduced?: number;
  rawMaterials?: ProductionBatchMaterial[];
  productsProduced?: ProductionBatchOutput[];
  notes?: string;
};

export type Customer = { id: string; name: string; phone: string; type: 'wholesaler' | 'retailer'; outstandingPaise: number; advancePaise: number };
export type Employee = { id: string; name: string; phone: string; advancePaise: number; duePaise: number; openingAdvancePaise: number; openingDuePaise: number };
export type SaleLine = { productId: string; productName: string; quantityPackets: number; pricePerPacketPaise: number; totalPaise: number };
export type PaymentType = 'UPI' | 'Cash' | 'Card' | 'Other';
export type PaymentEntry = { type: PaymentType; amountPaise: number };
export type SaleInvoice = {
  id: string; date: string; customerId: string; customerName: string;
  lines: SaleLine[]; totalPaise: number;
  discountPaise?: number; extraChargePaise?: number; extraChargesNote?: string; finalTotalPaise?: number;
  paidPaise: number; outstandingPaise: number;
  payments?: PaymentEntry[]; paymentType?: PaymentType;
  previousOutstandingPaise?: number; previousAdvancePaise?: number;
};
export type StockMovement = { id: string; date: string; productionItemId: string; quantityPieces: number; movementType: 'PRODUCTION' | 'SALE'; sourceId: string };

export type ExpenseCategory = 'salary' | 'petrol' | 'courier' | 'cover-packing' | 'tea' | 'electricity' | 'other';
export type Expense = {
  id: string; date: string; category: ExpenseCategory; amountPaise: number;
  employeeId?: string; employeeName?: string; actualAmountPaise?: number;
  customName?: string; note?: string;
};

export type InventoryData = {
  suppliers: Supplier[]; items: InventoryItem[]; purchases: Purchase[];
  products: Product[]; productionItems: ProductionItem[]; recipes: Recipe[];
  productionBatches: ProductionBatch[]; customers: Customer[]; employees: Employee[];
  saleInvoices: SaleInvoice[]; stockMovements: StockMovement[]; expenses: Expense[];
};

export type PLProductionLine = {
  productionItemId: string; productionItemName: string; productName: string;
  quantityInUnit: number; unit: string; piecesProduced: number; packets: number;
  retailValuePaise: number; wholesaleValuePaise: number;
};
export type PLMaterialLine = {
  itemId: string; itemName: string; quantity: number; unit: string;
  unitRatePaise: number; totalCostPaise: number;
};
export type PLDaySummary = {
  date: string; productionLines: PLProductionLine[]; materialLines: PLMaterialLine[];
  salaryExpenses: Expense[]; otherExpenses: Expense[];
  totalProductionValuePaise: number; totalMaterialCostPaise: number;
  totalSalaryCostPaise: number; totalOtherCostPaise: number;
  totalCostPaise: number; profitPaise: number; profitPercent: number;
};

// ========== HELPERS ==========
export function emptyData(): InventoryData {
  return { suppliers: [], items: [], purchases: [], products: [], productionItems: [], recipes: [], productionBatches: [], customers: [], employees: [], saleInvoices: [], stockMovements: [], expenses: [] };
}
function id(): string { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
function col(name: keyof InventoryData) { return collection(db, name); }

/** Compute net salary advance/due effect across all expenses for an employee (positive = advance, negative = due). */
export function computeEmployeeNetFromExpenses(expenses: Expense[], employeeId: string): number {
  let net = 0;
  for (const exp of expenses) {
    if (exp.category === 'salary' && exp.employeeId === employeeId && exp.actualAmountPaise !== undefined)
      net += exp.amountPaise - exp.actualAmountPaise;
  }
  return net;
}

// ========== REAL-TIME SUBSCRIPTION ==========
const COLLECTIONS = ['suppliers','items','purchases','products','productionItems','recipes',
  'productionBatches','customers','employees','saleInvoices','stockMovements','expenses'] as const;

export function subscribeToInventory(callback: (data: InventoryData) => void): Unsubscribe {
  const state = emptyData() as Record<string, unknown[]>;
  const loaded = new Set<string>();
  const unsubs = COLLECTIONS.map(name =>
    onSnapshot(col(name as keyof InventoryData), snap => {
      state[name] = snap.docs.map(d => {
        const data = d.data();
        // Normalize unit fields on load
        if (name === 'items' && typeof data.unit === 'string') data.unit = nu(data.unit);
        if (name === 'purchases' && Array.isArray(data.lines))
          data.lines = data.lines.map((l: PurchaseLine) => ({ ...l, unit: nu(l.unit) }));
        return data;
      });
      loaded.add(name);
      if (loaded.size === COLLECTIONS.length)
        callback({ ...state } as unknown as InventoryData);
    })
  );
  return () => unsubs.forEach(u => u());
}

// ========== READ / COMPUTE FUNCTIONS (synchronous — work on data from hook) ==========

export function getProductionItemStockFromData(data: InventoryData, productionItemId: string): number {
  // Use denormalized field if available, else compute from movements
  const pi = data.productionItems.find(p => p.id === productionItemId);
  if (pi?.currentStockPieces !== undefined) return pi.currentStockPieces;
  const count = data.products.find(p => p.productionItemId === productionItemId)?.count ?? 1;
  const totalProduced = data.productionBatches
    .flatMap(b => b.productsProduced ?? [])
    .filter(p => p.productionItemId === productionItemId)
    .reduce((sum, p) => sum + Math.round(p.quantity * count), 0);
  const totalSold = data.stockMovements
    .filter(m => m.productionItemId === productionItemId && m.movementType === 'SALE')
    .reduce((sum, m) => sum + m.quantityPieces, 0);
  return totalProduced - totalSold;
}

export function getProductionItemStock(data: InventoryData, productionItemId: string): number {
  return data.productionItems.find(p => p.id === productionItemId)?.currentStockPieces ?? 0;
}

export function getProductStock(data: InventoryData, productId: string): number {
  const product = data.products.find(p => p.id === productId);
  if (!product?.productionItemId) return 0;
  return getProductionItemStock(data, product.productionItemId);
}

export function getSupplierSummary(data: InventoryData, supplierId: string) {
  const supplier = data.suppliers.find(s => s.id === supplierId);
  const purchases = data.purchases.filter(p => p.supplierId === supplierId);
  const totalPurchasePaise = purchases.reduce((s, p) => s + p.totalPaise, 0);
  const totalPaidPaise = purchases.reduce((s, p) => s + p.paidPaise, 0);
  const openingPending = supplier?.openingPendingPaise ?? 0;
  const openingAdvance = supplier?.openingAdvancePaise ?? 0;
  const balancePaise = totalPurchasePaise - totalPaidPaise + openingPending - openingAdvance;
  return { purchases, totalPurchasePaise, totalPaidPaise, pendingPaise: Math.max(balancePaise, 0), advancePaise: Math.max(-balancePaise, 0) };
}

export function getSalesHistory(data: InventoryData, customerId: string): SaleInvoice[] {
  return data.saleInvoices.filter(inv => inv.customerId === customerId).sort((a, b) => b.date.localeCompare(a.date));
}

export function getSalesForDate(data: InventoryData, date: string): SaleInvoice[] {
  return data.saleInvoices.filter(inv => inv.date === date).sort((a, b) => b.id.localeCompare(a.id));
}

export function getExpensesByDate(data: InventoryData, date: string): Expense[] {
  return (data.expenses ?? []).filter(e => e.date === date).sort((a, b) => b.id.localeCompare(a.id));
}

export function getAllExpenses(data: InventoryData): Expense[] {
  return data.expenses ?? [];
}

export function getAllProductionBatches(data: InventoryData): ProductionBatch[] {
  return data.productionBatches.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function getAllEmployees(data: InventoryData): Employee[] {
  return data.employees ?? [];
}

export function getAllPurchases(data: InventoryData): Purchase[] {
  return data.purchases.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function getCustomerBalance(data: InventoryData, customerId: string): { outstandingPaise: number; advancePaise: number } {
  const c = data.customers.find(c => c.id === customerId);
  if (!c) return { outstandingPaise: 0, advancePaise: 0 };
  return { outstandingPaise: c.outstandingPaise, advancePaise: c.advancePaise };
}

export function getRecipeByProductionItem(data: InventoryData, productionItemId: string): Recipe | undefined {
  return data.recipes.find(r => r.productionItemId === productionItemId);
}

export function getItemPurchaseRateHistory(data: InventoryData, itemId: string): ItemRateEntry[] {
  const entries: ItemRateEntry[] = [];
  for (const p of data.purchases ?? []) {
    const line = p.lines.find(l => l.itemId === itemId);
    if (line) entries.push({ date: p.date, supplierName: p.supplierName, quantity: line.quantity, unit: line.unit, unitRatePaise: line.unitPricePaise });
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function getEmployeeSalaryHistory(data: InventoryData, employeeId: string) {
  const emp = data.employees.find(e => e.id === employeeId);
  if (!emp) return null;
  const openingBalancePaise = emp.openingAdvancePaise - emp.openingDuePaise;
  type Entry = { expense: Expense; changePaise: number; runningBalancePaise: number };
  const acc = (data.expenses ?? [])
    .filter(e => e.category === 'salary' && e.employeeId === employeeId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .reduce<{ list: Entry[]; balance: number }>(
      (state, exp) => {
        const diff = exp.amountPaise - (exp.actualAmountPaise ?? exp.amountPaise);
        const balance = state.balance + diff;
        state.list.push({ expense: exp, changePaise: diff, runningBalancePaise: balance });
        state.balance = balance;
        return state;
      },
      { list: [], balance: openingBalancePaise }
    );
  return { openingBalancePaise, entries: acc.list, currentBalancePaise: emp.advancePaise - emp.duePaise };
}

function getItemLatestRatePaise(data: InventoryData, itemId: string): number {
  let latestDate = '';
  for (const p of data.purchases ?? []) {
    if (p.lines.some(l => l.itemId === itemId) && p.date > latestDate) latestDate = p.date;
  }
  if (!latestDate) return 0;
  let totalQty = 0, totalCost = 0;
  for (const p of data.purchases ?? []) {
    if (p.date !== latestDate) continue;
    const line = p.lines.find(l => l.itemId === itemId);
    if (line) { totalQty += line.quantity; totalCost += line.totalPaise; }
  }
  return totalQty > 0 ? Math.round(totalCost / totalQty) : 0;
}

export function getPLSummary(data: InventoryData, date: string): PLDaySummary {
  const batches = (data.productionBatches ?? []).filter(b => b.date === date);
  const expenses = (data.expenses ?? []).filter(e => e.date === date);
  const prodMap = new Map<string, PLProductionLine>();
  for (const batch of batches) {
    for (const produced of batch.productsProduced ?? []) {
      const product = (data.products ?? []).find(p => p.productionItemId === produced.productionItemId);
      if (!product || !product.count || !product.piecesPerPacket) continue;
      const piecesProduced = produced.quantity * product.count;
      const packets = piecesProduced / product.piecesPerPacket;
      const existing = prodMap.get(produced.productionItemId);
      if (existing) {
        existing.quantityInUnit += produced.quantity; existing.piecesProduced += piecesProduced; existing.packets += packets;
        existing.retailValuePaise += packets * product.pricePerPacketPaise;
        existing.wholesaleValuePaise += packets * (product.wholesalePricePerPacketPaise ?? product.pricePerPacketPaise);
      } else {
        prodMap.set(produced.productionItemId, {
          productionItemId: produced.productionItemId, productionItemName: produced.productionItemName,
          productName: product.name, quantityInUnit: produced.quantity, unit: produced.unit,
          piecesProduced, packets,
          retailValuePaise: packets * product.pricePerPacketPaise,
          wholesaleValuePaise: packets * (product.wholesalePricePerPacketPaise ?? product.pricePerPacketPaise),
        });
      }
    }
  }
  const productionLines = Array.from(prodMap.values());
  const matMap = new Map<string, PLMaterialLine>();
  for (const batch of batches) {
    for (const mat of batch.rawMaterials ?? []) {
      const unitRatePaise = getItemLatestRatePaise(data, mat.itemId);
      const existing = matMap.get(mat.itemId);
      if (existing) { existing.quantity += mat.quantity; existing.totalCostPaise += mat.quantity * unitRatePaise; }
      else matMap.set(mat.itemId, { itemId: mat.itemId, itemName: mat.itemName, quantity: mat.quantity, unit: mat.unit, unitRatePaise, totalCostPaise: mat.quantity * unitRatePaise });
    }
  }
  const materialLines = Array.from(matMap.values());
  const salaryExpenses = expenses.filter(e => e.category === 'salary');
  const otherExpenses = expenses.filter(e => e.category !== 'salary');
  const totalProductionValuePaise = productionLines.reduce((s, l) => s + l.retailValuePaise, 0);
  const totalMaterialCostPaise = materialLines.reduce((s, l) => s + l.totalCostPaise, 0);
  const totalSalaryCostPaise = salaryExpenses.reduce((s, e) => s + e.amountPaise, 0);
  const totalOtherCostPaise = otherExpenses.reduce((s, e) => s + e.amountPaise, 0);
  const totalCostPaise = totalMaterialCostPaise + totalSalaryCostPaise + totalOtherCostPaise;
  const profitPaise = totalProductionValuePaise - totalCostPaise;
  const profitPercent = totalProductionValuePaise > 0 ? (profitPaise / totalProductionValuePaise) * 100 : 0;
  return { date, productionLines, materialLines, salaryExpenses, otherExpenses, totalProductionValuePaise, totalMaterialCostPaise, totalSalaryCostPaise, totalOtherCostPaise, totalCostPaise, profitPaise, profitPercent };
}

export function getPLDates(data: InventoryData): string[] {
  const dates = new Set<string>();
  for (const b of data.productionBatches ?? []) dates.add(b.date);
  for (const e of data.expenses ?? []) dates.add(e.date);
  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

// ========== SUPPLIERS ==========
export async function addSupplier(input: Omit<Supplier, 'id'>): Promise<Supplier> {
  const supplier: Supplier = { id: id(), ...input };
  await setDoc(doc(db, 'suppliers', supplier.id), supplier);
  return supplier;
}

export async function updateSupplier(supplierId: string, updates: Omit<Supplier, 'id'>): Promise<void> {
  await updateDoc(doc(db, 'suppliers', supplierId), updates as Record<string, unknown>);
  // Cascade supplier name into purchases
  if (updates.name) {
    const snap = await getDocs(query(col('purchases'), where('supplierId', '==', supplierId)));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { supplierName: updates.name }));
      await batch.commit();
    }
  }
}

export async function deleteSupplier(data: InventoryData, supplierId: string): Promise<void> {
  if (data.purchases.some(p => p.supplierId === supplierId))
    throw new Error('This supplier has purchase history and cannot be deleted.');
  await deleteDoc(doc(db, 'suppliers', supplierId));
}

// ========== ITEMS ==========
export async function addItem(input: Omit<InventoryItem, 'id' | 'quantity'> & { quantity?: number }): Promise<InventoryItem> {
  const item: InventoryItem = { id: id(), name: input.name, unit: nu(input.unit), quantity: input.quantity ?? 0 };
  await setDoc(doc(db, 'items', item.id), item);
  return item;
}

export async function updateItem(data: InventoryData, itemId: string, updates: Omit<InventoryItem, 'id' | 'quantity'>): Promise<void> {
  await updateDoc(doc(db, 'items', itemId), updates as Record<string, unknown>);
  // Cascade item name into purchase lines and recipe ingredients
  if (updates.name) {
    const batch = writeBatch(db);
    data.purchases.forEach(p => {
      if (p.lines.some(l => l.itemId === itemId)) {
        const updatedLines = p.lines.map(l => l.itemId === itemId ? { ...l, itemName: updates.name } : l);
        batch.update(doc(db, 'purchases', p.id), { lines: updatedLines });
      }
    });
    data.recipes.forEach(r => {
      if (r.ingredients.some(i => i.itemId === itemId)) {
        const updatedIngredients = r.ingredients.map(i => i.itemId === itemId ? { ...i, itemName: updates.name } : i);
        batch.update(doc(db, 'recipes', r.id), { ingredients: updatedIngredients });
      }
    });
    await batch.commit();
  }
}

export async function deleteItem(data: InventoryData, itemId: string): Promise<void> {
  if (data.purchases.some(p => p.lines.some(l => l.itemId === itemId)))
    throw new Error('This item has purchase history and cannot be deleted.');
  if (data.recipes.some(r => r.ingredients.some(i => i.itemId === itemId)))
    throw new Error('This item is used in a recipe and cannot be deleted.');
  await deleteDoc(doc(db, 'items', itemId));
}

// ========== PURCHASES ==========
export async function postPurchase(input: Omit<Purchase, 'id' | 'supplierName'>, data: InventoryData): Promise<Purchase> {
  const supplier = data.suppliers.find(s => s.id === input.supplierId);
  if (!supplier) throw new Error('Please select a supplier.');
  const purchase: Purchase = { supplierName: supplier.name, ...input, id: id() };
  const batch = writeBatch(db);
  batch.set(doc(db, 'purchases', purchase.id), purchase);
  for (const line of input.lines)
    batch.update(doc(db, 'items', line.itemId), { quantity: increment(line.quantity) });
  await batch.commit();
  return purchase;
}

export async function updatePurchase(purchaseId: string, input: Omit<Purchase, 'id' | 'supplierName'>, data: InventoryData): Promise<void> {
  const supplier = data.suppliers.find(s => s.id === input.supplierId);
  if (!supplier) throw new Error('Supplier not found.');
  const oldPurchaseSnap = await getDoc(doc(db, 'purchases', purchaseId));
  if (!oldPurchaseSnap.exists()) throw new Error('Purchase not found.');
  const oldPurchase = oldPurchaseSnap.data() as Purchase;
  await runTransaction(db, async tx => {
    // Restore old stock
    for (const line of oldPurchase.lines)
      tx.update(doc(db, 'items', line.itemId), { quantity: increment(-line.quantity) });
    // Apply new stock
    for (const line of input.lines)
      tx.update(doc(db, 'items', line.itemId), { quantity: increment(line.quantity) });
    // Update purchase
    tx.set(doc(db, 'purchases', purchaseId), { id: purchaseId, supplierName: supplier.name, ...input });
  });
}

export async function deletePurchase(purchaseId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'purchases', purchaseId));
  if (!snap.exists()) throw new Error('Purchase not found.');
  const purchase = snap.data() as Purchase;
  const batch = writeBatch(db);
  batch.delete(doc(db, 'purchases', purchaseId));
  for (const line of purchase.lines)
    batch.update(doc(db, 'items', line.itemId), { quantity: increment(-line.quantity) });
  await batch.commit();
}

// ========== PRODUCTION ITEMS ==========
export async function addProductionItem(input: Omit<ProductionItem, 'id'>): Promise<ProductionItem> {
  const item: ProductionItem = { id: id(), ...input, currentStockPieces: 0 };
  await setDoc(doc(db, 'productionItems', item.id), item);
  return item;
}

export async function updateProductionItem(productionItemId: string, updates: Omit<ProductionItem, 'id'>): Promise<void> {
  await updateDoc(doc(db, 'productionItems', productionItemId), updates as Record<string, unknown>);
  // Cascade name into production batches
  if (updates.name) {
    const snap = await getDocs(query(col('productionBatches'), where('productionItemId', '==', productionItemId)));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { productionItemName: updates.name }));
      await batch.commit();
    }
  }
}

export async function deleteProductionItem(data: InventoryData, productionItemId: string): Promise<void> {
  if (data.productionBatches.some(b => b.productionItemId === productionItemId))
    throw new Error('This production item has production history and cannot be deleted.');
  if (data.products.some(p => p.productionItemId === productionItemId))
    throw new Error('This production item is linked to products and cannot be deleted.');
  const batch = writeBatch(db);
  batch.delete(doc(db, 'productionItems', productionItemId));
  // Delete linked recipe
  const recipeSnap = await getDocs(query(col('recipes'), where('productionItemId', '==', productionItemId)));
  recipeSnap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

// ========== RECIPES ==========
export async function saveRecipe(productionItemId: string, ingredients: RecipeIngredient[]): Promise<void> {
  const snap = await getDocs(query(col('recipes'), where('productionItemId', '==', productionItemId)));
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { ingredients });
  } else {
    const rid = id();
    await setDoc(doc(db, 'recipes', rid), { id: rid, productionItemId, ingredients });
  }
}

export async function deleteRecipe(productionItemId: string): Promise<void> {
  const snap = await getDocs(query(col('recipes'), where('productionItemId', '==', productionItemId)));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

// ========== PRODUCTS ==========
export async function addProduct(input: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  const today = new Date().toISOString().slice(0, 10);
  const product: Product = { id: id(), ...input, createdAt: today, priceHistory: [{ date: today, retailPricePaise: input.pricePerPacketPaise, wholesalePricePaise: input.wholesalePricePerPacketPaise ?? 0 }] };
  await setDoc(doc(db, 'products', product.id), product);
  return product;
}

export async function updateProduct(data: InventoryData, productId: string, updates: Omit<Product, 'id' | 'createdAt'>): Promise<void> {
  const product = data.products.find(p => p.id === productId);
  if (!product) throw new Error('Product not found.');
  const priceChanged = product.pricePerPacketPaise !== updates.pricePerPacketPaise ||
    (product.wholesalePricePerPacketPaise ?? 0) !== (updates.wholesalePricePerPacketPaise ?? 0);
  if (priceChanged)
    updates = { ...updates, priceHistory: [...(product.priceHistory ?? []), { date: new Date().toISOString().slice(0, 10), retailPricePaise: updates.pricePerPacketPaise, wholesalePricePaise: updates.wholesalePricePerPacketPaise ?? 0 }] };
  await updateDoc(doc(db, 'products', productId), updates as Record<string, unknown>);
  // Cascade product name into sale invoices
  if (updates.name && product.name !== updates.name) {
    const batch = writeBatch(db);
    data.saleInvoices.forEach(inv => {
      if (inv.lines.some(l => l.productId === productId)) {
        const updatedLines = inv.lines.map(l => l.productId === productId ? { ...l, productName: updates.name } : l);
        batch.update(doc(db, 'saleInvoices', inv.id), { lines: updatedLines });
      }
    });
    await batch.commit();
  }
}

export async function deleteProduct(data: InventoryData, productId: string): Promise<void> {
  if (data.saleInvoices.some(inv => inv.lines.some(l => l.productId === productId)))
    throw new Error('This product has sales history and cannot be deleted.');
  await deleteDoc(doc(db, 'products', productId));
}

// ========== PRODUCTION ==========
export async function addProductionBatch(input: Omit<ProductionBatch, 'id'>, data: InventoryData): Promise<ProductionBatch> {
  const batchId = id();
  const batch: ProductionBatch = { id: batchId, ...input };
  const wb = writeBatch(db);
  wb.set(doc(db, 'productionBatches', batchId), batch);
  // Deduct raw materials from items
  for (const mat of input.rawMaterials ?? [])
    wb.update(doc(db, 'items', mat.itemId), { quantity: increment(-mat.quantity) });
  // Create stock movements + update currentStockPieces
  for (const produced of input.productsProduced ?? []) {
    const count = data.products.find(p => p.productionItemId === produced.productionItemId)?.count ?? 1;
    const piecesProduced = Math.round(produced.quantity * count);
    if (piecesProduced > 0) {
      const smId = id();
      wb.set(doc(db, 'stockMovements', smId), { id: smId, date: input.date, productionItemId: produced.productionItemId, quantityPieces: piecesProduced, movementType: 'PRODUCTION', sourceId: batchId });
      wb.update(doc(db, 'productionItems', produced.productionItemId), { currentStockPieces: increment(piecesProduced) });
    }
  }
  await wb.commit();
  return batch;
}

export async function updateProductionBatch(batchId: string, input: Omit<ProductionBatch, 'id'>, data: InventoryData): Promise<void> {
  // Pre-fetch old stock movements (can't query inside transaction)
  const oldMovesSnap = await getDocs(query(col('stockMovements'), where('sourceId', '==', batchId)));
  const oldMoveIds = oldMovesSnap.docs.map(d => d.id);
  // Build old stock restore map from old movements
  const oldStockRestore: Record<string, number> = {};
  oldMovesSnap.docs.forEach(d => {
    const m = d.data() as StockMovement;
    oldStockRestore[m.productionItemId] = (oldStockRestore[m.productionItemId] ?? 0) + m.quantityPieces;
  });

  await runTransaction(db, async tx => {
    const batchSnap = await tx.get(doc(db, 'productionBatches', batchId));
    if (!batchSnap.exists()) throw new Error('Production batch not found.');
    const oldBatch = batchSnap.data() as ProductionBatch;

    // Restore old raw materials to items
    if (oldBatch.rawMaterials?.length) {
      for (const mat of oldBatch.rawMaterials)
        tx.update(doc(db, 'items', mat.itemId), { quantity: increment(mat.quantity) });
    } else {
      // Recipe fallback: restore from recipe ingredients
      const recipe = data.recipes.find(r => r.productionItemId === (oldBatch.productionItemId ?? ''));
      if (recipe) {
        for (const ing of recipe.ingredients)
          tx.update(doc(db, 'items', ing.itemId), { quantity: increment(ing.quantityPerUnit * (oldBatch.productionQuantity ?? 0)) });
      }
    }
    // Delete old stock movements + restore currentStockPieces
    for (const smId of oldMoveIds)
      tx.delete(doc(db, 'stockMovements', smId));
    for (const [piId, qty] of Object.entries(oldStockRestore))
      tx.update(doc(db, 'productionItems', piId), { currentStockPieces: increment(-qty) });

    // Apply new batch
    tx.set(doc(db, 'productionBatches', batchId), { id: batchId, ...input });
    // Deduct new materials
    for (const mat of input.rawMaterials ?? [])
      tx.update(doc(db, 'items', mat.itemId), { quantity: increment(-mat.quantity) });
    // Create new stock movements + update currentStockPieces
    for (const produced of input.productsProduced ?? []) {
      const count = data.products.find(p => p.productionItemId === produced.productionItemId)?.count ?? 1;
      const piecesProduced = Math.round(produced.quantity * count);
      if (piecesProduced > 0) {
        const smId = id();
        tx.set(doc(db, 'stockMovements', smId), { id: smId, date: input.date, productionItemId: produced.productionItemId, quantityPieces: piecesProduced, movementType: 'PRODUCTION', sourceId: batchId });
        tx.update(doc(db, 'productionItems', produced.productionItemId), { currentStockPieces: increment(piecesProduced) });
      }
    }
  });
}

export async function deleteProductionBatch(batchId: string, data: InventoryData): Promise<void> {
  const snap = await getDoc(doc(db, 'productionBatches', batchId));
  if (!snap.exists()) throw new Error('Production batch not found.');
  const batch = snap.data() as ProductionBatch;
  const oldMovesSnap = await getDocs(query(col('stockMovements'), where('sourceId', '==', batchId)));
  const wb = writeBatch(db);
  wb.delete(doc(db, 'productionBatches', batchId));
  // Restore raw materials
  if (batch.rawMaterials?.length) {
    for (const mat of batch.rawMaterials)
      wb.update(doc(db, 'items', mat.itemId), { quantity: increment(mat.quantity) });
  } else {
    const recipe = data.recipes.find(r => r.productionItemId === (batch.productionItemId ?? ''));
    if (recipe) {
      for (const ing of recipe.ingredients)
        wb.update(doc(db, 'items', ing.itemId), { quantity: increment(ing.quantityPerUnit * (batch.productionQuantity ?? 0)) });
    }
  }
  // Delete stock movements + restore currentStockPieces
  oldMovesSnap.docs.forEach(d => {
    const m = d.data() as StockMovement;
    wb.delete(d.ref);
    wb.update(doc(db, 'productionItems', m.productionItemId), { currentStockPieces: increment(-m.quantityPieces) });
  });
  await wb.commit();
}

export async function clearProductionHistory(): Promise<void> {
  const [batchSnap, movSnap, piSnap] = await Promise.all([
    getDocs(col('productionBatches')),
    getDocs(query(col('stockMovements'), where('movementType', '==', 'PRODUCTION'))),
    getDocs(col('productionItems')),
  ]);
  const allRefs = [...batchSnap.docs.map(d => d.ref), ...movSnap.docs.map(d => d.ref)];
  for (let i = 0; i < allRefs.length; i += 500) {
    const wb = writeBatch(db);
    allRefs.slice(i, i + 500).forEach(ref => wb.delete(ref));
    await wb.commit();
  }
  for (let i = 0; i < piSnap.docs.length; i += 500) {
    const wb = writeBatch(db);
    piSnap.docs.slice(i, i + 500).forEach(d => wb.update(d.ref, { currentStockPieces: 0 }));
    await wb.commit();
  }
}

// ========== CUSTOMERS ==========
export async function addCustomer(input: Omit<Customer, 'id' | 'outstandingPaise' | 'advancePaise'> & { previousBalancePaise?: number; previousAdvancePaise?: number }): Promise<Customer> {
  const { previousBalancePaise, previousAdvancePaise, ...rest } = input;
  const customer: Customer = { id: id(), ...rest, outstandingPaise: previousBalancePaise ?? 0, advancePaise: previousAdvancePaise ?? 0 };
  await setDoc(doc(db, 'customers', customer.id), customer);
  return customer;
}

export async function updateCustomer(customerId: string, updates: Partial<Omit<Customer, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'customers', customerId), updates as Record<string, unknown>);
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await deleteDoc(doc(db, 'customers', customerId));
}

// ========== SALES ==========
export async function postSale(input: Omit<SaleInvoice, 'id'>, products: Product[]): Promise<SaleInvoice> {
  const invoiceId = id();
  // Pre-compute needed pieces per productionItem (uses in-memory products — no extra Firestore read)
  const neededByPi: Record<string, number> = {};
  for (const line of input.lines) {
    const product = products.find(p => p.id === line.productId);
    if (product?.productionItemId)
      neededByPi[product.productionItemId] = (neededByPi[product.productionItemId] ?? 0) + line.quantityPackets * (product.piecesPerPacket ?? 1);
  }
  const piIds = Object.keys(neededByPi);

  return runTransaction(db, async tx => {
    const customerSnap = await tx.get(doc(db, 'customers', input.customerId));
    if (!customerSnap.exists()) throw new Error('Customer not found.');
    const customer = customerSnap.data() as Customer;
    // Read productionItems for stock check
    const piSnaps = await Promise.all(piIds.map(piId => tx.get(doc(db, 'productionItems', piId))));
    for (let i = 0; i < piIds.length; i++) {
      const pi = piSnaps[i].data() as ProductionItem;
      const available = pi.currentStockPieces ?? 0;
      const needed = neededByPi[piIds[i]];
      if (available < needed) throw new Error(`Insufficient stock for ${pi.name} (need ${needed} pcs, have ${available} pcs)`);
    }
    const invoice: SaleInvoice = { id: invoiceId, ...input };
    tx.set(doc(db, 'saleInvoices', invoiceId), invoice);
    // Create stock movements + decrement currentStockPieces
    for (const line of input.lines) {
      const product = products.find(p => p.id === line.productId);
      if (product?.productionItemId) {
        const qty = line.quantityPackets * (product.piecesPerPacket ?? 1);
        const smId = id();
        tx.set(doc(db, 'stockMovements', smId), { id: smId, date: input.date, productionItemId: product.productionItemId, quantityPieces: qty, movementType: 'SALE', sourceId: invoiceId });
        tx.update(doc(db, 'productionItems', product.productionItemId), { currentStockPieces: increment(-qty) });
      }
    }
    // Update customer balance
    const netDue = customer.outstandingPaise - customer.advancePaise + input.outstandingPaise;
    tx.update(doc(db, 'customers', input.customerId), { outstandingPaise: netDue >= 0 ? netDue : 0, advancePaise: netDue < 0 ? -netDue : 0 });
    return invoice;
  });
}

export async function updateSaleInvoice(invoiceId: string, input: Omit<SaleInvoice, 'id'>, products: Product[]): Promise<SaleInvoice> {
  // Pre-fetch old stock movements (can't query inside transaction)
  const oldMovesSnap = await getDocs(query(col('stockMovements'), where('sourceId', '==', invoiceId)));
  const oldMovStockMap: Record<string, number> = {};
  oldMovesSnap.docs.forEach(d => {
    const m = d.data() as StockMovement;
    oldMovStockMap[m.productionItemId] = (oldMovStockMap[m.productionItemId] ?? 0) + m.quantityPieces;
  });
  // Pre-compute new neededByPi
  const neededByPi: Record<string, number> = {};
  for (const line of input.lines) {
    const product = products.find(p => p.id === line.productId);
    if (product?.productionItemId)
      neededByPi[product.productionItemId] = (neededByPi[product.productionItemId] ?? 0) + line.quantityPackets * (product.piecesPerPacket ?? 1);
  }
  const piIds = Object.keys(neededByPi);

  return runTransaction(db, async tx => {
    const invoiceSnap = await tx.get(doc(db, 'saleInvoices', invoiceId));
    if (!invoiceSnap.exists()) throw new Error('Invoice not found.');
    const oldInv = invoiceSnap.data() as SaleInvoice;
    const customerSnap = await tx.get(doc(db, 'customers', oldInv.customerId));
    if (!customerSnap.exists()) throw new Error('Customer not found.');
    const customer = customerSnap.data() as Customer;
    // Read productionItems for stock check
    const piSnaps = await Promise.all(piIds.map(piId => tx.get(doc(db, 'productionItems', piId))));
    // Stock check: available + old stock being restored >= needed
    for (let i = 0; i < piIds.length; i++) {
      const pi = piSnaps[i].data() as ProductionItem;
      const available = (pi.currentStockPieces ?? 0) + (oldMovStockMap[piIds[i]] ?? 0);
      const needed = neededByPi[piIds[i]];
      if (available < needed) throw new Error(`Insufficient stock for ${pi.name} (need ${needed} pcs, have ${available} pcs)`);
    }
    // Reverse old customer balance
    const reversedNet = customer.outstandingPaise - customer.advancePaise - oldInv.outstandingPaise;
    const tempOut = reversedNet >= 0 ? reversedNet : 0;
    const tempAdv = reversedNet < 0 ? -reversedNet : 0;
    // Delete old stock movements + restore currentStockPieces
    oldMovesSnap.docs.forEach(d => tx.delete(d.ref));
    for (const [piId, qty] of Object.entries(oldMovStockMap))
      tx.update(doc(db, 'productionItems', piId), { currentStockPieces: increment(qty) });
    // Write updated invoice
    const updatedInvoice: SaleInvoice = { id: invoiceId, ...input };
    tx.set(doc(db, 'saleInvoices', invoiceId), updatedInvoice);
    // Create new stock movements + decrement
    for (const line of input.lines) {
      const product = products.find(p => p.id === line.productId);
      if (product?.productionItemId) {
        const qty = line.quantityPackets * (product.piecesPerPacket ?? 1);
        const smId = id();
        tx.set(doc(db, 'stockMovements', smId), { id: smId, date: input.date, productionItemId: product.productionItemId, quantityPieces: qty, movementType: 'SALE', sourceId: invoiceId });
        tx.update(doc(db, 'productionItems', product.productionItemId), { currentStockPieces: increment(-qty) });
      }
    }
    // Apply new customer balance
    const newNet = tempOut - tempAdv + input.outstandingPaise;
    tx.update(doc(db, 'customers', oldInv.customerId), { outstandingPaise: newNet >= 0 ? newNet : 0, advancePaise: newNet < 0 ? -newNet : 0 });
    return updatedInvoice;
  });
}

// ========== EMPLOYEES ==========
export async function addEmployee(input: Omit<Employee, 'id' | 'advancePaise' | 'duePaise'> & { openingAdvancePaise?: number; openingDuePaise?: number }): Promise<Employee> {
  const { openingAdvancePaise, openingDuePaise, ...rest } = input;
  const openingNet = (openingAdvancePaise ?? 0) - (openingDuePaise ?? 0);
  const employee: Employee = { id: id(), ...rest, advancePaise: openingNet > 0 ? openingNet : 0, duePaise: openingNet < 0 ? -openingNet : 0, openingAdvancePaise: openingNet > 0 ? openingNet : 0, openingDuePaise: openingNet < 0 ? -openingNet : 0 };
  await setDoc(doc(db, 'employees', employee.id), employee);
  return employee;
}

export async function updateEmployee(employeeId: string, updates: Partial<Omit<Employee, 'id'>>, data: InventoryData): Promise<void> {
  let finalUpdates = updates;
  if (updates.openingAdvancePaise !== undefined || updates.openingDuePaise !== undefined) {
    const employee = data.employees.find(e => e.id === employeeId);
    if (!employee) throw new Error('Employee not found.');
    const netPaise = computeEmployeeNetFromExpenses(data.expenses, employeeId);
    const openingNet = (updates.openingAdvancePaise ?? employee.openingAdvancePaise)
                     - (updates.openingDuePaise ?? employee.openingDuePaise);
    const totalNet = openingNet + netPaise;
    finalUpdates = { ...updates, openingAdvancePaise: openingNet > 0 ? openingNet : 0, openingDuePaise: openingNet < 0 ? -openingNet : 0, advancePaise: totalNet > 0 ? totalNet : 0, duePaise: totalNet < 0 ? -totalNet : 0 };
  }
  await updateDoc(doc(db, 'employees', employeeId), finalUpdates as Record<string, unknown>);
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  await deleteDoc(doc(db, 'employees', employeeId));
}

// ========== EXPENSES ==========
export async function addExpense(input: Omit<Expense, 'id'>): Promise<Expense> {
  const expense: Expense = { id: id(), ...input };
  const hasSalaryEffect = input.category === 'salary' && !!input.employeeId && input.actualAmountPaise !== undefined;
  if (hasSalaryEffect) {
    const diff = input.amountPaise - (input.actualAmountPaise as number);
    const empRef = doc(db, 'employees', input.employeeId as string);
    await runTransaction(db, async tx => {
      const empSnap = await tx.get(empRef);
      if (!empSnap.exists()) throw new Error('Employee not found.');
      const emp = empSnap.data() as Employee;
      tx.set(doc(db, 'expenses', expense.id), expense);
      const net = emp.advancePaise - emp.duePaise + diff;
      tx.update(empRef, { advancePaise: net > 0 ? net : 0, duePaise: net < 0 ? -net : 0 });
    });
  } else {
    await setDoc(doc(db, 'expenses', expense.id), expense);
  }
  return expense;
}

export async function updateExpense(expenseId: string, updates: Omit<Expense, 'id'>): Promise<void> {
  const oldSnap = await getDoc(doc(db, 'expenses', expenseId));
  if (!oldSnap.exists()) throw new Error('Expense not found.');
  const oldExp = oldSnap.data() as Expense;
  const oldHasSalary = oldExp.category === 'salary' && !!oldExp.employeeId && oldExp.actualAmountPaise !== undefined;
  const newHasSalary = updates.category === 'salary' && !!updates.employeeId && updates.actualAmountPaise !== undefined;
  if (oldHasSalary || newHasSalary) {
    const empId = (oldHasSalary ? oldExp.employeeId : updates.employeeId) as string;
    const empRef = doc(db, 'employees', empId);
    await runTransaction(db, async tx => {
      const empSnap = await tx.get(empRef);
      if (!empSnap.exists()) throw new Error('Employee not found.');
      const emp = empSnap.data() as Employee;
      let net = emp.advancePaise - emp.duePaise;
      if (oldHasSalary) net -= (oldExp.amountPaise - (oldExp.actualAmountPaise as number));
      if (newHasSalary) net += (updates.amountPaise - (updates.actualAmountPaise as number));
      tx.set(doc(db, 'expenses', expenseId), { id: expenseId, ...updates });
      tx.update(empRef, { advancePaise: net > 0 ? net : 0, duePaise: net < 0 ? -net : 0 });
    });
  } else {
    await setDoc(doc(db, 'expenses', expenseId), { id: expenseId, ...updates });
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'expenses', expenseId));
  if (!snap.exists()) throw new Error('Expense not found.');
  const expense = snap.data() as Expense;
  const hasSalaryEffect = expense.category === 'salary' && !!expense.employeeId && expense.actualAmountPaise !== undefined;
  if (hasSalaryEffect) {
    const diff = expense.amountPaise - (expense.actualAmountPaise as number);
    const empRef = doc(db, 'employees', expense.employeeId as string);
    await runTransaction(db, async tx => {
      const empSnap = await tx.get(empRef);
      if (!empSnap.exists()) throw new Error('Employee not found.');
      const emp = empSnap.data() as Employee;
      tx.delete(doc(db, 'expenses', expenseId));
      const net = emp.advancePaise - emp.duePaise - diff;
      tx.update(empRef, { advancePaise: net > 0 ? net : 0, duePaise: net < 0 ? -net : 0 });
    });
  } else {
    await deleteDoc(doc(db, 'expenses', expenseId));
  }
}

// ========== ADMIN ==========
export async function clearAllData(): Promise<void> {
  const colNames = COLLECTIONS as unknown as string[];
  const snaps = await Promise.all(colNames.map(name => getDocs(collection(db, name))));
  const allRefs = snaps.flatMap(snap => snap.docs.map(d => d.ref));
  for (let i = 0; i < allRefs.length; i += 500) {
    const wb = writeBatch(db);
    allRefs.slice(i, i + 500).forEach(ref => wb.delete(ref));
    await wb.commit();
  }
}
