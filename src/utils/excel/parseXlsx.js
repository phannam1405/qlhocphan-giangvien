import { unzipEntries } from "./zip";
import { utf8Decode } from "./utf8";

// Giải mã ký tự XML entities
function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
}

// Đổi tên cột chữ cái (A, B, C... AA) sang chỉ số 0, 1, 2...
function colLettersToIndex(ref) {
  const m = /^([A-Z]+)/i.exec(ref || "");
  if (!m) return -1;
  const letters = m[1].toUpperCase();
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

// Đọc mảng 2 chiều các dòng từ file .xlsx
export function parseXlsxRows(bytes) {
  const files = unzipEntries(bytes);

  // 1. Đọc bảng chuỗi dùng chung (sharedStrings.xml) nếu có
  const sharedStrings = [];
  if (files["xl/sharedStrings.xml"]) {
    const sstXml = utf8Decode(files["xl/sharedStrings.xml"]);
    const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let siMatch;
    while ((siMatch = siRegex.exec(sstXml)) !== null) {
      const inner = siMatch[1];
      const tRegex = /<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g;
      let tMatch;
      let text = "";
      while ((tMatch = tRegex.exec(inner)) !== null) {
        text += decodeXmlEntities(tMatch[1]);
      }
      sharedStrings.push(text);
    }
  }

  // 2. Tìm sheet đầu tiên
  const sheetName =
    Object.keys(files)
      .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
      .sort()[0] ||
    Object.keys(files).find((k) => k.startsWith("xl/worksheets/"));

  if (!sheetName || !files[sheetName]) {
    throw new Error("Không tìm thấy dữ liệu trang tính trong file Excel");
  }

  const sheetXml = utf8Decode(files[sheetName]);
  const rows = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowContent = rowMatch[1];
    const rowCells = [];
    const cellRegex = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch;
    let nextCol = 0;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1] || "";
      const inner = cellMatch[2] || "";

      const refMatch = /\br="([A-Z]+\d+)"/i.exec(attrs);
      const typeMatch = /\bt="([^"]+)"/.exec(attrs);
      const colIdx = refMatch ? colLettersToIndex(refMatch[1]) : nextCol;
      nextCol = colIdx + 1;

      const cellType = typeMatch ? typeMatch[1] : "";
      let val = "";

      if (cellType === "inlineStr") {
        const tRegex = /<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g;
        let tMatch;
        while ((tMatch = tRegex.exec(inner)) !== null) {
          val += decodeXmlEntities(tMatch[1]);
        }
      } else {
        const vMatch = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner);
        if (vMatch) {
          const rawVal = decodeXmlEntities(vMatch[1].trim());
          if (cellType === "s") {
            const idx = parseInt(rawVal, 10);
            val = sharedStrings[idx] !== undefined ? sharedStrings[idx] : rawVal;
          } else {
            val = rawVal;
          }
        }
      }

      while (rowCells.length < colIdx) rowCells.push("");
      rowCells[colIdx] = String(val).trim();
    }

    if (rowCells.some((c) => c !== "")) {
      rows.push(rowCells);
    }
  }

  return rows;
}

