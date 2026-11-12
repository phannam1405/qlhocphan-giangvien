// Giải mã UTF-8
export function utf8Decode(bytes) {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8").decode(bytes);
  }
  let str = "";
  let i = 0;
  while (i < bytes.length) {
    const c = bytes[i++];
    if (c < 128) {
      str += String.fromCharCode(c);
    } else if (c > 191 && c < 224) {
      const c2 = bytes[i++];
      str += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
    } else {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      str += String.fromCharCode(
        ((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)
      );
    }
  }
  return str;
}
