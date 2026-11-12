// Giải nén DEFLATE (RFC 1951) bằng JS thuần - không cần cài thư viện ngoài
export function inflateRaw(data) {
  let pos = 0;
  let bitBuf = 0;
  let bitCnt = 0;
  const out = [];

  function bits(n) {
    while (bitCnt < n) {
      if (pos >= data.length) throw new Error("Unexpected EOF in deflate");
      bitBuf |= data[pos++] << bitCnt;
      bitCnt += 8;
    }
    const val = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitCnt -= n;
    return val;
  }

  function buildTree(lengths) {
    const maxBits = Math.max(1, ...lengths);
    const blCount = new Int32Array(maxBits + 1);
    for (const l of lengths) if (l > 0) blCount[l]++;
    const nextCode = new Int32Array(maxBits + 1);
    let code = 0;
    for (let b = 1; b <= maxBits; b++) {
      code = (code + blCount[b - 1]) << 1;
      nextCode[b] = code;
    }
    const map = new Map();
    for (let i = 0; i < lengths.length; i++) {
      const l = lengths[i];
      if (l > 0) {
        map.set((l << 16) | nextCode[l], i);
        nextCode[l]++;
      }
    }
    return { map, maxBits };
  }

  function decode(tree) {
    let code = 0;
    for (let len = 1; len <= tree.maxBits; len++) {
      code = (code << 1) | bits(1);
      const sym = tree.map.get((len << 16) | code);
      if (sym !== undefined) return sym;
    }
    throw new Error("Invalid Huffman code");
  }

  const fixedLitLengths = new Uint8Array(288);
  for (let i = 0; i <= 143; i++) fixedLitLengths[i] = 8;
  for (let i = 144; i <= 255; i++) fixedLitLengths[i] = 9;
  for (let i = 256; i <= 279; i++) fixedLitLengths[i] = 7;
  for (let i = 280; i <= 287; i++) fixedLitLengths[i] = 8;
  const fixedLitTree = buildTree(fixedLitLengths);

  const fixedDistLengths = new Uint8Array(32);
  fixedDistLengths.fill(5);
  const fixedDistTree = buildTree(fixedDistLengths);

  const LEN_BASE = [
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59,
    67, 83, 99, 115, 131, 163, 195, 227, 258,
  ];
  const LEN_EXTRA = [
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5,
    5, 5, 5, 0,
  ];
  const DIST_BASE = [
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513,
    769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
  ];
  const DIST_EXTRA = [
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
    11, 11, 12, 12, 13, 13,
  ];
  const CL_ORDER = [
    16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
  ];

  let bfinal = 0;
  while (!bfinal) {
    bfinal = bits(1);
    const btype = bits(2);

    if (btype === 0) {
      bitBuf = 0;
      bitCnt = 0;
      const len = data[pos] | (data[pos + 1] << 8);
      pos += 4;
      for (let i = 0; i < len; i++) out.push(data[pos++]);
    } else if (btype === 1 || btype === 2) {
      let litTree = fixedLitTree;
      let distTree = fixedDistTree;

      if (btype === 2) {
        const hlit = bits(5) + 257;
        const hdist = bits(5) + 1;
        const hclen = bits(4) + 4;
        const clLengths = new Uint8Array(19);
        for (let i = 0; i < hclen; i++) clLengths[CL_ORDER[i]] = bits(3);
        const clTree = buildTree(clLengths);

        const lengths = [];
        while (lengths.length < hlit + hdist) {
          const sym = decode(clTree);
          if (sym < 16) {
            lengths.push(sym);
          } else if (sym === 16) {
            const prev = lengths[lengths.length - 1] || 0;
            const rep = bits(2) + 3;
            for (let i = 0; i < rep; i++) lengths.push(prev);
          } else if (sym === 17) {
            const rep = bits(3) + 3;
            for (let i = 0; i < rep; i++) lengths.push(0);
          } else if (sym === 18) {
            const rep = bits(7) + 11;
            for (let i = 0; i < rep; i++) lengths.push(0);
          }
        }
        litTree = buildTree(lengths.slice(0, hlit));
        distTree = buildTree(lengths.slice(hlit, hlit + hdist));
      }

      while (true) {
        const sym = decode(litTree);
        if (sym === 256) break;
        if (sym < 256) {
          out.push(sym);
        } else {
          const lenIdx = sym - 257;
          const length = LEN_BASE[lenIdx] + bits(LEN_EXTRA[lenIdx]);
          const distSym = decode(distTree);
          const dist = DIST_BASE[distSym] + bits(DIST_EXTRA[distSym]);
          const start = out.length - dist;
          for (let i = 0; i < length; i++) out.push(out[start + i]);
        }
      }
    } else {
      throw new Error("Invalid deflate block type");
    }
  }
  return new Uint8Array(out);
}

