import { NextResponse } from 'next/server';
import { isInventoryAuthenticated } from '@/lib/inventory/auth';
import { getSupplierAnalysis, getCustomerAnalysis, getStockReport, getExpenseReport, getProfitAnalysis } from '@/lib/inventory/excel';

export async function GET(request: Request) {
  if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const url = new URL(request.url);
    const report = url.searchParams.get('type');
    const dateStart = url.searchParams.get('dateStart');
    const dateEnd = url.searchParams.get('dateEnd');

    if (report === 'supplier-analysis') {
      return NextResponse.json(await getSupplierAnalysis(dateStart || undefined, dateEnd || undefined));
    }
    if (report === 'customer-analysis') {
      return NextResponse.json(await getCustomerAnalysis(dateStart || undefined, dateEnd || undefined));
    }
    if (report === 'stock') {
      return NextResponse.json(await getStockReport());
    }
    if (report === 'expenses') {
      return NextResponse.json(await getExpenseReport(dateStart || undefined, dateEnd || undefined));
    }
    if (report === 'profit') {
      return NextResponse.json(await getProfitAnalysis(dateStart || undefined, dateEnd || undefined));
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Report generation failed' }, { status: 400 });
  }
}
