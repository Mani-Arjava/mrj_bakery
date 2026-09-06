import { NextResponse } from 'next/server';
import { isInventoryAuthenticated } from '@/lib/inventory/auth';
import { exportToExcel, backupData, importFromExcel } from '@/lib/inventory/excel';

export async function GET(request: Request) {
  if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'export') {
      const buffer = await exportToExcel();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="bakery-inventory-${new Date().toISOString().slice(0,10)}.xlsx"`
        }
      });
    }

    if (action === 'backup') {
      const result = await backupData();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Operation failed' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const result = await importFromExcel(Buffer.from(buffer));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Import failed' }, { status: 400 });
  }
}
