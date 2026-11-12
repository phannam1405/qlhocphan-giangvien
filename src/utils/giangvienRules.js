// Quy tắc dữ liệu GiangVien: IDGV, Fullname, Image, SumClass

// IDGV dùng làm ID của document nên chỉ cho chữ, số, _ và -
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export const isValidIDGV = (id) => ID_PATTERN.test(String(id || "").trim());

// Tổng số lớp: số nguyên >= 0. Trả về null nếu không hợp lệ (kể cả để trống)
export function parseSumClass(value) {
  const s = String(value ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  return parseInt(s, 10);
}
