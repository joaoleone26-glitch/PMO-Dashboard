/* eslint-disable @typescript-eslint/no-require-imports */

export async function parseFile(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase();
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

  if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    const result = parseExcel(buffer);
    console.log(`[parser] Excel → ${result.length} chars, preview: ${result.slice(0, 120)}`);
    return result;
  }

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    const result = await parsePDF(buffer);
    console.log(`[parser] PDF → ${result.length} chars, preview: ${result.slice(0, 120)}`);
    return result;
  }

  if (ext === 'docx' || ext === 'doc' || mimeType.includes('word')) {
    const result = await parseDocx(buffer);
    console.log(`[parser] DOCX → ${result.length} chars, preview: ${result.slice(0, 120)}`);
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
