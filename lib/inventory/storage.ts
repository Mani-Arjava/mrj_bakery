// Browser-based storage using localStorage (NO BACKEND NEEDED)
// All data persists locally in the browser
// Can be exported as JSON backup and imported

const STORAGE_KEY = 'bakery_inventory_data';

export interface StorageData {
  suppliers: Array<Record<string, any>>;
  customers: Array<Record<string, any>>;
  items: Array<Record<string, any>>;
  recipes: Array<Record<string, any>>;
  purchaseInvoices: Array<Record<string, any>>;
  purchaseLines: Array<Record<string, any>>;
  supplierPayments: Array<Record<string, any>>;
  productionBatches: Array<Record<string, any>>;
  productionConsumption: Array<Record<string, any>>;
  salesInvoices: Array<Record<string, any>>;
  salesLines: Array<Record<string, any>>;
  customerPayments: Array<Record<string, any>>;
  expenses: Array<Record<string, any>>;
  stockMovements: Array<Record<string, any>>;
  dailyClosing: Array<Record<string, any>>;
  auditLog: Array<Record<string, any>>;
}

const defaultData: StorageData = {
  suppliers: [],
  customers: [],
  items: [],
  recipes: [],
  purchaseInvoices: [],
  purchaseLines: [],
  supplierPayments: [],
  productionBatches: [],
  productionConsumption: [],
  salesInvoices: [],
  salesLines: [],
  customerPayments: [],
  expenses: [],
  stockMovements: [],
  dailyClosing: [],
  auditLog: []
};

function getId() {
  return Math.random().toString(36).substr(2, 9);
}

export function initStorage() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  }
}

export function clearData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  initStorage();
}

export function getData(): StorageData {
  if (typeof window === 'undefined') return defaultData;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    initStorage();
    return defaultData;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return defaultData;
  }
}

export function saveData(data: StorageData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ============= Master Data Operations =============
export function addMaster(kind: 'supplier' | 'customer' | 'item', input: Record<string, any>) {
  const data = getData();
  const id = getId();
  const tab = kind === 'supplier' ? 'suppliers' : kind === 'customer' ? 'customers' : 'items';
  const record = { id, ...input, active: true };
  (data[tab as keyof StorageData] as any[]).push(record);
  saveData(data);
  return id;
}

export function getMasterData() {
  const data = getData();
  return {
    suppliers: data.suppliers.filter(s => s.active),
    customers: data.customers.filter(c => c.active),
    items: data.items.filter(i => i.active)
  };
}

// ============= Stock Operations =============
export function getStockBalance(itemId: string) {
  const data = getData();
  const movements = data.stockMovements.filter(m => m.itemId === itemId);
  let quantity = 0, averageCostPaise = 0;

  for (const m of movements) {
    const q = Number(m.quantity || 0);
    const cost = Number(m.unitCostPaise || 0);
    if (m.direction === 'IN') {
      const total = quantity + q;
      averageCostPaise = total ? Math.round((quantity * averageCostPaise + q * cost) / total) : 0;
      quantity = total;
    } else {
      quantity -= q;
    }
  }

  return { itemId, quantity, averageCostPaise };
}

// ============= Recipe Operations =============
export function getRecipeForProduct(productId: string) {
  const data = getData();
  const recipes = data.recipes.filter(r => r.productId === productId && r.active !== false);
  if (!recipes.length) return null;

  const master = getMasterData();
  const itemMap = new Map(master.items.map(i => [i.id, i]));
  const product = master.items.find(i => i.id === productId);

  if (!product) return null;

  return {
    productId,
    productName: product.name,
    lines: recipes.map(r => ({
      materialId: r.materialId,
      materialName: itemMap.get(r.materialId)?.name || r.materialId,
      quantity: r.quantity,
      unit: r.unit
    }))
  };
}

export function saveRecipe(productId: string, lines: Array<{ materialId: string; quantity: number; unit: string }>) {
  const data = getData();
  // Deactivate old recipes
  data.recipes = data.recipes.map(r => r.productId === productId ? { ...r, active: false } : r);
  // Add new recipes
  lines.forEach(line => {
    data.recipes.push({
      id: getId(),
      productId,
      materialId: line.materialId,
      quantity: line.quantity,
      unit: line.unit,
      active: true
    });
  });
  saveData(data);
  logAudit('CREATE', 'RECIPE', productId);
}

// ============= Transactions =============
export function postPurchase(input: any) {
  const data = getData();
  const id = getId();

  data.purchaseInvoices.push({
    id,
    date: input.date,
    supplierId: input.supplierId,
    billNumber: input.billNumber || '',
    billAmountPaise: input.billAmountPaise,
    paidAmountPaise: input.paidAmountPaise,
    note: input.note || '',
    status: 'POSTED'
  });

  input.lines.forEach((line: any) => {
    data.purchaseLines.push({
      id: getId(),
      invoiceId: id,
      itemId: line.itemId,
      quantity: line.quantity,
      unit: line.unit,
      unitPricePaise: line.unitPricePaise,
      totalPaise: line.quantity * line.unitPricePaise
    });

    data.stockMovements.push({
      id: getId(),
      date: input.date,
      itemId: line.itemId,
      quantity: line.quantity,
      unit: line.unit,
      direction: 'IN',
      unitCostPaise: line.unitPricePaise,
      sourceType: 'PURCHASE',
      sourceId: id,
      note: input.note || ''
    });
  });

  saveData(data);
  logAudit('POST', 'PURCHASE', id);
  return { id, totalPaise: input.billAmountPaise, outstandingPaise: input.billAmountPaise - input.paidAmountPaise };
}

export function postProduction(input: any) {
  const data = getData();
  const id = getId();
  const stock = getStockBalance;

  let cost = 0;
  for (const line of input.consumption) {
    const b = getStockBalance(line.itemId);
    if (b.quantity < line.quantity) {
      throw new Error(`Insufficient stock for ${line.itemId}`);
    }
    cost += line.quantity * b.averageCostPaise;
  }

  data.productionBatches.push({
    id,
    date: input.date,
    productId: input.productId,
    plannedQuantity: input.quantityProduced,
    quantityProduced: input.quantityProduced,
    team: input.team || '',
    wastage: 0,
    note: input.note || '',
    status: 'POSTED'
  });

  input.consumption.forEach((line: any) => {
    data.productionConsumption.push({
      id: getId(),
      batchId: id,
      itemId: line.itemId,
      quantity: line.quantity,
      unit: line.unit
    });

    data.stockMovements.push({
      id: getId(),
      date: input.date,
      itemId: line.itemId,
      quantity: line.quantity,
      unit: line.unit,
      direction: 'OUT',
      unitCostPaise: getStockBalance(line.itemId).averageCostPaise,
      sourceType: 'PRODUCTION',
      sourceId: id,
      note: input.note || ''
    });
  });

  data.stockMovements.push({
    id: getId(),
    date: input.date,
    itemId: input.productId,
    quantity: input.quantityProduced,
    unit: 'piece',
    direction: 'IN',
    unitCostPaise: input.quantityProduced ? Math.round(cost / input.quantityProduced) : 0,
    sourceType: 'PRODUCTION',
    sourceId: id,
    note: input.note || ''
  });

  saveData(data);
  logAudit('POST', 'PRODUCTION', id);
  return { id, costPaise: cost };
}

export function postSale(input: any) {
  const data = getData();
  const id = getId();
  const total = input.lines.reduce((s: number, line: any) => s + line.quantity * line.unitPricePaise, 0);

  for (const line of input.lines) {
    const b = getStockBalance(line.itemId);
    if (b.quantity < line.quantity) {
      throw new Error('Insufficient stock');
    }
  }

  data.salesInvoices.push({
    id,
    date: input.date,
    customerId: input.customerId,
    saleType: input.saleType,
    totalPaise: total,
    paidAmountPaise: input.paidAmountPaise,
    note: input.note || '',
    status: 'POSTED'
  });

  input.lines.forEach((line: any) => {
    data.salesLines.push({
      id: getId(),
      invoiceId: id,
      itemId: line.itemId,
      quantity: line.quantity,
      unit: line.unit,
      unitPricePaise: line.unitPricePaise,
      totalPaise: line.quantity * line.unitPricePaise
    });

    data.stockMovements.push({
      id: getId(),
      date: input.date,
      itemId: line.itemId,
      quantity: line.quantity,
      unit: line.unit,
      direction: 'OUT',
      unitCostPaise: getStockBalance(line.itemId).averageCostPaise,
      sourceType: 'SALE',
      sourceId: id,
      note: input.note || ''
    });
  });

  saveData(data);
  logAudit('POST', 'SALE', id);
  return { id, totalPaise: total, outstandingPaise: total - input.paidAmountPaise };
}

export function postExpense(input: any) {
  const data = getData();
  const id = getId();
  data.expenses.push({
    id,
    date: input.date,
    category: input.category,
    amountPaise: input.amountPaise,
    employeeOrTeam: input.employeeOrTeam || '',
    employeeCount: input.employeeCount || 0,
    note: input.note || ''
  });
  saveData(data);
  logAudit('POST', 'EXPENSE', id);
  return { id };
}

// ============= Payment Operations =============
export function postSupplierPayment(input: any) {
  const data = getData();
  const id = getId();
  data.supplierPayments.push({
    id,
    date: input.date,
    supplierId: input.supplierId,
    invoiceId: input.invoiceId || '',
    amountPaise: input.amountPaise,
    type: input.type,
    note: input.note || '',
    status: 'POSTED'
  });
  saveData(data);
  logAudit('POST', 'SUPPLIER_PAYMENT', id);
  return { id };
}

export function getSupplierLedger(supplierId: string) {
  const data = getData();
  const invoices = data.purchaseInvoices.filter(r => r.supplierId === supplierId);
  const payments = data.supplierPayments.filter(r => r.supplierId === supplierId);

  const purchases = invoices.map(inv => ({
    id: inv.id,
    date: inv.date,
    type: 'PURCHASE',
    amountPaise: Number(inv.billAmountPaise),
    note: inv.billNumber ? `Bill #${inv.billNumber}` : 'Purchase'
  }));

  const paymentEntries = payments.map(p => ({
    id: p.id,
    date: p.date,
    type: p.type === 'ADVANCE' ? 'ADVANCE' : 'PAYMENT',
    amountPaise: -Number(p.amountPaise),
    note: p.note || p.type
  }));

  const ledger = [...purchases, ...paymentEntries].sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;
  const withRunningBalance = ledger.map(entry => {
    balance += entry.amountPaise;
    return { ...entry, balancePaise: balance };
  });

  const totalPurchased = purchases.reduce((s, p) => s + p.amountPaise, 0);
  const totalPaid = payments.filter(p => p.type !== 'ADVANCE').reduce((s, p) => s + Number(p.amountPaise), 0);
  const totalAdvance = payments.filter(p => p.type === 'ADVANCE').reduce((s, p) => s + Number(p.amountPaise), 0);

  return {
    ledger: withRunningBalance,
    summary: { totalPurchased, totalPaid, totalAdvance, outstanding: totalPurchased - totalPaid + totalAdvance }
  };
}

export function postCustomerPayment(input: any) {
  const data = getData();
  const id = getId();
  data.customerPayments.push({
    id,
    date: input.date,
    customerId: input.customerId,
    invoiceId: input.invoiceId || '',
    amountPaise: input.amountPaise,
    note: input.note || '',
    status: 'POSTED'
  });
  saveData(data);
  logAudit('POST', 'CUSTOMER_PAYMENT', id);
  return { id };
}

export function getCustomerLedger(customerId: string) {
  const data = getData();
  const invoices = data.salesInvoices.filter(r => r.customerId === customerId);
  const payments = data.customerPayments.filter(r => r.customerId === customerId);

  const sales = invoices.map(inv => ({
    id: inv.id,
    date: inv.date,
    type: 'SALE',
    amountPaise: Number(inv.totalPaise),
    note: `${inv.saleType} Sale`
  }));

  const paymentEntries = payments.map(p => ({
    id: p.id,
    date: p.date,
    type: 'PAYMENT',
    amountPaise: -Number(p.amountPaise),
    note: p.note || 'Payment'
  }));

  const ledger = [...sales, ...paymentEntries].sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;
  const withRunningBalance = ledger.map(entry => {
    balance += entry.amountPaise;
    return { ...entry, balancePaise: balance };
  });

  const totalSales = sales.reduce((s, p) => s + p.amountPaise, 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amountPaise), 0);

  return {
    ledger: withRunningBalance,
    summary: { totalSales, totalPaid, outstanding: totalSales - totalPaid }
  };
}

// ============= Daily Closing =============
export function postDailyClosing(input: any) {
  const data = getData();
  const id = getId();
  const today = input.date;

  const sales = data.salesInvoices.filter(r => r.date === today);
  const expenses = data.expenses.filter(r => r.date === today);
  const suppPayments = data.supplierPayments.filter(r => r.date === today);
  const custPayments = data.customerPayments.filter(r => r.date === today);

  const receipts = sales.reduce((s: number, r: any) => s + Number(r.paidAmountPaise), 0) + custPayments.reduce((s: number, r: any) => s + Number(r.amountPaise), 0);
  const payments = expenses.reduce((s: number, e: any) => s + Number(e.amountPaise), 0) + suppPayments.reduce((s: number, p: any) => s + Number(p.amountPaise), 0);

  const previousClosing = data.dailyClosing.filter((r: any) => r.date < today).sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
  const openingCash = previousClosing ? Number(previousClosing.systemClosingPaise) : 0;
  const systemClosing = openingCash + receipts - payments;
  const variance = input.physicalCashPaise - systemClosing;

  data.dailyClosing.push({
    id,
    date: today,
    openingCashPaise: openingCash,
    receipts,
    payments,
    systemClosingPaise: systemClosing,
    physicalCashPaise: input.physicalCashPaise,
    variance,
    status: 'CLOSED',
    note: input.note || ''
  });

  saveData(data);
  logAudit('POST', 'DAILY_CLOSING', id);
  return { id, variance };
}

export function getDailyClosingSummary(date: string) {
  const data = getData();
  const closing = data.dailyClosing.find(r => r.date === date);

  if (!closing) {
    const sales = data.salesInvoices.filter(r => r.date === date);
    const expenses = data.expenses.filter(r => r.date === date);
    const suppPayments = data.supplierPayments.filter(r => r.date === date);
    const custPayments = data.customerPayments.filter(r => r.date === date);

    const receipts = sales.reduce((s: number, r: any) => s + Number(r.paidAmountPaise), 0) + custPayments.reduce((s: number, r: any) => s + Number(r.amountPaise), 0);
    const payments = expenses.reduce((s: number, e: any) => s + Number(e.amountPaise), 0) + suppPayments.reduce((s: number, p: any) => s + Number(p.amountPaise), 0);

    const previousClosing = data.dailyClosing.filter((r: any) => r.date < date).sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
    const openingCash = previousClosing ? Number(previousClosing.systemClosingPaise) : 0;
    const systemClosing = openingCash + receipts - payments;

    return { date, openingCashPaise: openingCash, receiptsPaise: receipts, paymentsPaise: payments, systemClosingPaise: systemClosing, isClosed: false };
  }

  return {
    date,
    openingCashPaise: Number(closing.openingCashPaise),
    receiptsPaise: Number(closing.receipts),
    paymentsPaise: Number(closing.payments),
    systemClosingPaise: Number(closing.systemClosingPaise),
    physicalCashPaise: Number(closing.physicalCashPaise),
    variancePaise: Number(closing.variance),
    isClosed: true,
    note: closing.note
  };
}

// ============= Dashboard =============
export function getDashboard() {
  const data = getData();
  const master = getMasterData();
  const d = new Date().toISOString().slice(0, 10);

  const stock = new Map();
  for (const item of master.items) {
    stock.set(item.id, getStockBalance(item.id));
  }

  const raw = master.items.filter(i => i.type === 'RAW_MATERIAL');
  const lowStock = raw.map(i => ({ item: i, quantity: stock.get(i.id)?.quantity || 0 })).filter(r => r.quantity <= r.item.reorderLevel);

  const purchases = data.purchaseInvoices.filter(r => r.date === d);
  const sales = data.salesInvoices.filter(r => r.date === d);
  const expenses = data.expenses.filter(r => r.date === d);
  const production = data.productionBatches.filter(r => r.date === d);

  const purchase = purchases.reduce((s: number, r: any) => s + Number(r.billAmountPaise), 0);
  const sale = sales.reduce((s: number, r: any) => s + Number(r.totalPaise), 0);
  const expense = expenses.reduce((s: number, r: any) => s + Number(r.amountPaise), 0);

  // All-time supplier outstanding
  const totalPurchased = data.purchaseInvoices.reduce((s: number, r: any) => s + Number(r.billAmountPaise), 0);
  const totalSupplierPaid = data.supplierPayments.reduce((s: number, r: any) => s + Number(r.amountPaise), 0);
  const supplierOutstanding = totalPurchased - totalSupplierPaid;

  // All-time customer outstanding
  const totalSales = data.salesInvoices.reduce((s: number, r: any) => s + Number(r.totalPaise), 0);
  const totalCustomerPaid = data.customerPayments.reduce((s: number, r: any) => s + Number(r.amountPaise), 0);
  const customerOutstanding = totalSales - totalCustomerPaid;

  // Top products by quantity sold
  const productSales = new Map<string, number>();
  for (const line of data.salesLines) {
    productSales.set(line.itemId, (productSales.get(line.itemId) || 0) + Number(line.quantity));
  }
  const topProducts = Array.from(productSales.entries())
    .map(([itemId, qty]) => {
      const item = master.items.find(i => i.id === itemId);
      return { item: item || { id: itemId, name: itemId }, quantity: qty };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    generatedAt: new Date().toISOString(),
    configured: true,
    cards: {
      rawMaterialValuePaise: raw.reduce((s, i) => s + (stock.get(i.id)?.quantity || 0) * (stock.get(i.id)?.averageCostPaise || 0), 0),
      lowStockCount: lowStock.length,
      todayPurchasePaise: purchase,
      todayProductionUnits: production.reduce((s: number, r: any) => s + Number(r.quantityProduced), 0),
      todaySalesPaise: sale,
      supplierOutstandingPaise: supplierOutstanding,
      customerOutstandingPaise: customerOutstanding,
      todayExpensePaise: expense,
      todayProfitPaise: sale - expense
    },
    lowStock,
    topProducts,
    recentActivity: []
  };
}

// ============= Audit =============
export function logAudit(action: string, entityType: string, entityId: string) {
  const data = getData();
  data.auditLog.push({
    id: getId(),
    timestamp: new Date().toISOString(),
    action,
    entityType,
    entityId,
    actor: 'admin',
    idempotencyKey: getId()
  });
  saveData(data);
}

// ============= Reports =============
export function getStockReport() {
  const data = getData();
  const master = getMasterData();

  return master.items.map(item => {
    const bal = getStockBalance(item.id);
    const value = bal.quantity * bal.averageCostPaise;
    const status = bal.quantity <= item.reorderLevel ? 'LOW' : 'OK';
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      quantity: bal.quantity,
      unit: item.baseUnit,
      value,
      status,
      reorderLevel: item.reorderLevel
    };
  });
}

export function getSupplierAnalysis() {
  const data = getData();
  const master = getMasterData();

  return master.suppliers.map(supplier => {
    const invoices = data.purchaseInvoices.filter(p => p.supplierId === supplier.id);
    const payments = data.supplierPayments.filter(p => p.supplierId === supplier.id);

    const totalPurchased = invoices.reduce((s, p) => s + Number(p.billAmountPaise), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amountPaise), 0);
    const outstanding = totalPurchased - totalPaid;

    return {
      id: supplier.id,
      name: supplier.name,
      totalPurchased,
      totalPaid,
      outstanding
    };
  });
}

export function getCustomerAnalysis() {
  const data = getData();
  const master = getMasterData();

  return master.customers.map(customer => {
    const invoices = data.salesInvoices.filter(s => s.customerId === customer.id);
    const payments = data.customerPayments.filter(p => p.customerId === customer.id);

    const totalSales = invoices.reduce((s, inv) => s + Number(inv.totalPaise), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amountPaise), 0);
    const outstanding = totalSales - totalPaid;

    return {
      id: customer.id,
      name: customer.name,
      customerType: customer.customerType || 'RETAIL',
      totalSales,
      totalPaid,
      outstanding
    };
  });
}

export function getExpenseReport() {
  const data = getData();
  const categories = new Map<string, number>();

  for (const expense of data.expenses) {
    const cat = expense.category || 'Other';
    categories.set(cat, (categories.get(cat) || 0) + Number(expense.amountPaise));
  }

  const byCategory = Array.from(categories.entries())
    .map(([category, amountPaise]) => ({ category, amountPaise }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  const grandTotalPaise = byCategory.reduce((s, c) => s + c.amountPaise, 0);

  return { byCategory, grandTotalPaise };
}

export function getProfitReport() {
  const data = getData();

  const totalSalesPaise = data.salesInvoices.reduce((s, inv) => s + Number(inv.totalPaise), 0);
  const totalExpensesPaise = data.expenses.reduce((s, exp) => s + Number(exp.amountPaise), 0);
  const estimatedProfitPaise = totalSalesPaise - totalExpensesPaise;
  const marginPercent = totalSalesPaise ? Math.round((estimatedProfitPaise / totalSalesPaise) * 100) : 0;

  return { totalSalesPaise, totalExpensesPaise, estimatedProfitPaise, marginPercent };
}

// ============= Export/Import =============
export function exportJSON() {
  const data = getData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bakery-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as StorageData;
        saveData(data);
        resolve(true);
      } catch {
        resolve(false);
      }
    };
    reader.readAsText(file);
  });
}
