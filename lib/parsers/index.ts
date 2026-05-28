/* eslint-disable @typescript-eslint/no-require-imports */

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const IMAGE_MIME_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp',
};

export async function parseFile(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  console.log(`[parser] file="${fileName}" ext=${ext} mime=${mimeType} size=${buffer.length}`);

  if (ext === 'json' || mimeType === 'application/json') {
    const result = parseJSON(buffer);
    console.log(`[parser] JSON → ${result.length} chars`);
    return result;
  }

  if (ext === 'csv' || mimeType === 'text/csv') {
    const result = buffer.toString('utf-8');
    console.log(`[parser] CSV → ${result.length} chars, preview: ${result.slice(0, 120)}`);
    return result;
  }

  if (['xlsx', 'xls', 'xlsm', 'xlsb'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    const result = parseExcel(buffer);
    console.log(`[parser] Excel → ${result.length} chars, preview: ${result.slice(0, 120)}`);
    return result;
  }

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    const result = await parsePDF(buffer);
    console.log(`[parser] PDF → ${result.length} chars, preview: ${result.slice(0, 120)}`);
    return result;
  }

  if (['docx', 'doc'].includes(ext) || mimeType.includes('word')) {
    const result = await parseDocx(buffer);
    console.log(`[parser] DOCX → ${result.length} chars, preview: ${result.slice(0, 120)}`);
    return result;
  }

  if (['pptx', 'ppt'].includes(ext) || mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    const result = await parsePptx(buffer);
    console.log(`[parser] PPTX → ${result.length} chars, preview: ${result.slice(0, 120)}`);
    return result;
  }

  if (['xml', 'xer', 'p6xml'].includes(ext) || mimeType === 'application/xml' || mimeType === 'text/xml') {
    const result = parseXml(buffer);
    console.log(`[parser] XML/XER/P6XML → ${result.length} chars, preview: ${result.slice(0, 120)}`);
    return result;
  }

  if (IMAGE_EXTS.has(ext) || mimeType.startsWith('image/')) {
    const result = await parseImage(buffer, ext, mimeType);
    console.log(`[parser] Image (Vision) → ${result.length} chars`);
    return result;
  }

  if (['tiff', 'tif', 'bmp'].includes(ext)) {
    const result = buildMetadataRecord(fileName, 'Imagem Raster', { format: ext.toUpperCase(), size_bytes: buffer.length });
    console.log(`[parser] Raster image metadata → ${result.length} chars`);
    return result;
  }

  if (ext === 'vsdx' || mimeType.includes('visio')) {
    const result = await parseVsdx(buffer);
    console.log(`[parser] VSDX → ${result.length} chars`);
    return result;
  }

  if (ext === 'rtf' || mimeType === 'application/rtf' || mimeType === 'text/rtf') {
    const result = parseRtf(buffer);
    console.log(`[parser] RTF → ${result.length} chars`);
    return result;
  }

  if (ext === 'msg' || mimeType === 'application/vnd.ms-outlook') {
    const result = parseMsg(buffer);
    console.log(`[parser] MSG → ${result.length} chars`);
    return result;
  }

  if (['mpp', 'mpt'].includes(ext) || mimeType.includes('ms-project') || mimeType.includes('msproj')) {
    const result = buildMetadataRecord(fileName, 'Microsoft Project', {
      format: ext.toUpperCase(),
      size_bytes: buffer.length,
      note: 'Arquivo binário MS Project — extraia nome do projeto, tarefas, datas e recursos do contexto disponível.',
    });
    console.log(`[parser] MPP metadata → ${result.length} chars`);
    return result;
  }

  if (['mdb', 'accdb'].includes(ext) || mimeType.includes('access')) {
    const result = buildMetadataRecord(fileName, 'Microsoft Access Database', {
      format: ext.toUpperCase(),
      size_bytes: buffer.length,
      note: 'Banco de dados binário Access — descreva projetos PMO esperados para este arquivo.',
    });
    console.log(`[parser] MDB metadata → ${result.length} chars`);
    return result;
  }

  if (ext === 'mpx') {
    const result = buffer.toString('utf-8');
    console.log(`[parser] MPX text → ${result.length} chars`);
    return result;
  }

  if (ext === 'dxf') {
    const result = parseDxf(buffer);
    console.log(`[parser] DXF → ${result.length} chars`);
    return result;
  }

  if (ext === 'ifc') {
    const result = parseIfc(buffer);
    console.log(`[parser] IFC → ${result.length} chars`);
    return result;
  }

  if (['dwg', 'rvt', 'skp', 'nwd', 'nwc'].includes(ext)) {
    const labels: Record<string, string> = {
      dwg: 'AutoCAD Drawing', rvt: 'Revit Model', skp: 'SketchUp Model',
      nwd: 'Navisworks Document', nwc: 'Navisworks Cache',
    };
    const result = buildMetadataRecord(fileName, labels[ext] || 'CAD/BIM', {
      format: ext.toUpperCase(),
      size_bytes: buffer.length,
      note: 'Arquivo CAD/BIM binário — descreva o projeto de infraestrutura representado.',
    });
    console.log(`[parser] CAD/BIM metadata → ${result.length} chars`);
    return result;
  }

  const result = buffer.toString('utf-8');
  console.log(`[parser] TXT fallback → ${result.length} chars`);
  return result;
}

function parseJSON(buffer: Buffer): string {
  try {
    const obj = JSON.parse(buffer.toString('utf-8'));
    return JSON.stringify(obj, null, 2);
  } catch {
    return buffer.toString('utf-8');
  }
}

function parseExcel(buffer: Buffer): string {
  const XLSX = require('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const lines: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    lines.push(`## Planilha: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    lines.push(csv);
    lines.push('');
  }

  return lines.join('\n');
}

async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    console.error('[parser] PDF error:', err);
    return '[Erro ao processar PDF]';
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (err) {
    console.error('[parser] DOCX error:', err);
    return '[Erro ao processar DOCX]';
  }
}

async function parsePptx(buffer: Buffer): Promise<string> {
  try {
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter(f => f.match(/ppt\/slides\/slide\d+\.xml/)).sort();
    const texts: string[] = [];
    for (const slide of slideFiles) {
      const xml = await zip.files[slide].async('string');
      const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
      const slideText = matches.map((m: string) => m.replace(/<[^>]+>/g, '')).join(' ');
      if (slideText.trim()) texts.push(`[Slide] ${slideText.trim()}`);
    }
    return texts.join('\n') || '[PPTX sem texto extraível]';
  } catch (err) {
    console.error('[parser] PPTX error:', err);
    return '[Erro ao processar PPTX]';
  }
}

function parseXml(buffer: Buffer): string {
  const raw = buffer.toString('utf-8');
  if (raw.startsWith('%T\t')) return raw;
  const text = raw
    .replace(/<\?[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 50000);
}

async function parseImage(buffer: Buffer, ext: string, mimeType: string): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default();

    const resolvedMime = IMAGE_MIME_MAP[ext] || (mimeType.startsWith('image/') ? mimeType : 'image/png');
    const supportedMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!supportedMimes.includes(resolvedMime)) {
      return buildMetadataRecord(`image.${ext}`, 'Imagem', {
        format: ext.toUpperCase(),
        size_bytes: buffer.length,
        note: 'Formato de imagem não suportado por Vision.',
      });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: resolvedMime as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
              data: buffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: 'Extraia todas as informações relevantes de PMO desta imagem: nome do projeto, status, prazos, responsáveis, indicadores, riscos, progresso, orçamento e qualquer dado de gerenciamento de projetos visível. Seja detalhado e estruturado.',
          },
        ],
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '[Imagem sem texto extraível via Vision]';
  } catch (err) {
    console.error('[parser] Image Vision error:', err);
    return '[Erro ao processar imagem com Vision]';
  }
}

async function parseVsdx(buffer: Buffer): Promise<string> {
  try {
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(buffer);
    const pageFiles = Object.keys(zip.files).filter(f => f.match(/visio\/pages\/page\d+\.xml/)).sort();
    const texts: string[] = [];

    for (const page of pageFiles) {
      const xml = await zip.files[page].async('string');
      const stripped = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (stripped.length > 10) texts.push(`[Página Visio] ${stripped.slice(0, 3000)}`);
    }

    if (texts.length === 0) {
      const allXml: string[] = [];
      for (const name of Object.keys(zip.files).filter(f => f.endsWith('.xml')).slice(0, 10)) {
        const content = await zip.files[name].async('string');
        const stripped = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (stripped.length > 10) allXml.push(stripped.slice(0, 2000));
      }
      return allXml.join('\n').slice(0, 30000) || '[VSDX sem texto extraível]';
    }

    return texts.join('\n').slice(0, 40000);
  } catch (err) {
    console.error('[parser] VSDX error:', err);
    return '[Erro ao processar VSDX]';
  }
}

function parseRtf(buffer: Buffer): string {
  try {
    const raw = buffer.toString('latin1');
    const stripped = raw
      .replace(/\{[^{}]*\}/g, ' ')
      .replace(/\\[a-z]+\d* ?/g, ' ')
      .replace(/[{}\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped.slice(0, 50000) || '[RTF sem texto extraível]';
  } catch (err) {
    console.error('[parser] RTF error:', err);
    return '[Erro ao processar RTF]';
  }
}

function parseMsg(buffer: Buffer): string {
  try {
    const raw = buffer.toString('latin1');
    const printable = raw
      .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const meaningful = printable.split(/\s+/).filter(w => w.length > 3).join(' ');
    return meaningful.slice(0, 30000) || '[MSG sem texto extraível]';
  } catch (err) {
    console.error('[parser] MSG error:', err);
    return '[Erro ao processar MSG]';
  }
}

function parseDxf(buffer: Buffer): string {
  try {
    const raw = buffer.toString('utf-8');
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const textValues: string[] = [];
    for (let i = 0; i < lines.length - 1; i++) {
      const code = parseInt(lines[i]);
      const value = lines[i + 1];
      if ([1, 2, 3, 4, 7, 8].includes(code) && value && !value.startsWith('*')) {
        textValues.push(value);
        i++;
      }
    }
    const unique = [...new Set(textValues)];
    return `[DXF CAD File]\nLayers e Entidades:\n${unique.join('\n')}`.slice(0, 30000);
  } catch (err) {
    console.error('[parser] DXF error:', err);
    return '[Erro ao processar DXF]';
  }
}

function parseIfc(buffer: Buffer): string {
  try {
    const raw = buffer.toString('utf-8');
    const interesting = raw.split('\n').filter(l =>
      l.includes('IFCPROJECT') || l.includes('IFCSITE') || l.includes('IFCBUILDING') ||
      l.includes('IFCSPACE') || l.includes('IFCTASK') || l.includes('IFCACTOR') ||
      l.includes('IFCWORKSCHEDULE') || l.startsWith('FILE_DESCRIPTION') || l.startsWith('FILE_NAME')
    );
    return `[IFC BIM File]\n${interesting.slice(0, 500).join('\n')}`.slice(0, 40000);
  } catch (err) {
    console.error('[parser] IFC error:', err);
    return '[Erro ao processar IFC]';
  }
}

function buildMetadataRecord(fileName: string, fileType: string, meta: Record<string, unknown>): string {
  return JSON.stringify({ file_type: fileType, file_name: fileName, ...meta }, null, 2);
}
