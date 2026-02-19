import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { parseBriefFile } from '@/lib/brief-parser';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseBriefFile(buffer, file.type);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error parsing brief:', error);
    return NextResponse.json(
      { error: 'Failed to parse brief file' },
      { status: 500 }
    );
  }
}
