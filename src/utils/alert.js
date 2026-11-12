import { Alert, Platform } from "react-native";

const isWeb = Platform.OS === "web";

// Alert.alert có nút bấm không chạy trên web, nên tách riêng
export function showMessage(msg) {
  if (isWeb) window.alert(msg);
  else Alert.alert("Thông báo", msg);
}

export function confirmDelete(msg, onOk) {
  if (isWeb) {
    if (window.confirm(msg)) onOk();
  } else {
    Alert.alert("Xác nhận", msg, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: onOk },
    ]);
  }
}
