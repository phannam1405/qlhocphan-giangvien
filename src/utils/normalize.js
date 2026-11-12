// Bỏ dấu tiếng Việt + chữ thường để tìm kiếm không phân biệt dấu
export const normalize = (s = "") =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
