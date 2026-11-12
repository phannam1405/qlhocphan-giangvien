import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../auth";
import {
  subscribeGiangVien,
  createGiangVien,
  createGiangVienBulk,
  updateGiangVien,
  deleteGiangVien,
  deleteGiangVienBulk,
} from "../services/giangvien";
import { filterGiangVien } from "../utils/filterGiangVien";
import { buildGiangVienXlsx } from "../utils/excel/exportXlsx";
import { saveExcelFile } from "../utils/excel/saveExcelFile";
import { showMessage, confirmDelete } from "../utils/alert";
import Loading from "../components/Loading";
import GiangVienForm from "../components/GiangVienForm";
import ExcelImportModal from "../components/ExcelImportModal";
import GiangVienFilters from "../components/GiangVienFilters";
import GiangVienCard from "../components/GiangVienCard";
import Checkbox from "../components/Checkbox";
import { styles } from "../styles";

const PAGE_SIZE = 5; // Số lượng giảng viên mỗi trang

// Sắp xếp theo mã giảng viên (GV2 trước GV10) khi xuất file
const byIDGV = (a, b) =>
  String(a.IDGV).localeCompare(String(b.IDGV), "vi", { numeric: true });

// Tên file xuất: giangvien_tatca_20261112_0830.xlsx
function exportFileName(label) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(
    d.getHours()
  )}${p(d.getMinutes())}`;
  return `giangvien_${label}_${stamp}.xlsx`;
}

export default function Admin() {
  const { user, loading, logout } = useAuth();

  const [list, setList] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);

  const [search, setSearch] = useState("");
  const [imgFilter, setImgFilter] = useState("all"); // all | has | none
  const [sort, setSort] = useState("default"); // default | az | za
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState({}); // { [id]: true } các giảng viên được tick

  // Chỉ lắng nghe khi đã đăng nhập
  const loggedIn = !!user;
  useEffect(() => {
    if (!loggedIn) return;
    return subscribeGiangVien(setList, (e) =>
      showMessage("Không tải được dữ liệu: " + e.message)
    );
  }, [loggedIn]);

  const filteredUsers = useMemo(
    () => filterGiangVien(list, { search, imgFilter, sort }),
    [list, search, imgFilter, sort]
  );

  // Chỉ giữ lại các mục được tick mà vẫn còn trong danh sách đang lọc
  // (tránh xóa / xuất nhầm mục đang bị ẩn bởi bộ lọc hoặc đã bị xóa)
  useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(filteredUsers.map((g) => g.id));
      const next = {};
      let changed = false;
      for (const id of Object.keys(prev)) {
        if (visible.has(id)) next[id] = true;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredUsers]);

  // Khi thay đổi bộ lọc / tìm kiếm -> quay về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [search, imgFilter, sort]);

  // Tính toán phân trang
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedUsers = useMemo(
    () => filteredUsers.slice(startIdx, startIdx + PAGE_SIZE),
    [filteredUsers, startIdx]
  );

  if (loading) return <Loading />;
  if (!user) return <Redirect href="/" />;

  // Người đang đăng nhập (tài khoản Firebase Authentication)
  const me = user;

  // Mở modal thêm mới
  const handleOpenAdd = () => {
    setEditingItem(null);
    setShowFormModal(true);
  };

  // Mở modal sửa giảng viên
  const handleOpenEdit = (g) => {
    setEditingItem(g);
    setShowFormModal(true);
  };

  const handleCloseForm = () => {
    setEditingItem(null);
    setShowFormModal(false);
  };

  // Lưu khi thêm mới hoặc cập nhật
  const handleSave = async (data) => {
    try {
      if (editingItem) {
        await updateGiangVien(editingItem.id, data);
      } else {
        const dup = list.some(
          (g) =>
            String(g.IDGV || "").trim().toLowerCase() ===
            data.IDGV.toLowerCase()
        );
        if (dup) {
          showMessage("Mã giảng viên này đã tồn tại");
          return false;
        }
        await createGiangVien(data);
      }
      handleCloseForm();
      return true;
    } catch (e) {
      showMessage("Lỗi: " + e.message);
      return false;
    }
  };

  // Nhập nhiều giảng viên từ file Excel
  const handleImportExcel = async (excelList) => {
    try {
      const { addedCount, skippedCount, invalidCount } =
        await createGiangVienBulk(excelList, list);

      let msg = `Đã thêm thành công ${addedCount} giảng viên từ file Excel!`;
      if (skippedCount > 0) {
        msg += `\n• Bỏ qua ${skippedCount} mã giảng viên đã tồn tại hoặc trùng lặp.`;
      }
      if (invalidCount > 0) {
        msg += `\n• Bỏ qua ${invalidCount} dòng thiếu hoặc sai thông tin (IDGV, Fullname, SumClass).`;
      }
      showMessage(msg);
      return addedCount > 0 || skippedCount > 0;
    } catch (e) {
      showMessage("Lỗi khi nhập từ Excel: " + e.message);
      return false;
    }
  };

  const handleDelete = (g) => {
    confirmDelete(`Xóa giảng viên "${g.Fullname}"?`, async () => {
      try {
        await deleteGiangVien(g.id);
        if (editingItem?.id === g.id) handleCloseForm();
      } catch (e) {
        showMessage("Lỗi: " + e.message);
      }
    });
  };

  // ----- Tick chọn nhiều giảng viên -----
  const selectedCount = Object.keys(selectedIds).length;
  const pageSelectedCount = paginatedUsers.filter((g) => selectedIds[g.id]).length;
  const pageState =
    paginatedUsers.length > 0 && pageSelectedCount === paginatedUsers.length
      ? "checked"
      : pageSelectedCount > 0
      ? "partial"
      : "none";

  const toggleOne = (id) =>
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });

  // Tick / bỏ tick toàn bộ giảng viên của trang đang hiển thị
  const toggleAllPage = () =>
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (pageState === "checked") {
        paginatedUsers.forEach((g) => delete next[g.id]);
      } else {
        paginatedUsers.forEach((g) => (next[g.id] = true));
      }
      return next;
    });

  const clearSelection = () => setSelectedIds({});

  // Xóa các giảng viên được tick
  const handleDeleteSelected = () => {
    const ids = Object.keys(selectedIds);
    if (!ids.length) return;
    confirmDelete(`Xóa ${ids.length} giảng viên đã chọn?`, async () => {
      try {
        await deleteGiangVienBulk(ids);
        if (editingItem && ids.includes(editingItem.id)) handleCloseForm();
        setSelectedIds({});
      } catch (e) {
        showMessage("Lỗi: " + e.message);
      }
    });
  };

  // ----- Xuất Excel -----
  const exportItems = async (items, label) => {
    if (!items.length) return showMessage("Chưa có giảng viên nào để xuất");
    try {
      const bytes = buildGiangVienXlsx([...items].sort(byIDGV));
      await saveExcelFile(bytes, exportFileName(label));
    } catch (e) {
      showMessage("Lỗi khi xuất Excel: " + e.message);
    }
  };
  const handleExportAll = () => exportItems(list, "tatca");
  const handleExportSelected = () =>
    exportItems(
      filteredUsers.filter((g) => selectedIds[g.id]),
      "dachon"
    );

  // Danh sách các số trang để hiển thị nút bấm
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const header = (
    <View>
      {/* Thanh trên cùng */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <View style={styles.topAvatar}>
            <Text style={styles.topAvatarText}>
              {(me.hoten || "A").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle}>Quản lý giảng viên</Text>
            <Text style={styles.topUser}>
              Xin chào,{" "}
              <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                {me.hoten}
              </Text>
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logout}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Thanh nút bấm mở popup riêng: Thêm giảng viên & Thêm từ Excel */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnPrimary]}
          onPress={handleOpenAdd}
        >
          <Text style={styles.btnText}>➕ Thêm giảng viên</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnSuccess]}
          onPress={() => setShowExcelModal(true)}
        >
          <Text style={styles.btnText}>📊 Thêm nhiều giảng viên bằng Excel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnGray]}
          onPress={handleExportAll}
        >
          <Text style={styles.btnText}>📤 Xuất toàn bộ ra Excel ({list.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Bộ lọc và tìm kiếm */}
      <GiangVienFilters
        search={search}
        onSearch={setSearch}
        imgFilter={imgFilter}
        onImgFilter={setImgFilter}
        sort={sort}
        onSort={setSort}
      />

      {/* Tiêu đề danh sách */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>
          Danh sách giảng viên ({filteredUsers.length}/{list.length})
        </Text>
        {filteredUsers.length > 0 && (
          <Text style={styles.listSubtitle}>
            Trang {safePage}/{totalPages}
          </Text>
        )}
      </View>

      {/* Thanh chọn nhiều: tick cả trang, xóa / xuất các mục đã chọn */}
      {filteredUsers.length > 0 && (
        <View
          style={{
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            borderRadius: 14,
            padding: 12,
            marginBottom: 10,
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <TouchableOpacity
              onPress={toggleAllPage}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Checkbox state={pageState} />
              <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                Chọn tất cả ở trang này ({paginatedUsers.length})
              </Text>
            </TouchableOpacity>
            <Text style={{ color: "#64748b", fontWeight: "600" }}>
              Đã chọn {selectedCount}
            </Text>
          </View>

          {selectedCount > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#dc2626" }]}
                onPress={handleDeleteSelected}
              >
                <Text style={styles.btnText}>🗑️ Xóa đã chọn ({selectedCount})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSuccess]}
                onPress={handleExportSelected}
              >
                <Text style={styles.btnText}>
                  📤 Xuất Excel đã chọn ({selectedCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnGray]}
                onPress={clearSelection}
              >
                <Text style={styles.btnText}>Bỏ chọn</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const footer =
    filteredUsers.length > 0 ? (
      <View style={styles.paginationWrap}>
        <Text style={styles.paginationInfo}>
          Hiển thị {startIdx + 1}–
          {Math.min(startIdx + PAGE_SIZE, filteredUsers.length)} trong số{" "}
          {filteredUsers.length} giảng viên
        </Text>

        <View style={styles.pageButtonsRow}>
          <TouchableOpacity
            style={[
              styles.pageBtn,
              safePage <= 1 && styles.pageBtnDisabled,
            ]}
            disabled={safePage <= 1}
            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <Text style={styles.pageBtnText}>‹ Trước</Text>
          </TouchableOpacity>

          {pageNumbers.map((num) => {
            const active = num === safePage;
            return (
              <TouchableOpacity
                key={num}
                style={[styles.pageBtn, active && styles.pageBtnActive]}
                onPress={() => setCurrentPage(num)}
              >
                <Text
                  style={[
                    styles.pageBtnText,
                    active && styles.pageBtnTextActive,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[
              styles.pageBtn,
              safePage >= totalPages && styles.pageBtnDisabled,
            ]}
            disabled={safePage >= totalPages}
            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <Text style={styles.pageBtnText}>Sau ›</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null;

  return (
    <View style={styles.page}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={paginatedUsers}
        extraData={selectedIds}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.empty}>Không tìm thấy giảng viên nào</Text>
          </View>
        }
        renderItem={({ item }) => (
          <GiangVienCard
            giangVien={item}
            selected={!!selectedIds[item.id]}
            onToggle={toggleOne}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />
        )}
      />

      {/* Modal thêm / sửa giảng viên (chỉ hiện khi bấm nút) */}
      <GiangVienForm
        visible={showFormModal}
        editingItem={editingItem}
        onSubmit={handleSave}
        onCancel={handleCloseForm}
      />

      {/* Modal thêm nhiều giảng viên từ file Excel */}
      <ExcelImportModal
        visible={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        onImport={handleImportExcel}
      />
    </View>
  );
}
