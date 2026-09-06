export type ItemType = 'RAW_MATERIAL' | 'FINISHED_GOOD';
export type SaleType = 'RETAIL' | 'WHOLESALE';

export type Item = { id: string; name: string; type: ItemType; baseUnit: string; reorderLevel: number; active: boolean };
export type Party = { id: string; name: string; phone?: string; contactPerson?: string; address?: string; type: 'SUPPLIER' | 'CUSTOMER'; customerType?: SaleType };
export type StockBalance = { itemId: string; quantity: number; averageCostPaise: number };
export type Recipe = { id: string; productId: string; materialId: string; quantity: number; unit: string; active: boolean };
export type RecipeDetail = { productId: string; productName: string; lines: Array<{ materialId: string; materialName: string; quantity: number; unit: string }> };

export type DashboardData = {
  generatedAt: string;
  configured: boolean;
  cards: { rawMaterialValuePaise: number; lowStockCount: number; todayPurchasePaise: number; todayProductionUnits: number; todaySalesPaise: number; supplierOutstandingPaise: number; customerOutstandingPaise: number; todayExpensePaise: number; todayProfitPaise: number };
  lowStock: Array<{ item: Item; quantity: number }>;
  topProducts: Array<{ name: string; quantity: number; salesPaise: number }>;
  recentActivity: Array<{ id: string; date: string; type: string; description: string; amountPaise?: number }>;
};

export type TransactionLine = { itemId?: string; itemName?: string; quantity: number; unit: string; unitPricePaise?: number };
export type PurchaseInput = { date: string; supplierId: string; billNumber?: string; lines: Array<TransactionLine & { quantity: number; unit: string; unitPricePaise: number }>; billAmountPaise: number; paidAmountPaise: number; note?: string };
export type ProductionInput = { date: string; productId: string; quantityProduced: number; team?: string; consumption: Array<Required<Pick<TransactionLine, 'itemId' | 'quantity' | 'unit'>>>; note?: string };
export type SaleInput = { date: string; customerId: string; saleType: SaleType; lines: Required<TransactionLine>[]; paidAmountPaise: number; note?: string };
export type ExpenseInput = { date: string; category: string; amountPaise: number; employeeOrTeam?: string; employeeCount?: number; note?: string };
export type SupplierPaymentInput = { date: string; supplierId: string; invoiceId?: string; amountPaise: number; type: 'PAYMENT' | 'ADVANCE'; note?: string };
export type CustomerPaymentInput = { date: string; customerId: string; invoiceId?: string; amountPaise: number; note?: string };
export type DailyClosingInput = { date: string; physicalCashPaise: number; note?: string };
