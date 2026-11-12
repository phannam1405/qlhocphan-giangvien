import * as DocumentPicker from "expo-document-picker";
import { parseExcelBytes } from "./index";

// Chọn file Excel (.xlsx, .csv) từ thiết bị - dùng chung cho Web và Mobile.
// Trả về { fileName, users } hoặc null nếu người dùng hủy.
export async function pickExcelFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "text/comma-separated-values",
      "application/csv",
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const resp = await fetch(asset.uri);
  const buf = await resp.arrayBuffer();
  const items = parseExcelBytes(new Uint8Array(buf), asset.name || "");
  return { fileName: asset.name || "file_excel", items };
}
