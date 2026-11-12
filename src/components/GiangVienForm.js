import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { showMessage } from "../utils/alert";
import { isValidIDGV, parseSumClass } from "../utils/giangvienRules";
import { styles } from "../styles";

const EMPTY = { IDGV: "", Fullname: "", SumClass: "0", Image: "" };
const MAX_CLASS = 999;

// Form thêm / sửa hiển thị dạng Modal (chỉ hiện khi bấm nút Thêm hoặc Sửa)
export default function GiangVienForm({
  visible = false,
  editingItem,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  // Khi mở form hoặc đổi user cần sửa -> điền sẵn thông tin
  useEffect(() => {
    setForm(
      editingItem
        ? {
            IDGV: editingItem.IDGV || "",
            Fullname: editingItem.Fullname || "",
            SumClass: String(editingItem.SumClass ?? ""),
            Image: editingItem.Image || "",
          }
        : EMPTY
    );
  }, [editingItem, visible]);

  // Tổng số lớp: chỉ nhận chữ số, hoặc bấm − / + để chọn
  const changeSum = (delta) => {
    const cur = parseInt(form.SumClass, 10);
    const base = Number.isNaN(cur) ? 0 : cur;
    const next = Math.max(0, Math.min(MAX_CLASS, base + delta));
    set("SumClass")(String(next));
  };

  // Chọn ảnh -> thu nhỏ -> chuyển base64
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;

      const small = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 300 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      set("Image")("data:image/jpeg;base64," + small.base64);
    } catch (e) {
      showMessage("Không chọn được ảnh: " + e.message);
    }
  };

  const handleSubmit = async () => {
    const id = form.IDGV.trim();
    const name = form.Fullname.trim();
    if (!id || !name || !form.SumClass.trim()) {
      return showMessage("Vui lòng nhập đủ Mã giảng viên, Họ và tên, Tổng số lớp");
    }
    if (!isValidIDGV(id)) {
      return showMessage("Mã giảng viên chỉ gồm chữ, số, dấu _ hoặc -");
    }
    const sum = parseSumClass(form.SumClass);
    if (sum === null) {
      return showMessage("Tổng số lớp phải là số nguyên từ 0 trở lên");
    }
    setSaving(true);
    try {
      const ok = await onSubmit({
        IDGV: id,
        Fullname: name,
        SumClass: sum,
        Image: form.Image,
      });
      if (ok) setForm(EMPTY);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingItem ? "✏️ Sửa giảng viên" : "➕ Thêm giảng viên mới"}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.imageRow}>
              {form.Image ? (
                <Image source={{ uri: form.Image }} style={styles.preview} />
              ) : (
                <View style={styles.previewEmpty}>
                  <Text style={styles.previewEmptyText}>Chưa có ảnh</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 6 }}>
                <TouchableOpacity
                  style={[
                    styles.btn,
                    styles.btnOutline,
                    { alignSelf: "flex-start" },
                  ]}
                  onPress={pickImage}
                >
                  <Text style={styles.btnOutlineText}>
                    📷 {form.Image ? "Đổi hình ảnh" : "Chọn hình ảnh"}
                  </Text>
                </TouchableOpacity>
                {form.Image ? (
                  <TouchableOpacity onPress={() => set("Image")("")}>
                    <Text style={styles.removeText}>✕ Bỏ ảnh đã chọn</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <Text style={styles.label}>Mã giảng viên (IDGV)</Text>
            <TextInput
              style={[styles.input, editingItem && { opacity: 0.6 }]}
              placeholder="Ví dụ: GV001"
              placeholderTextColor="#94a3b8"
              value={form.IDGV}
              onChangeText={set("IDGV")}
              autoCapitalize="characters"
              editable={!editingItem}
            />

            <Text style={styles.label}>Họ và tên (Fullname)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Nguyễn Văn A"
              placeholderTextColor="#94a3b8"
              value={form.Fullname}
              onChangeText={set("Fullname")}
            />

            <Text style={styles.label}>Tổng số lớp (SumClass)</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGray, { width: 48 }]}
                onPress={() => changeSum(-1)}
              >
                <Text style={styles.btnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { flex: 1, textAlign: "center" }]}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                value={form.SumClass}
                onChangeText={(t) =>
                  set("SumClass")(t.replace(/\D/g, "").slice(0, 3))
                }
                keyboardType="number-pad"
                maxLength={3}
              />
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { width: 48 }]}
                onPress={() => changeSum(1)}
              >
                <Text style={styles.btnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGray, { flex: 1 }]}
                onPress={onCancel}
                disabled={saving}
              >
                <Text style={styles.btnText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { flex: 1.5 }]}
                onPress={handleSubmit}
                disabled={saving}
              >
                <Text style={styles.btnText}>
                  {saving
                    ? "Đang lưu..."
                    : editingItem
                    ? "Lưu cập nhật"
                    : "Thêm giảng viên"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}