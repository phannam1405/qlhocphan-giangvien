import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import * as FirebaseAuth from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyA0P1gmmkO-ftMeZAElnakzucgrfqywcz4",
  authDomain: "qlhocphan-21059.firebaseapp.com",
  projectId: "qlhocphan-21059",
  storageBucket: "qlhocphan-21059.firebasestorage.app",
  messagingSenderId: "413978811369",
  appId: "1:413978811369:web:55504aabce319b36f30978",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

// Web: dùng mặc định. Điện thoại: lưu phiên đăng nhập bằng AsyncStorage
function createAuth() {
  if (Platform.OS === "web") return FirebaseAuth.getAuth(app);
  try {
    return FirebaseAuth.initializeAuth(app, {
      persistence: FirebaseAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // Fast refresh: auth đã được khởi tạo trước đó
    return FirebaseAuth.getAuth(app);
  }
}

export const auth = createAuth();