import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { pickExcelFile } from "../utils/excel/pickExcelFile";
import { showMessage } from "../utils/alert";
import { styles } from "../styles";

export default function ExcelImportModal({ visible, onClose, onImport }) {
  const [parsedItems, setParsedItems] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const resetState = () => {
    setParsedItems([]);
    setFileName("");
    setImporting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Chọn file Excel từ thiết bị (Web hoặc Mobile)
  const handlePickFile = async () => {
    try {
      const res = await pickExcelFile();
      if (!res) return;
      if (!res.items.length) {
        return showMessage(
          "Không đọc được giảng viên nào từ file đã chọn. Hãy kiểm tra các cột IDGV, Fullname, SumClass!"
        );
      }
      setFileName(res.fileName);
      setParsedItems(res.items);
    } catch (e) {
      showMessage("Không đọc được file Excel: " + e.message);
    }
  };

  // Lưu hàng loạt vào Firestore
  const handleConfirmImport = async () => {
    if (!parsedItems.length) {
      return showMessage("Vui lòng chọn file Excel trước khi nhập!");
    }
    setImporting(true);
    try {
      const ok = await onImport(parsedItems);
      if (ok) {
        handleClose();
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📊 Thêm nhiều giảng viên bằng Excel</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.excelHintBox}>
              <Text style={styles.excelHintTitle}>
                Hướng dẫn định dạng file Excel (.xlsx, .csv):
              </Text>
              <Text style={styles.excelHintText}>
                • Dòng 1 (Tiêu đề): IDGV | Fullname | SumClass{"\n"}• Từ dòng 2 trở
                đi: Thông tin từng giảng viên (SumClass là số nguyên từ 0 trở
                lên, cột Image có hay không đều được).
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handlePickFile}
              disabled={importing}
            >
              <Text style={styles.btnText}>
                📂 Chọn file Excel (.xlsx, .csv) từ máy
              </Text>
            </TouchableOpacity>

            {parsedItems.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>
                  Đã đọc {parsedItems.length} giảng viên từ file:{" "}
                  <Text style={{ color: "#2563eb" }}>{fileName}</Text>
                </Text>

                <ScrollView
                  style={styles.excelPreviewBox}
                  nestedScrollEnabled
                >
                  {parsedItems.map((g, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.excelPreviewRow,
                        idx === parsedItems.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <Text style={styles.excelPreviewName} numberOfLines={1}>
                        {idx + 1}. {g.Fullname}
                      </Text>
                      <Text style={styles.excelPreviewEmail} numberOfLines={1}>
                        Mã GV: {g.IDGV} · Số lớp: {g.SumClass}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGray, { flex: 1 }]}
                onPress={handleClose}
                disabled={importing}
              >
                <Text style={styles.btnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnSuccess,
                  { flex: 1.6, opacity: parsedItems.length ? 1 : 0.5 },
                ]}
                onPress={handleConfirmImport}
                disabled={importing || !parsedItems.length}
              >
                <Text style={styles.btnText}>
                  {importing
                    ? "Đang thêm..."
                    : `Nhập ${parsedItems.length || ""} giảng viên vào hệ thống`}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
