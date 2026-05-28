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
      console.log('[upload] ERRO: nenhum arquivo recebido');
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    console.log(`[upload] Arquivo recebido: name="${file.name}" type="${file.type}" size=${file.size} bytes`);

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`[upload] Buffer criado: ${buffer.length} bytes`);

    const rawText = await parseFile(buffer, file.type, file.name);

    console.log(`[upload] Texto extraído: ${rawText?.length ?? 0} chars`);
    console.log(`[upload] Preview (500 chars): ${rawText?.slice(0, 500)}`);

    if (!rawText || rawText.trim().length === 0) {
      console.log('[upload] ERRO: texto extraído está vazio');
      return NextResponse.json({ error: 'Não foi possível extrair texto do arquivo' }, { status: 400 });
    }

    console.log(`[upload] Enviando ao Claude: ${Math.min(rawText.length, 15000)} chars (arquivo: ${file.name})`);
    console.log(`[upload] Primeiros 300 chars enviados ao Claude: ${rawText.slice(0, 300)}`);

    let projects;
    try {
      projects = await extractProjectsFromText(rawText, file.name);
    } catch (aiErr) {
      console.error('[upload] ERRO na extração com IA:', aiErr);
      return NextResponse.json(
        { error: 'Falha ao analisar o arquivo com IA. Verifique se a variável ANTHROPIC_API_KEY está configurada.' },
        { status: 503 }
      );
    }

    console.log(`[upload] Projetos extraídos pelo Claude: ${projects?.length ?? 0}`);
    if (projects && projects.length > 0) {
      console.log(`[upload] Primeiro projeto: ${JSON.stringify(projects[0]).slice(0, 300)}`);
    }

    if (!projects || projects.length === 0) {
      console.log('[upload] AVISO: 0 projetos extraídos — retornando 422');
      return NextResponse.json(
        { error: 'Nenhum projeto encontrado no arquivo. Verifique se o conteúdo contém dados de projetos PMO (nome, status, prazo, etc.).' },
        { status: 422 }
      );
    }

    const format = file.name.split('.').pop()?.toUpperCase() || 'TXT';
    console.log(`[upload] Sucesso: ${projects.length} projeto(s), format=${format}`);

    return NextResponse.json({
      fileName: file.name,
      format,
      projects,
    });
  } catch (err) {
    console.error('[upload] ERRO interno:', err);
    return NextResponse.json(
      { error: 'Erro interno ao processar arquivo' },
      { status: 500 }
    );
  }
}
