import { inflateRaw } from "./inflate";
import { utf8Decode } from "./utf8";

// Đọc file ZIP (.xlsx thực chất là ZIP chứa các file XML)
function readU16(buf, off) {
  return buf[off] | (buf[off + 1] << 8);
}
function readU32(buf, off) {
  return (
    (buf[off] |
      (buf[off + 1] << 8) |
      (buf[off + 2] << 16) |
      (buf[off + 3] << 24)) >>>
    0
  );
}

export function unzipEntries(bytes) {
  const files = {};
  // Tìm End of Central Directory (0x06054b50)
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (readU32(bytes, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("File không đúng định dạng Excel (.xlsx)");

  const totalEntries = readU16(bytes, eocd + 10);
  let cdOffset = readU32(bytes, eocd + 16);

  for (let i = 0; i < totalEntries; i++) {
    if (readU32(bytes, cdOffset) !== 0x02014b50) break;
    const method = readU16(bytes, cdOffset + 10);
    const compSize = readU32(bytes, cdOffset + 20);
    const nameLen = readU16(bytes, cdOffset + 28);
    const extraLen = readU16(bytes, cdOffset + 30);
    const commentLen = readU16(bytes, cdOffset + 32);
    const localHeaderOffset = readU32(bytes, cdOffset + 42);

    const name = utf8Decode(
      bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen)
    );

    const localNameLen = readU16(bytes, localHeaderOffset + 26);
    const localExtraLen = readU16(bytes, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawData = bytes.subarray(dataStart, dataStart + compSize);

    if (method === 0) {
      files[name] = rawData;
    } else if (method === 8) {
      files[name] = inflateRaw(rawData);
    }

    cdOffset += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

