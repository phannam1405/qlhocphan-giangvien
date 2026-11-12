import { normalize } from "./normalize";

// Tìm kiếm (mã GV / họ tên) + lọc theo ảnh + sắp xếp theo họ tên (hàm thuần, dễ test)
export function filterGiangVien(
  list,
  { search = "", imgFilter = "all", sort = "default" }
) {
  const kw = normalize(search.trim());

  let out = list.filter((g) => {
    const matchSearch =
      !kw ||
      normalize(g.Fullname || "").includes(kw) ||
      normalize(g.IDGV || "").includes(kw);
    const matchImg =
      imgFilter === "all" ||
      (imgFilter === "has" && !!g.Image) ||
      (imgFilter === "none" && !g.Image);
    return matchSearch && matchImg;
  });

  if (sort !== "default") {
    out = [...out].sort((a, b) =>
      (a.Fullname || "").localeCompare(b.Fullname || "", "vi")
    );
    if (sort === "za") out.reverse();
  }
  return out;
}
