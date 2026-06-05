import { NextRequest } from 'next/server';
import { parseFile } from '@/lib/parsers';
import { extractProjectsFromText } from '@/lib/projectAnalyzer';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };

      try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
          console.log('[upload] ERRO: nenhum arquivo recebido');
          send({ type: 'error', error: 'Nenhum arquivo enviado' });
          return;
        }

        console.log(`[upload] Arquivo recebido: name="${file.name}" type="${file.type}" size=${file.size} bytes`);

        const buffer = Buffer.from(await file.arrayBuffer());
        console.log(`[upload] Buffer criado: ${buffer.length} bytes`);

        const rawText = await parseFile(buffer, file.type, file.name);
        console.log(`[upload] Texto extraído: ${rawText?.length ?? 0} chars`);

        if (!rawText || rawText.trim().length === 0) {
          console.log('[upload] ERRO: texto extraído está vazio');
          send({ type: 'error', error: 'Não foi possível extrair texto do arquivo' });
          return;
        }

        console.log(`[upload] Enviando ao Claude: ${rawText.length} chars total (arquivo: ${file.name})`);

        let projects;
        try {
          projects = await extractProjectsFromText(rawText, file.name, (message) => {
            send({ type: 'progress', message });
          });
        } catch (aiErr) {
          console.error('[upload] ERRO na extração com IA:', aiErr);
          send({ type: 'error', error: 'Falha ao analisar o arquivo com IA. Verifique se a variável ANTHROPIC_API_KEY está configurada.' });
          return;
        }

        console.log(`[upload] Projetos extraídos pelo Claude: ${projects?.length ?? 0}`);

        if (!projects || projects.length === 0) {
          console.log('[upload] AVISO: 0 projetos extraídos');
          send({ type: 'error', error: 'Nenhum projeto encontrado no arquivo. Verifique se o conteúdo contém dados de projetos PMO (nome, status, prazo, etc.).' });
          return;
        }

        const format = file.name.split('.').pop()?.toUpperCase() || 'TXT';
        console.log(`[upload] Sucesso: ${projects.length} projeto(s), format=${format}`);

        send({ type: 'done', data: { fileName: file.name, format, projects } });
      } catch (err) {
        console.error('[upload] ERRO interno:', err);
        send({ type: 'error', error: 'Erro interno ao processar arquivo' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
