import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";

const AuthContext = createContext(null);

// Chuyển user của Firebase thành object gọn dùng trong app
const toAppUser = (u) =>
  u
    ? {
        id: u.uid,
        email: u.email || "",
        hoten: u.displayName || u.email || "",
      }
    : null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // đang khôi phục phiên đăng nhập

  // Firebase tự khôi phục phiên đã lưu và báo lại ở đây
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(toAppUser(u));
      setLoading(false);
    });
  }, []);

  const login = async (email, matkhau) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), matkhau);
    return toAppUser(cred.user);
  };

  // Họ tên lưu ở hồ sơ Firebase Auth, KHÔNG lưu vào Firestore
  const register = async (email, matkhau, hoten) => {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      matkhau
    );
    await updateProfile(cred.user, { displayName: hoten.trim() });
    setUser(toAppUser(auth.currentUser));
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
