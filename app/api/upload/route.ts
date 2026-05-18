import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/lib/parsers';
import { extractProjectsFromText } from '@/lib/projectAnalyzer';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await parseFile(buffer, file.type, file.name);

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ error: 'Não foi possível extrair texto do arquivo' }, { status: 400 });
    }

    const projects = await extractProjectsFromText(rawText, file.name);

    return NextResponse.json({
      fileName: file.name,
      format: file.type || file.name.split('.').pop(),
      projects,
      rawText: rawText.slice(0, 500),
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'Erro ao processar arquivo' },
      { status: 500 }
    );
  }
}
