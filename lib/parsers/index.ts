import * as XLSX from 'xlsx';

export async function parseFile(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'json' || mimeType === 'application/json') {
    return parseJSON(buffer);
  }

  if (ext === 'csv' || mimeType === 'text/csv') {
    return buffer.toString('utf-8');
  }

  if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return parseExcel(buffer);
  }

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return parsePDF(buffer);
  }

  if (ext === 'docx' || ext === 'doc' || mimeType.includes('word')) {
    return parseDocx(buffer);
  }

  // fallback: try as plain text
  return buffer.toString('utf-8');
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text;
  } catch {
    return '[Erro ao processar PDF]';
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    return '[Erro ao processar DOCX]';
  }
}
