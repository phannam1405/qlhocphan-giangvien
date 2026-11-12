import { Platform } from "react-native";

const MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Lưu file Excel: Web -> tải về trình duyệt, Điện thoại -> mở bảng chia sẻ / lưu file
export async function saveExcelFile(bytes, fileName) {
  if (Platform.OS === "web") {
    const blob = new Blob([bytes], { type: MIME });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  // Chỉ nạp khi chạy trên điện thoại (tránh ảnh hưởng bản web)
  const { File, Paths } = await import("expo-file-system");
  const Sharing = await import("expo-sharing");

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(bytes);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Thiết bị không hỗ trợ chia sẻ file");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: MIME,
    dialogTitle: "Xuất danh sách giảng viên",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}
