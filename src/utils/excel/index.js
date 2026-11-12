import { utf8Decode } from "./utf8";
import { parseXlsxRows } from "./parseXlsx";
import { parseCsvRows } from "./parseCsv";
import { rowsToGiangVien } from "./rowsToGiangVien";

// Giải mã dữ liệu file Excel (.xlsx hoặc .csv) từ Uint8Array -> danh sách giảng viên
export function parseExcelBytes(bytes, fileName = "") {
  const isZip =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;

  let rows;
  if (isZip || fileName.toLowerCase().endsWith(".xlsx")) {
    rows = parseXlsxRows(bytes);
  } else {
    rows = parseCsvRows(utf8Decode(bytes));
  }
  return rowsToGiangVien(rows);
}

export { rowsToGiangVien };
