import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { isValidIDGV, parseSumClass } from "../utils/giangvienRules";

// Collection GiangVien: mỗi document chỉ có đúng 4 trường
// IDGV, Fullname, Image, SumClass (ID của document = IDGV)
const COL = "GiangVien";
const colRef = collection(db, COL);
const toGV = (d) => ({ id: d.id, ...d.data() });

// Lắng nghe realtime, trả về hàm hủy
export const subscribeGiangVien = (callback, onError) =>
  onSnapshot(
    colRef,
    (snap) => callback(snap.docs.map(toGV)),
    (err) => onError && onError(err)
  );

// data: { IDGV, Fullname, SumClass, Image }
export const createGiangVien = (data) =>
  setDoc(doc(db, COL, data.IDGV), {
    IDGV: data.IDGV,
    Fullname: data.Fullname,
    Image: data.Image || "",
    SumClass: data.SumClass,
  });

// Không cho đổi IDGV (vì là ID của document), chỉ sửa 3 trường còn lại
export const updateGiangVien = (id, data) =>
  updateDoc(doc(db, COL, id), {
    Fullname: data.Fullname,
    Image: data.Image || "",
    SumClass: data.SumClass,
  });

export const deleteGiangVien = (id) => deleteDoc(doc(db, COL, id));

// Xóa nhiều giảng viên cùng lúc (ghi theo lô tối đa 400 thao tác)
export async function deleteGiangVienBulk(ids) {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, COL, id)));
    await batch.commit();
  }
}

// Thêm nhiều giảng viên cùng lúc từ danh sách đọc từ file Excel
export async function createGiangVienBulk(items, existing = []) {
  const seen = new Set(
    existing.map((g) => String(g.IDGV || "").trim().toLowerCase())
  );
  const toAdd = [];
  let skippedCount = 0;
  let invalidCount = 0;

  for (const it of items) {
    const IDGV = String(it.IDGV || "").trim();
    const Fullname = String(it.Fullname || "").trim();
    const SumClass = parseSumClass(it.SumClass);
    const Image = String(it.Image || "").trim();

    if (!isValidIDGV(IDGV) || !Fullname || SumClass === null) {
      invalidCount++;
      continue;
    }

    const key = IDGV.toLowerCase();
    if (seen.has(key)) {
      skippedCount++;
      continue;
    }
    seen.add(key);
    toAdd.push({ IDGV, Fullname, Image, SumClass });
  }

  // Ghi theo lô nhỏ cho nhanh và tránh vượt giới hạn dung lượng của 1 lần ghi
  for (let i = 0; i < toAdd.length; i += 100) {
    const batch = writeBatch(db);
    toAdd.slice(i, i + 100).forEach((d) => batch.set(doc(db, COL, d.IDGV), d));
    await batch.commit();
  }

  return { addedCount: toAdd.length, skippedCount, invalidCount };
}
