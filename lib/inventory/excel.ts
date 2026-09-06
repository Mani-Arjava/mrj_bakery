import * as XLSX from 'xlsx';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { DashboardData, ExpenseInput, Item, Party, ProductionInput, PurchaseInput, SaleInput, StockBalance, Recipe, RecipeDetail, SupplierPaymentInput, CustomerPaymentInput, DailyClosingInput } from './types';

const file = join(process.cwd(), 'data', 'inventory.xlsx');
const tabs: Record<string, string[]> = {
  Suppliers: ['id','name','phone','contactPerson','address','active'],
  Customers: ['id','name','phone','contactPerson','address','customerType','active'],
  Items: ['id','name','type','baseUnit','reorderLevel','active'],
  Recipes: ['id','productId','materialId','quantity','unit','active'],
  PriceHistory: ['id','itemId','priceType','unit','pricePaise','effectiveFrom','active'],
  PurchaseInvoices: ['id','date','supplierId','billNumber','billAmountPaise','paidAmountPaise','note','status'],
  PurchaseLines: ['id','invoiceId','itemId','quantity','unit','unitPricePaise','totalPaise'],
  SupplierPayments: ['id','date','supplierId','invoiceId','amountPaise','type','note','status'],
  ProductionBatches: ['id','date','productId','plannedQuantity','quantityProduced','team','wastage','note','status'],
  ProductionConsumption: ['id','batchId','itemId','quantity','unit'],
  SalesInvoices: ['id','date','customerId','saleType','totalPaise','paidAmountPaise','note','status'],
  SalesLines: ['id','invoiceId','itemId','quantity','unit','unitPricePaise','totalPaise'],
  CustomerPayments: ['id','date','customerId','invoiceId','amountPaise','note','status'],
  Expenses: ['id','date','category','amountPaise','employeeOrTeam','employeeCount','note'],
  StockMovements: ['id','date','itemId','quantity','unit','direction','unitCostPaise','sourceType','sourceId','note'],
  DailyClosing: ['id','date','openingCashPaise','receipts','payments','systemClosingPaise','physicalCashPaise','variance','status','note'],
  AuditLog: ['id','timestamp','action','entityType','entityId','actor','idempotencyKey']
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v: unknown) => Number(v || 0);
const money = (v: unknown) => n(v);

function saveBook(book: XLSX.WorkBook) {
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, XLSX.write(book, { bookType: 'xlsx', type: 'buffer' }));
  renameSync(temporary, file);
}

function loadBook() {
  return XLSX.read(readFileSync(file), { type: 'buffer' });
}

function ensure() {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  if (!existsSync(file)) {
    const book = XLSX.utils.book_new();
    for (const [name, headers] of Object.entries(tabs)) {
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers]), name);
    }
    saveBook(book);
    return;
  }
  const book = loadBook();
  let changed = false;
  for (const [name, headers] of Object.entries(tabs)) {
    if (!book.SheetNames.includes(name)) {
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers]), name);
      changed = true;
    }
  }
  if (changed) saveBook(book);
}

function read(tab: string): Record<string, string>[] {
  ensure();
  const book = loadBook();
  const sheet = book.Sheets[tab];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
}

function write(tab: string, rows: Record<string, unknown>[]) {
  ensure();
  const book = loadBook();
  const headers = tabs[tab];
  book.Sheets[tab] = XLSX.utils.json_to_sheet(rows, { header: headers });
  if (!book.SheetNames.includes(tab)) XLSX.utils.book_append_sheet(book, book.Sheets[tab], tab);
  saveBook(book);
}

function append(tab: string, rows: Record<string, unknown>[]) {
  write(tab, [...read(tab), ...rows]);
}

export const sheetsConfigured = () => true;
export async function initializeWorkbook() {
  ensure();
  return { file };
}

const item = (r: Record<string, string>): Item => ({
  id: r.id,
  name: r.name,
  type: r.type as Item['type'],
  baseUnit: r.baseUnit,
  reorderLevel: n(r.reorderLevel),
  active: r.active !== 'false'
});

const party = (r: Record<string, string>, type: Party['type']): Party => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  contactPerson: r.contactPerson,
  address: r.address,
  type,
  customerType: r.customerType as Party['customerType']
});

export async function masterData() {
  return {
    suppliers: read('Suppliers').map(r => party(r, 'SUPPLIER')),
    customers: read('Customers').map(r => party(r, 'CUSTOMER')),
    items: read('Items').map(item).filter(row => row.active)
  };
}

export async function addMaster(kind: 'supplier'|'customer'|'item', input: Record<string, unknown>) {
  const id = randomUUID();
  const tab = kind === 'supplier' ? 'Suppliers' : kind === 'customer' ? 'Customers' : 'Items';
  append(tab, [{ id, ...input, active: 'true' }]);
  return id;
}

// ============= Recipe Management =============
export async function getRecipeForProduct(productId: string): Promise<RecipeDetail | null> {
  const recipes = read('Recipes').filter(r => r.productId === productId && r.active !== 'false');
  if (recipes.length === 0) return null;

  const master = await masterData();
  const itemMap = new Map(master.items.map(i => [i.id, i]));
  const product = master.items.find(i => i.id === productId);

  if (!product) return null;

  return {
    productId,
    productName: product.name,
    lines: recipes.map(r => ({
      materialId: r.materialId,
      materialName: itemMap.get(r.materialId)?.name || r.materialId,
      quantity: n(r.quantity),
      unit: r.unit
    }))
  };
}

export async function saveRecipe(productId: string, lines: Array<{ materialId: string; quantity: number; unit: string }>) {
  // Deactivate existing recipes for this product
  const existing = read('Recipes');
  write('Recipes', existing.map(r => r.productId === productId ? { ...r, active: 'false' } : r));

  // Add new recipe lines
  const newLines = lines.map(line => ({
    id: randomUUID(),
    productId,
    materialId: line.materialId,
    quantity: line.quantity,
    unit: line.unit,
    active: 'true'
  }));
  append('Recipes', newLines);
  await audit('CREATE', 'RECIPE', productId);
}

// ============= Stock Balance =============
async function balances() {
  const map = new Map<string, StockBalance>();
  for (const row of read('StockMovements')) {
    const b = map.get(row.itemId) || { itemId: row.itemId, quantity: 0, averageCostPaise: 0 };
    const q = n(row.quantity), cost = n(row.unitCostPaise);
    if (row.direction === 'IN') {
      const total = b.quantity + q;
      b.averageCostPaise = total ? Math.round((b.quantity * b.averageCostPaise + q * cost) / total) : 0;
      b.quantity = total;
    } else {
      b.quantity -= q;
    }
    map.set(row.itemId, b);
  }
  return map;
}

export async function getStockBalance(itemId: string): Promise<StockBalance> {
  const balances_map = await balances();
  return balances_map.get(itemId) || { itemId, quantity: 0, averageCostPaise: 0 };
}

async function audit(action: string, entityType: string, entityId: string) {
  append('AuditLog', [{
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    entityType,
    entityId,
    actor: 'admin',
    idempotencyKey: randomUUID()
  }]);
}

// ============= Transactions =============
export async function postPurchase(input: PurchaseInput) {
  const id = randomUUID();
  append('PurchaseInvoices', [{
    id,
    date: input.date,
    supplierId: input.supplierId,
    billNumber: input.billNumber || '',
    billAmountPaise: input.billAmountPaise,
    paidAmountPaise: input.paidAmountPaise,
    note: input.note || '',
    status: 'POSTED'
  }]);
  append('PurchaseLines', input.lines.map(line => ({
    id: randomUUID(),
    invoiceId: id,
    itemId: line.itemId,
    quantity: line.quantity,
    unit: line.unit,
    unitPricePaise: line.unitPricePaise,
    totalPaise: line.quantity * line.unitPricePaise
  })));
  append('StockMovements', input.lines.map(line => ({
    id: randomUUID(),
    date: input.date,
    itemId: line.itemId,
    quantity: line.quantity,
    unit: line.unit,
    direction: 'IN',
    unitCostPaise: line.unitPricePaise,
    sourceType: 'PURCHASE',
    sourceId: id,
    note: input.note || ''
  })));
  await audit('POST', 'PURCHASE', id);
  return { id, totalPaise: input.billAmountPaise, outstandingPaise: input.billAmountPaise - input.paidAmountPaise };
}

export async function postProduction(input: ProductionInput) {
  const id = randomUUID();
  const stock = await balances();
  let cost = 0;
  for (const line of input.consumption) {
    const b = stock.get(line.itemId);
    if (!b || b.quantity < line.quantity) {
      throw new Error(`Insufficient raw-material stock for ${line.itemId}. Required: ${line.quantity}, Available: ${b?.quantity || 0}`);
    }
    cost += line.quantity * b.averageCostPaise;
  }
  append('ProductionBatches', [{
    id,
    date: input.date,
    productId: input.productId,
    plannedQuantity: input.quantityProduced,
    quantityProduced: input.quantityProduced,
    team: input.team || '',
    wastage: 0,
    note: input.note || '',
    status: 'POSTED'
  }]);
  append('ProductionConsumption', input.consumption.map(line => ({
    id: randomUUID(),
    batchId: id,
    itemId: line.itemId,
    quantity: line.quantity,
    unit: line.unit
  })));
  append('StockMovements', [
    ...input.consumption.map(line => ({
      id: randomUUID(),
      date: input.date,
      itemId: line.itemId,
      quantity: line.quantity,
      unit: line.unit,
      direction: 'OUT',
      unitCostPaise: stock.get(line.itemId)!.averageCostPaise,
      sourceType: 'PRODUCTION',
      sourceId: id,
      note: input.note || ''
    })),
    {
      id: randomUUID(),
      date: input.date,
      itemId: input.productId,
      quantity: input.quantityProduced,
      unit: 'piece',
      direction: 'IN',
      unitCostPaise: input.quantityProduced ? Math.round(cost / input.quantityProduced) : 0,
      sourceType: 'PRODUCTION',
      sourceId: id,
      note: input.note || ''
    }
  ]);
  await audit('POST', 'PRODUCTION', id);
  return { id, costPaise: cost };
}

export async function postSale(input: SaleInput) {
  const id = randomUUID();
  const stock = await balances();
  const total = input.lines.reduce((s, line) => s + line.quantity * line.unitPricePaise, 0);
  for (const line of input.lines) {
    const b = stock.get(line.itemId);
    if (!b || b.quantity < line.quantity) {
      throw new Error(`Insufficient finished-goods stock for sale.`);
    }
  }
  append('SalesInvoices', [{
    id,
    date: input.date,
    customerId: input.customerId,
    saleType: input.saleType,
    totalPaise: total,
    paidAmountPaise: input.paidAmountPaise,
    note: input.note || '',
    status: 'POSTED'
  }]);
  append('SalesLines', input.lines.map(line => ({
    id: randomUUID(),
    invoiceId: id,
    itemId: line.itemId,
    quantity: line.quantity,
    unit: line.unit,
    unitPricePaise: line.unitPricePaise,
    totalPaise: line.quantity * line.unitPricePaise
  })));
  append('StockMovements', input.lines.map(line => ({
    id: randomUUID(),
    date: input.date,
    itemId: line.itemId,
    quantity: line.quantity,
    unit: line.unit,
    direction: 'OUT',
    unitCostPaise: stock.get(line.itemId)!.averageCostPaise,
    sourceType: 'SALE',
    sourceId: id,
    note: input.note || ''
  })));
  await audit('POST', 'SALE', id);
  return { id, totalPaise: total, outstandingPaise: total - input.paidAmountPaise };
}

export async function postExpense(input: ExpenseInput) {
  const id = randomUUID();
  append('Expenses', [{
    id,
    date: input.date,
    category: input.category,
    amountPaise: input.amountPaise,
    employeeOrTeam: input.employeeOrTeam || '',
    employeeCount: input.employeeCount || 0,
    note: input.note || ''
  }]);
  await audit('POST', 'EXPENSE', id);
  return { id };
}

// ============= Supplier Payments =============
export async function postSupplierPayment(input: SupplierPaymentInput) {
  const id = randomUUID();
  append('SupplierPayments', [{
    id,
    date: input.date,
    supplierId: input.supplierId,
    invoiceId: input.invoiceId || '',
    amountPaise: input.amountPaise,
    type: input.type,
    note: input.note || '',
    status: 'POSTED'
  }]);
  await audit('POST', 'SUPPLIER_PAYMENT', id);
  return { id };
}

export async function getSupplierLedger(supplierId: string) {
  const invoices = read('PurchaseInvoices').filter(r => r.supplierId === supplierId);
  const payments = read('SupplierPayments').filter(r => r.supplierId === supplierId);
  const lines = read('PurchaseLines');

  const purchases = invoices.map(inv => ({
    id: inv.id,
    date: inv.date,
    type: 'PURCHASE' as const,
    amountPaise: money(inv.billAmountPaise),
    note: inv.billNumber ? `Bill #${inv.billNumber}` : 'Purchase'
  }));

  const paymentEntries = payments.map(p => ({
    id: p.id,
    date: p.date,
    type: p.type === 'ADVANCE' ? 'ADVANCE' as const : 'PAYMENT' as const,
    amountPaise: -(money(p.amountPaise)),
    note: p.note || p.type
  }));

  const ledger = [...purchases, ...paymentEntries].sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;
  const withRunningBalance = ledger.map(entry => {
    balance += entry.amountPaise;
    return { ...entry, balancePaise: balance };
  });

  const totalPurchased = purchases.reduce((s, p) => s + p.amountPaise, 0);
  const totalPaid = payments.filter(p => p.type !== 'ADVANCE').reduce((s, p) => s + money(p.amountPaise), 0);
  const totalAdvance = payments.filter(p => p.type === 'ADVANCE').reduce((s, p) => s + money(p.amountPaise), 0);
  const outstanding = totalPurchased - totalPaid + totalAdvance;

  return { ledger: withRunningBalance, summary: { totalPurchased, totalPaid, totalAdvance, outstanding } };
}

// ============= Customer Payments =============
export async function postCustomerPayment(input: CustomerPaymentInput) {
  const id = randomUUID();
  append('CustomerPayments', [{
    id,
    date: input.date,
    customerId: input.customerId,
    invoiceId: input.invoiceId || '',
    amountPaise: input.amountPaise,
    note: input.note || '',
    status: 'POSTED'
  }]);
  await audit('POST', 'CUSTOMER_PAYMENT', id);
  return { id };
}

export async function getCustomerLedger(customerId: string) {
  const invoices = read('SalesInvoices').filter(r => r.customerId === customerId);
  const payments = read('CustomerPayments').filter(r => r.customerId === customerId);

  const sales = invoices.map(inv => ({
    id: inv.id,
    date: inv.date,
    type: 'SALE' as const,
    amountPaise: money(inv.totalPaise),
    note: `${inv.saleType} Sale`
  }));

  const paymentEntries = payments.map(p => ({
    id: p.id,
    date: p.date,
    type: 'PAYMENT' as const,
    amountPaise: -(money(p.amountPaise)),
    note: p.note || 'Payment'
  }));

  const ledger = [...sales, ...paymentEntries].sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;
  const withRunningBalance = ledger.map(entry => {
    balance += entry.amountPaise;
    return { ...entry, balancePaise: balance };
  });

  const totalSales = sales.reduce((s, p) => s + p.amountPaise, 0);
  const totalPaid = paymentEntries.reduce((s, p) => s + p.amountPaise, 0);
  const outstanding = totalSales + totalPaid; // totalPaid is negative

  return { ledger: withRunningBalance, summary: { totalSales, totalPaid: -totalPaid, outstanding } };
}

// ============= Daily Closing =============
export async function postDailyClosing(input: DailyClosingInput) {
  const id = randomUUID();
  
  const sales = read('SalesInvoices').filter(r => r.date === input.date);
  const expenses = read('Expenses').filter(r => r.date === input.date);
  const suppPayments = read('SupplierPayments').filter(r => r.date === input.date);
  const custPayments = read('CustomerPayments').filter(r => r.date === input.date);

  const receipts = sales.reduce((s, r) => s + money(r.paidAmountPaise), 0) + custPayments.reduce((s, r) => s + money(r.amountPaise), 0);
  const payments = expenses.reduce((s, e) => s + money(e.amountPaise), 0) + suppPayments.reduce((s, p) => s + money(p.amountPaise), 0);
  
  const previousClosing = read('DailyClosing').filter(r => r.date < input.date).sort((a, b) => b.date.localeCompare(a.date))[0];
  const openingCash = previousClosing ? money(previousClosing.systemClosingPaise) : 0;
  const systemClosing = openingCash + receipts - payments;
  const variance = input.physicalCashPaise - systemClosing;

  append('DailyClosing', [{
    id,
    date: input.date,
    openingCashPaise: openingCash,
    receipts,
    payments,
    systemClosingPaise: systemClosing,
    physicalCashPaise: input.physicalCashPaise,
    variance,
    status: 'CLOSED',
    note: input.note || ''
  }]);
  await audit('POST', 'DAILY_CLOSING', id);
  return { id, variance };
}

export async function getDailyClosingSummary(date: string) {
  const closing = read('DailyClosing').find(r => r.date === date);
  if (!closing) {
    const sales = read('SalesInvoices').filter(r => r.date === date);
    const expenses = read('Expenses').filter(r => r.date === date);
    const suppPayments = read('SupplierPayments').filter(r => r.date === date);
    const custPayments = read('CustomerPayments').filter(r => r.date === date);

    const receipts = sales.reduce((s, r) => s + money(r.paidAmountPaise), 0) + custPayments.reduce((s, r) => s + money(r.amountPaise), 0);
    const payments = expenses.reduce((s, e) => s + money(e.amountPaise), 0) + suppPayments.reduce((s, p) => s + money(p.amountPaise), 0);

    const previousClosing = read('DailyClosing').filter(r => r.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
    const openingCash = previousClosing ? money(previousClosing.systemClosingPaise) : 0;
    const systemClosing = openingCash + receipts - payments;

    return {
      date,
      openingCashPaise: openingCash,
      receiptsPaise: receipts,
      paymentsPaise: payments,
      systemClosingPaise: systemClosing,
      isClosed: false
    };
  }

  return {
    date,
    openingCashPaise: money(closing.openingCashPaise),
    receiptsPaise: money(closing.receipts),
    paymentsPaise: money(closing.payments),
    systemClosingPaise: money(closing.systemClosingPaise),
    physicalCashPaise: money(closing.physicalCashPaise),
    variancePaise: money(closing.variance),
    isClosed: true,
    note: closing.note
  };
}

// ============= History & Reports =============
export async function purchaseHistory(date: string) {
  const [invoices, lines, master] = await Promise.all([read('PurchaseInvoices'), read('PurchaseLines'), masterData()]);
  const names = new Map(master.items.map(i => [i.id, i.name]));
  const bills = invoices.filter(r => r.date === date).map(r => ({
    id: r.id,
    supplierId: r.supplierId,
    supplier: master.suppliers.find(s => s.id === r.supplierId)?.name || r.supplierId,
    billNumber: r.billNumber,
    billAmountPaise: money(r.billAmountPaise),
    paidAmountPaise: money(r.paidAmountPaise),
    pendingPaise: Math.max(0, money(r.billAmountPaise) - money(r.paidAmountPaise)),
    lines: lines.filter(l => l.invoiceId === r.id).map(l => ({
      name: names.get(l.itemId) || l.itemId,
      quantity: n(l.quantity),
      unit: l.unit,
      totalPaise: money(l.totalPaise)
    }))
  }));

  const supplierSummary = master.suppliers.map(supplier => {
    const own = invoices.filter(invoice => invoice.supplierId === supplier.id);
    return {
      supplierId: supplier.id,
      billCount: own.length,
      totalPaise: own.reduce((sum, invoice) => sum + money(invoice.billAmountPaise), 0),
      pendingPaise: own.reduce((sum, invoice) => sum + Math.max(0, money(invoice.billAmountPaise) - money(invoice.paidAmountPaise)), 0)
    };
  });

  return {
    bills,
    supplierSummary,
    summary: {
      totalPaise: bills.reduce((s, b) => s + b.billAmountPaise, 0),
      billCount: bills.length,
      overallOutstandingPaise: invoices.reduce((s, invoice) => s + Math.max(0, money(invoice.billAmountPaise) - money(invoice.paidAmountPaise)), 0),
      overallPurchasedPaise: invoices.reduce((s, invoice) => s + money(invoice.billAmountPaise), 0),
      overallBillCount: invoices.length
    }
  };
}

export async function dashboard(): Promise<DashboardData> {
  const master = await masterData();
  const stock = await balances();
  const raw = master.items.filter(i => i.type === 'RAW_MATERIAL');
  const lowStock = raw.map(i => ({
    item: i,
    quantity: stock.get(i.id)?.quantity || 0
  })).filter(r => r.quantity <= r.item.reorderLevel);

  const purchases = read('PurchaseInvoices');
  const sales = read('SalesInvoices');
  const expenses = read('Expenses');
  const production = read('ProductionBatches');
  const d = today();

  const purchase = purchases.filter(r => r.date === d).reduce((s, r) => s + money(r.billAmountPaise), 0);
  const sale = sales.filter(r => r.date === d).reduce((s, r) => s + money(r.totalPaise), 0);
  const expense = expenses.filter(r => r.date === d).reduce((s, r) => s + money(r.amountPaise), 0);

  return {
    generatedAt: new Date().toISOString(),
    configured: true,
    cards: {
      rawMaterialValuePaise: raw.reduce((s, i) => s + (stock.get(i.id)?.quantity || 0) * (stock.get(i.id)?.averageCostPaise || 0), 0),
      lowStockCount: lowStock.length,
      todayPurchasePaise: purchase,
      todayProductionUnits: production.filter(r => r.date === d).reduce((s, r) => s + n(r.quantityProduced), 0),
      todaySalesPaise: sale,
      supplierOutstandingPaise: purchases.reduce((s, r) => s + Math.max(0, money(r.billAmountPaise) - money(r.paidAmountPaise)), 0),
      customerOutstandingPaise: sales.reduce((s, r) => s + Math.max(0, money(r.totalPaise) - money(r.paidAmountPaise)), 0),
      todayExpensePaise: expense,
      todayProfitPaise: sale - expense
    },
    lowStock,
    topProducts: [],
    recentActivity: []
  };
}


// ============= Reports =============
export async function getSupplierAnalysis(dateStart?: string, dateEnd?: string) {
  const master = await masterData();
  const purchases = read('PurchaseInvoices');
  const payments = read('SupplierPayments');

  return master.suppliers.map(supplier => {
    const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id);
    const supplierPayments = payments.filter(p => p.supplierId === supplier.id);
    const totalPurchased = supplierPurchases.reduce((s, p) => s + money(p.billAmountPaise), 0);
    const totalPaid = supplierPayments.filter(p => p.type !== 'ADVANCE').reduce((s, p) => s + money(p.amountPaise), 0);
    const totalAdvance = supplierPayments.filter(p => p.type === 'ADVANCE').reduce((s, p) => s + money(p.amountPaise), 0);
    
    return {
      supplierId: supplier.id,
      name: supplier.name,
      totalPurchased,
      totalPaid,
      totalAdvance,
      outstanding: totalPurchased - totalPaid + totalAdvance,
      billCount: supplierPurchases.length
    };
  }).filter(s => s.billCount > 0);
}

export async function getCustomerAnalysis(dateStart?: string, dateEnd?: string) {
  const master = await masterData();
  const sales = read('SalesInvoices');
  const payments = read('CustomerPayments');

  return master.customers.map(customer => {
    const customerSales = sales.filter(s => s.customerId === customer.id);
    const customerPayments = payments.filter(p => p.customerId === customer.id);
    const totalSales = customerSales.reduce((s, sale) => s + money(sale.totalPaise), 0);
    const totalPaid = customerPayments.reduce((s, p) => s + money(p.amountPaise), 0);
    
    return {
      customerId: customer.id,
      name: customer.name,
      customerType: customer.customerType,
      totalSales,
      totalPaid,
      outstanding: totalSales - totalPaid,
      invoiceCount: customerSales.length
    };
  }).filter(c => c.invoiceCount > 0);
}

export async function getStockReport() {
  const master = await masterData();
  const stock = await balances();
  
  return master.items.map(item => ({
    itemId: item.id,
    name: item.name,
    type: item.type,
    unit: item.baseUnit,
    quantity: stock.get(item.id)?.quantity || 0,
    averageCost: stock.get(item.id)?.averageCostPaise || 0,
    value: (stock.get(item.id)?.quantity || 0) * (stock.get(item.id)?.averageCostPaise || 0),
    reorderLevel: item.reorderLevel,
    status: (stock.get(item.id)?.quantity || 0) <= item.reorderLevel ? 'LOW' : 'OK'
  }));
}

export async function getExpenseReport(dateStart?: string, dateEnd?: string) {
  const expenses = read('Expenses');
  const categoryTotals = new Map<string, number>();
  let grandTotal = 0;

  for (const expense of expenses) {
    if (dateStart && expense.date < dateStart) continue;
    if (dateEnd && expense.date > dateEnd) continue;
    
    const amount = money(expense.amountPaise);
    categoryTotals.set(
      expense.category,
      (categoryTotals.get(expense.category) || 0) + amount
    );
    grandTotal += amount;
  }

  return {
    byCategory: Array.from(categoryTotals.entries()).map(([category, total]) => ({
      category,
      amountPaise: total
    })),
    grandTotalPaise: grandTotal,
    dateRange: { start: dateStart, end: dateEnd }
  };
}

export async function getProfitAnalysis(dateStart?: string, dateEnd?: string) {
  const sales = read('SalesInvoices');
  const expenses = read('Expenses');
  const productions = read('ProductionBatches');
  const stock = await balances();

  let totalSales = 0;
  let totalExpenses = 0;
  let totalProductionCost = 0;

  for (const sale of sales) {
    if (dateStart && sale.date < dateStart) continue;
    if (dateEnd && sale.date > dateEnd) continue;
    totalSales += money(sale.totalPaise);
  }

  for (const expense of expenses) {
    if (dateStart && expense.date < dateStart) continue;
    if (dateEnd && expense.date > dateEnd) continue;
    totalExpenses += money(expense.amountPaise);
  }

  for (const prod of productions) {
    if (dateStart && prod.date < dateStart) continue;
    if (dateEnd && prod.date > dateEnd) continue;
    // Estimated based on current average costs
    totalProductionCost += 0; // Would need actual consumption costs
  }

  const profit = totalSales - totalExpenses;

  return {
    totalSalesPaise: totalSales,
    totalExpensesPaise: totalExpenses,
    totalProductionCostPaise: totalProductionCost,
    estimatedProfitPaise: profit,
    marginPercent: totalSales > 0 ? Math.round((profit / totalSales) * 100) : 0
  };
}


// ============= Export & Backup =============
export async function exportToExcel() {
  ensure();
  const fileBuffer = readFileSync(file);
  return fileBuffer;
}

export async function backupData() {
  ensure();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = join(process.cwd(), 'data', `backup-${timestamp}.xlsx`);
  const fileBuffer = readFileSync(file);
  writeFileSync(backupPath, fileBuffer);
  return { backupPath, timestamp };
}

export async function importFromExcel(buffer: Buffer) {
  try {
    const book = XLSX.read(buffer, { type: 'buffer' });
    const tempFile = `${file}.import`;
    writeFileSync(tempFile, XLSX.write(book, { bookType: 'xlsx', type: 'buffer' }));
    renameSync(tempFile, file);
    return { success: true, message: 'Data imported successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Import failed' };
  }
}
