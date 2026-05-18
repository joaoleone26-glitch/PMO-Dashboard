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

    let projects;
    try {
      projects = await extractProjectsFromText(rawText, file.name);
    } catch (aiErr) {
      console.error('AI extraction error:', aiErr);
      return NextResponse.json(
        { error: 'Falha ao analisar o arquivo com IA. Verifique se a variável ANTHROPIC_API_KEY está configurada.' },
        { status: 503 }
      );
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum projeto encontrado no arquivo. Verifique se o conteúdo contém dados de projetos PMO (nome, status, prazo, etc.).' },
        { status: 422 }
      );
    }

    const format = file.name.split('.').pop()?.toUpperCase() || 'TXT';

    return NextResponse.json({
      fileName: file.name,
      format,
      projects,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'Erro interno ao processar arquivo' },
      { status: 500 }
    );
  }
}
