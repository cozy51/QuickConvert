// PDF → Markdown。PDF.js でページ内の文字と位置・文字サイズを取り出し、
// 行 → 段落／見出し／箇条書き／表 へ組み立て直す（テキストを持たないスキャンPDFは対象外）。
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

type Piece = { text: string; x: number; y: number; width: number; size: number };
type Line = { pieces: Piece[]; x: number; end: number; y: number; size: number; text: string; cells: string[]; cellX: number[] };
type Block = { kind: 'heading' | 'paragraph' | 'list' | 'table'; text: string; level?: number; rows?: string[][] };

// 日本語のCMap（文字コード表）はPDF.jsに同梱されているものをビルドに含め、外部へ取りに行かない。
// 一覧は必要になったときだけ読み込む（pdf-cmaps.ts）。
class BundledCMapReaderFactory {
  async fetch({ name }: { name: string }) {
    const { cmapUrls } = await import('./pdf-cmaps');
    const url = cmapUrls[`/node_modules/pdfjs-dist/cmaps/${name}.bcmap`];
    if (!url) throw new Error(`CMap ${name} が見つかりません`);
    const response = await fetch(url);
    return { cMapData: new Uint8Array(await response.arrayBuffer()), isCompressed: true };
  }
}

const cjk = /[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/;
const bullet = /^(?:[•・●○◦▪▫■□◆◇▶►‣⁃∙\uf0a7\uf0b7\uf076\uf0d8\uf0fc]\s*|[*\-–—]\s+)/;
const numbered = /^(?:\(?(\d{1,2})[.)）](?!\d)|（(\d{1,2})）)\s*/;
const pageNumber = /^[-–—]?\s*(?:p\.?\s*)?\d{1,4}\s*(?:\/\s*\d{1,4})?\s*[-–—]?$/i;
const round = (value: number) => Math.round(value * 2) / 2;

// 前後の文字種を見て、日本語どうしは詰め、英数字どうしは半角スペースでつなぐ。
const join = (left: string, right: string) => {
  if (!left) return right;
  if (!right) return left;
  if (/-$/.test(left) && /^[a-z]/.test(right)) return left.slice(0, -1) + right;
  if (cjk.test(left.at(-1)!) || cjk.test(right[0]) || /\s$/.test(left) || /^\s/.test(right)) return left + right;
  return `${left} ${right}`;
};
const escapeCell = (text: string) => text.replace(/\|/g, '\\|').trim();

function buildLines(items: TextItem[]): Line[] {
  const pieces: Piece[] = items
    .filter(item => item.str.trim() && Math.abs(item.transform[1]) < 0.01)
    .map(item => ({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width, size: Math.hypot(item.transform[2], item.transform[3]) || item.height || 10 }));
  pieces.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Piece[][] = [];
  for (const piece of pieces) {
    const row = rows.at(-1);
    if (row && Math.abs(row[0].y - piece.y) < Math.min(row[0].size, piece.size) * 0.5) row.push(piece);
    else rows.push([piece]);
  }
  return rows.map(row => {
    row.sort((a, b) => a.x - b.x);
    const size = Math.max(...row.map(piece => piece.size));
    const cells: string[] = [];
    let text = '', cellX: number[] = [], cell = '', end = -Infinity;
    for (const piece of row) {
      const gap = piece.x - end;
      if (gap > size * 1.5 && cell) { cells.push(cell.trim()); cell = ''; }
      if (!cell) cellX.push(piece.x);
      const glue = gap > size * 0.2 && end > -Infinity && !/\s$/.test(text) && !/^\s/.test(piece.text);
      text = glue ? `${text} ${piece.text}` : text + piece.text;
      cell = glue && cell ? `${cell} ${piece.text}` : cell + piece.text;
      end = piece.x + piece.width;
    }
    if (cell.trim()) cells.push(cell.trim());
    cellX = cellX.slice(0, cells.length);
    text = text.replace(/\s+/g, ' ').trim();
    return { pieces: row, x: row[0].x, end, y: row[0].y, size, text, cells, cellX };
  }).filter(line => line.text);
}

// 2行以上続く、列の位置がそろった短い区切りの行を表とみなす。
function isTableRow(line: Line) {
  return line.cells.length >= 2 && line.cells.reduce((sum, cell) => sum + cell.length, 0) / line.cells.length <= 30;
}
function sameColumns(a: Line, b: Line) {
  const tolerance = Math.max(a.size, b.size) * 1.5;
  return a.cells.length === b.cells.length && a.cellX.every((x, index) => Math.abs(x - b.cellX[index]) <= tolerance);
}

function buildBlocks(lines: Line[], bodySize: number, headingLevel: (size: number) => number | undefined): Block[] {
  // 右端まで届かずに終わった行は段落の終わりとみなす。
  const right = Math.max(...lines.map(line => line.end));
  const blocks: Block[] = [];
  let previous: Line | undefined;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (isTableRow(line)) {
      let end = index + 1;
      while (end < lines.length && isTableRow(lines[end]) && sameColumns(line, lines[end])) end++;
      if (end - index >= 2) {
        blocks.push({ kind: 'table', text: '', rows: lines.slice(index, end).map(row => row.cells) });
        index = end - 1; previous = undefined; continue;
      }
    }
    const level = headingLevel(line.size);
    if (level && line.text.length <= 80) {
      const last = blocks.at(-1);
      // 2行にまたがる大きな見出しは1つにまとめる。
      if (last?.kind === 'heading' && last.level === level && previous && previous.y - line.y < line.size * 1.6) last.text = join(last.text, line.text);
      else blocks.push({ kind: 'heading', text: line.text, level });
      previous = line; continue;
    }
    const marker = line.text.match(bullet);
    const number = line.text.match(numbered);
    if (marker && line.text.length > marker[0].length) {
      blocks.push({ kind: 'list', text: `- ${line.text.slice(marker[0].length)}` });
      previous = line; continue;
    }
    if (number) {
      blocks.push({ kind: 'list', text: `${number[1] ?? number[2]}. ${line.text.slice(number[0].length)}` });
      previous = line; continue;
    }
    const last = blocks.at(-1);
    const gap = previous ? previous.y - line.y : Infinity;
    const continues = previous && previous.end > right - previous.size * 4 && gap < Math.max(previous.size, line.size) * 1.9 && Math.abs(line.size - previous.size) < bodySize * 0.15;
    if (continues && last && (last.kind === 'paragraph' || (last.kind === 'list' && line.x > previous!.x + line.size * 0.5))) last.text = join(last.text, line.text);
    else blocks.push({ kind: 'paragraph', text: line.text });
    previous = line;
  }
  return blocks;
}

const listType = (text: string) => text.startsWith('- ') ? 'bullet' : /^\d+\. /.test(text) ? 'number' : undefined;

function renderBlocks(blocks: Block[]) {
  const out: string[] = [];
  for (const block of blocks) {
    if (block.kind === 'table') {
      const [head, ...body] = block.rows!;
      out.push([`| ${head.map(escapeCell).join(' | ')} |`, `|${head.map(() => ' --- ').join('|')}|`, ...body.map(row => `| ${row.map(escapeCell).join(' | ')} |`)].join('\n'));
    } else if (block.kind === 'heading') out.push(`${'#'.repeat(block.level!)} ${block.text}`);
    else if (block.kind === 'list' && out.length && listType(out.at(-1)!.split('\n').at(-1)!) === listType(block.text)) out[out.length - 1] += `\n${block.text}`;
    else out.push(block.text.replace(/^(#{1,6}\s|>\s)/, '\\$1'));
  }
  return out.join('\n\n');
}

export async function pdfToMarkdown(file: File, pageBreaks = false, onStatus?: (message: string) => void) {
  onStatus?.('PDFを読み込んでいます…');
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  let document: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']> | undefined;
  try {
    document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), CMapReaderFactory: BundledCMapReaderFactory, useWorkerFetch: false, isEvalSupported: false }).promise;
    const pages: Line[][] = [];
    for (let number = 1; number <= document.numPages; number++) {
      onStatus?.(`テキストを抽出しています… ${number}/${document.numPages}`);
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      const lines = buildLines(content.items.filter((item): item is TextItem => 'str' in item));
      // ページ上端・下端にある、ページ番号だけの行は除く。
      while (lines.length && pageNumber.test(lines.at(-1)!.text)) lines.pop();
      while (lines.length && pageNumber.test(lines[0].text)) lines.shift();
      pages.push(lines);
      page.cleanup();
    }
    const counts = new Map<number, number>();
    for (const line of pages.flat()) counts.set(round(line.size), (counts.get(round(line.size)) ?? 0) + line.text.length);
    if (!counts.size) throw new Error('文字情報が含まれていません。スキャンした画像のPDFは変換できません');
    const bodySize = [...counts].sort((a, b) => b[1] - a[1])[0][0];
    const headingSizes = [...counts.keys()].filter(size => size >= bodySize * 1.15).sort((a, b) => b - a).slice(0, 3);
    const headingLevel = (size: number) => { const index = headingSizes.findIndex(heading => Math.abs(heading - round(size)) < 0.5); return index < 0 ? undefined : index + 1; };
    onStatus?.('Markdownを組み立てています…');
    const markdown = pages.map(lines => renderBlocks(buildBlocks(lines, bodySize, headingLevel))).filter(Boolean).join(pageBreaks ? '\n\n---\n\n' : '\n\n');
    return new Blob([`${markdown.trim()}\n`], { type: 'text/markdown;charset=utf-8' });
  } catch (error) {
    const message = error instanceof Error ? (error.name === 'PasswordException' ? 'パスワードで保護されたPDFは変換できません' : error.message) : '';
    throw new Error(`PDFを変換できませんでした${message ? `（${message}）` : ''}`);
  } finally { await document?.destroy(); }
}
