// Chuẩn hóa tên cột để nhận diện linh hoạt
function normHeader(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const HEADERS = {
  IDGV: ["idgv", "magv", "magiangvien", "id", "ma"],
  Fullname: ["fullname", "hoten", "hovaten", "ten", "name", "giangvien"],
  SumClass: ["sumclass", "tongsolop", "solop", "tongso", "soluonglop"],
  Image: ["image", "hinhanh", "anh", "avatar", "img"],
};

// Chuyển các dòng dữ liệu thành danh sách { IDGV, Fullname, SumClass, Image }
// (giá trị còn ở dạng chuỗi, việc kiểm tra hợp lệ làm ở createGiangVienBulk)
export function rowsToGiangVien(rows) {
  if (!rows || rows.length === 0) return [];

  const firstRow = rows[0].map(normHeader);
  const colMap = { IDGV: -1, Fullname: -1, SumClass: -1, Image: -1 };
  let hasHeader = false;

  firstRow.forEach((h, idx) => {
    for (const key of Object.keys(HEADERS)) {
      if (colMap[key] === -1 && HEADERS[key].includes(h)) {
        colMap[key] = idx;
        hasHeader = true;
        break;
      }
    }
  });

  const dataRows = hasHeader ? rows.slice(1) : rows;

  // Không có dòng tiêu đề chuẩn -> mặc định theo vị trí cột
  if (!hasHeader) {
    colMap.IDGV = 0;
    colMap.Fullname = 1;
    colMap.SumClass = 2;
    colMap.Image = 3;
  }

  const cell = (row, idx) => (idx >= 0 ? String(row[idx] ?? "").trim() : "");

  const list = [];
  for (const row of dataRows) {
    const item = {
      IDGV: cell(row, colMap.IDGV),
      Fullname: cell(row, colMap.Fullname),
      SumClass: cell(row, colMap.SumClass),
      Image: cell(row, colMap.Image),
    };
    if (!item.IDGV && !item.Fullname) continue;
    list.push(item);
  }
  return list;
}
