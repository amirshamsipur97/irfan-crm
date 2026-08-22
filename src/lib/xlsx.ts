/**
 * A tiny XLSX writer — enough to hand the sales team a real Excel file
 * instead of a CSV, which mangles Persian text and turns "+968 9xxx" into a
 * number. No dependency: the whole workbook is XML in a STORED (uncompressed)
 * zip, so it builds in the browser with no zlib. A 200-row board lands
 * around 250 KB, which is nothing for a download.
 *
 * Strings are written inline, so there is no shared-string table to keep in
 * step. Dates are real Excel dates (serial + yyyy-mm-dd format) computed from
 * the Y/M/D parts, never from a Date instance — the same reason
 * activities-config.ts exists: a timestamp would shift the day west of UTC.
 */

/** A date-only cell. Pass "YYYY-MM-DD"; anything else is written as text. */
export type XlsxDate = { date: string | null };

export type XlsxValue = string | number | null | undefined | XlsxDate;

export interface XlsxColumn {
  header: string;
  /** width in characters, roughly Excel's own unit */
  width: number;
  /** long free text: wrap it instead of letting it run under the next cell */
  wrap?: boolean;
}

export interface XlsxSheet {
  name: string;
  columns: XlsxColumn[];
  rows: XlsxValue[][];
}

/* ────────────────────────────── xml helpers ────────────────────────────── */

// XML 1.0 forbids most control characters outright, and real CRM notes have
// picked up stray NUL and unit-separator bytes from pasted content before now.
const ILLEGAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

function esc(text: string): string {
  return text
    .replace(ILLEGAL, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 0 → A, 25 → Z, 26 → AA */
export function colLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Excel's day zero is 1899-12-30. Parsed from the parts, so no timezone. */
function dateSerial(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  const days = Math.round(
    (Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - Date.UTC(1899, 11, 30)) / 86400000
  );
  return Number.isFinite(days) ? days : null;
}

/** Excel refuses : \ / ? * [ ] in a sheet name, and anything over 31 chars. */
function safeSheetName(name: string): string {
  return (name.replace(/[:\\/?*[\]]/g, " ").trim() || "Sheet").slice(0, 31);
}

/* ─────────────────────────────── the parts ─────────────────────────────── */

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

// style ids used below: 1 = header, 2 = date, 3 = wrapped text
const STYLES = `${XML_HEAD}
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts>
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF00778A"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function sheetXml(sheet: XlsxSheet): string {
  const lastCol = colLetter(Math.max(0, sheet.columns.length - 1));
  const lastRow = sheet.rows.length + 1;
  const range = `A1:${lastCol}${lastRow}`;

  const cols = sheet.columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`)
    .join("");

  const header =
    `<row r="1" ht="22" customHeight="1" s="1" customFormat="1">` +
    sheet.columns
      .map(
        (c, i) =>
          `<c r="${colLetter(i)}1" s="1" t="inlineStr"><is><t xml:space="preserve">${esc(c.header)}</t></is></c>`
      )
      .join("") +
    `</row>`;

  const body = sheet.rows
    .map((row, r) => {
      const rowNum = r + 2;
      const cells = row
        .map((value, i) => {
          const ref = `${colLetter(i)}${rowNum}`;
          if (value == null || value === "") return "";

          if (typeof value === "object" && "date" in value) {
            const serial = value.date ? dateSerial(value.date) : null;
            if (serial == null) {
              return value.date
                ? `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(value.date)}</t></is></c>`
                : "";
            }
            return `<c r="${ref}" s="2"><v>${serial}</v></c>`;
          }

          if (typeof value === "number") {
            if (!Number.isFinite(value)) return "";
            return `<c r="${ref}"><v>${value}</v></c>`;
          }

          const style = sheet.columns[i]?.wrap ? ' s="3"' : "";
          return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${esc(String(value))}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNum}">${cells}</row>`;
    })
    .join("");

  return `${XML_HEAD}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="${range}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${header}${body}</sheetData>
<autoFilter ref="${range}"/>
</worksheet>`;
}

/* ──────────────────────────── a store-only zip ─────────────────────────── */

let CRC_TABLE: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: Uint8Array;
  size: number;
  crc: number;
  offset: number;
}

function u16(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff];
}
function u32(n: number): number[] {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

/** Zips the given files with no compression (method 0) and UTF-8 names. */
function zip(files: { path: string; text: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: (number[] | Uint8Array)[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.text);
    const crc = crc32(data);
    // a fixed 1980-01-01 stamp keeps the output byte-identical run to run
    const head = [
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(0), ...u16(0x0021),
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(name.length), ...u16(0),
    ];
    chunks.push(head, name, data);
    entries.push({ name, size: data.length, crc, offset });
    offset += head.length + name.length + data.length;
  }

  const dirStart = offset;
  let dirSize = 0;
  for (const e of entries) {
    const rec = [
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(0), ...u16(0x0021),
      ...u32(e.crc), ...u32(e.size), ...u32(e.size),
      ...u16(e.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(e.offset),
    ];
    chunks.push(rec, e.name);
    dirSize += rec.length + e.name.length;
  }

  chunks.push([
    ...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(entries.length), ...u16(entries.length),
    ...u32(dirSize), ...u32(dirStart), ...u16(0),
  ]);

  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/* ─────────────────────────────── the export ────────────────────────────── */

/** Builds a complete .xlsx workbook as bytes. */
export function buildXlsx(sheets: XlsxSheet[]): Uint8Array {
  const named = sheets.map((s, i) => ({ ...s, name: safeSheetName(s.name || `Sheet${i + 1}`) }));

  const contentTypes = `${XML_HEAD}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${named.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRels = `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbook = `${XML_HEAD}
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${named.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
</workbook>`;

  const workbookRels = `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${named.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return zip([
    { path: "[Content_Types].xml", text: contentTypes },
    { path: "_rels/.rels", text: rootRels },
    { path: "xl/workbook.xml", text: workbook },
    { path: "xl/_rels/workbook.xml.rels", text: workbookRels },
    { path: "xl/styles.xml", text: STYLES },
    ...named.map((s, i) => ({ path: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(s) })),
  ]);
}

/** Builds the workbook and hands it to the browser as a download. */
export function downloadXlsx(fileName: string, sheets: XlsxSheet[]): void {
  const bytes = buildXlsx(sheets);
  const blob = new Blob([bytes as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari needs the URL alive until the click has been processed
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
