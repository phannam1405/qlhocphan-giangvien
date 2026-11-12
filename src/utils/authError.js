// Chuyển mã lỗi của Firebase Auth thành thông báo tiếng Việt
export function authErrorMessage(e) {
  switch (e?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Sai email hoặc mật khẩu";
    case "auth/invalid-email":
      return "Email không hợp lệ";
    case "auth/email-already-in-use":
      return "Email này đã tồn tại";
    case "auth/weak-password":
      return "Mật khẩu cần ít nhất 6 ký tự";
    case "auth/too-many-requests":
      return "Thử quá nhiều lần, vui lòng thử lại sau ít phút";
    case "auth/network-request-failed":
      return "Lỗi mạng, vui lòng kiểm tra kết nối";
    case "auth/operation-not-allowed":
      return "Chưa bật đăng nhập Email/Mật khẩu trong Firebase Authentication";
    default:
      return "Lỗi: " + (e?.message || "không xác định");
  }
}
