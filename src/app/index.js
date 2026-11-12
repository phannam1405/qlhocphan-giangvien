import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Redirect } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../auth";
import { authErrorMessage } from "../utils/authError";
import { showMessage } from "../utils/alert";
import Loading from "../components/Loading";
import { styles } from "../styles";

// Vân tay: chỉ khi người dùng chọn "Bật", email + mật khẩu được lưu mã hóa
// trong SecureStore (Keychain / Keystore) của chính điện thoại này.
const BIO_KEY = "bio_accounts"; // { email: matkhau }
const LAST_KEY = "last_email"; // email đăng nhập gần nhất trên máy này
const OLD_KEYS = ["saved_login", "bio_user_ids", "last_user_id"]; // key cũ -> dọn
const isWeb = Platform.OS === "web";

async function readBioAccounts() {
  try {
    return JSON.parse((await SecureStore.getItemAsync(BIO_KEY)) || "{}");
  } catch (e) {
    return {};
  }
}

async function writeBioAccounts(map) {
  await SecureStore.setItemAsync(BIO_KEY, JSON.stringify(map));
}

export default function Login() {
  const { user, loading: restoring, login, register } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [matkhau, setMatkhau] = useState("");
  const [hoten, setHoten] = useState("");
  const [canBio, setCanBio] = useState(false); // máy có vân tay và đã đăng ký
  const [bioAccounts, setBioAccounts] = useState({}); // tài khoản đã bật vân tay
  const [lastEmail, setLastEmail] = useState(null); // người đăng nhập gần nhất
  const [loading, setLoading] = useState(false);
  const [holding, setHolding] = useState(false); // giữ lại màn đăng nhập khi đang hỏi bật vân tay

  useEffect(() => {
    if (isWeb) return;
    (async () => {
      try {
        for (const k of OLD_KEYS) await SecureStore.deleteItemAsync(k);

        const hw = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const ok = hw && enrolled;
        setCanBio(ok);

        if (!ok) {
          // Máy không còn vân tay -> xóa danh sách đã bật
          await SecureStore.deleteItemAsync(BIO_KEY);
          setBioAccounts({});
        } else {
          setBioAccounts(await readBioAccounts());
        }
        setLastEmail(await SecureStore.getItemAsync(LAST_KEY));
      } catch (e) {}
    })();
  }, []);

  // Đang khôi phục phiên / đã đăng nhập -> không hiện form login
  if (restoring) return <Loading />;
  if (user && !holding) return <Redirect href="/admin" />;

  // Đăng nhập bằng email + mật khẩu (Firebase Authentication)
  const handleLogin = async () => {
    if (!email.trim() || !matkhau) {
      return showMessage("Vui lòng nhập email và mật khẩu");
    }
    const key = email.trim().toLowerCase();
    const askBio = !isWeb && canBio && !bioAccounts[key];

    setLoading(true);
    if (askBio) setHolding(true); // chưa chuyển trang vội, còn phải hỏi vân tay
    try {
      await login(email, matkhau);

      if (!isWeb) {
        await SecureStore.setItemAsync(LAST_KEY, key);
        setLastEmail(key);
      }

      // Tài khoản này chưa bật vân tay -> hỏi bật (chỉ trên điện thoại)
      if (askBio) {
        Alert.alert(
          "Vân tay",
          "Bật đăng nhập bằng vân tay cho tài khoản này?",
          [
            { text: "Không", style: "cancel", onPress: () => setHolding(false) },
            {
              text: "Bật",
              onPress: async () => {
                const next = { ...bioAccounts, [key]: matkhau };
                await writeBioAccounts(next);
                setBioAccounts(next);
                setHolding(false);
              },
            },
          ],
          { cancelable: false }
        );
      }
    } catch (e) {
      setHolding(false);
      showMessage(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập bằng cảm biến vân tay thật của điện thoại
  const handleBiometric = async () => {
    try {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hw || !enrolled) {
        return showMessage(
          "Thiết bị này chưa cài đặt vân tay. Vui lòng thêm vân tay trong Cài đặt máy trước!"
        );
      }

      // Gọi cảm biến vân tay của hệ điều hành với thông báo yêu cầu đặt ngón tay vào
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Vui lòng bỏ ngón tay vào cảm biến để đăng nhập",
        cancelLabel: "Hủy",
        disableDeviceFallback: true,
      });

      // Chỉ cho phép tiếp tục khi quét vân tay thật trên máy thành công
      if (!result.success) return;

      // Chọn tài khoản: email đang nhập -> người đăng nhập gần nhất -> tài khoản đầu tiên đã bật
      const typed = email.trim().toLowerCase();
      let key = typed && bioAccounts[typed] ? typed : null;
      if (!key) {
        const saved = lastEmail || (await SecureStore.getItemAsync(LAST_KEY));
        if (saved && bioAccounts[saved]) key = saved;
      }
      if (!key) key = Object.keys(bioAccounts)[0] || null;

      if (!key) {
        return showMessage(
          "Chưa có tài khoản nào bật vân tay. Hãy đăng nhập bằng mật khẩu và chọn bật vân tay trước!"
        );
      }

      setLoading(true);
      try {
        await login(key, bioAccounts[key]);
        await SecureStore.setItemAsync(LAST_KEY, key);
        setLastEmail(key);
      } catch (e) {
        // Mật khẩu đã đổi -> bỏ vân tay của tài khoản này, bắt đăng nhập lại
        if (e?.code === "auth/invalid-credential") {
          const next = { ...bioAccounts };
          delete next[key];
          await writeBioAccounts(next);
          setBioAccounts(next);
          showMessage("Mật khẩu đã thay đổi, vui lòng đăng nhập lại bằng mật khẩu");
        } else {
          showMessage(authErrorMessage(e));
        }
      } finally {
        setLoading(false);
      }
    } catch (e) {
      showMessage("Lỗi vân tay: " + e.message);
    }
  };

  // Đăng ký tài khoản mới (Firebase Authentication)
  const handleRegister = async () => {
    if (!email.trim() || !matkhau || !hoten.trim()) {
      return showMessage("Vui lòng nhập đủ email, mật khẩu, họ tên");
    }
    setLoading(true);
    try {
      await register(email, matkhau, hoten);
    } catch (e) {
      showMessage(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.loginWrap}>
      <View style={styles.loginCard}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandIcon}>👥</Text>
        </View>
        <Text style={styles.brand}>Quản lý người dùng</Text>
        <Text style={styles.subtitle}>
          {isLogin
            ? "Đăng nhập hệ thống quản trị viên"
            : "Tạo tài khoản quản trị mới"}
        </Text>

        {/* Thanh chuyển đổi chế độ Đăng nhập / Đăng ký */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, isLogin && styles.modeTabActive]}
            onPress={() => setMode("login")}
          >
            <Text
              style={[styles.modeTabText, isLogin && styles.modeTabTextActive]}
            >
              Đăng nhập
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, !isLogin && styles.modeTabActive]}
            onPress={() => setMode("register")}
          >
            <Text
              style={[styles.modeTabText, !isLogin && styles.modeTabTextActive]}
            >
              Đăng ký
            </Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Nguyễn Văn A"
              placeholderTextColor="#94a3b8"
              value={hoten}
              onChangeText={setHoten}
            />
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: nam@gmail.com"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập mật khẩu"
          placeholderTextColor="#94a3b8"
          value={matkhau}
          onChangeText={setMatkhau}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, { marginTop: 18 }]}
          onPress={isLogin ? handleLogin : handleRegister}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}
          </Text>
        </TouchableOpacity>

        {/* Nút đăng nhập bằng vân tay: CHỈ hiện trên điện thoại (!isWeb) và LUÔN hiện ở tab Đăng nhập */}
        {isLogin && !isWeb && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnBio]}
              onPress={handleBiometric}
              disabled={loading}
            >
              <Text style={{ fontSize: 18 }}>🫆</Text>
              <Text style={styles.btnText}>Đăng nhập bằng vân tay</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          onPress={() => setMode(isLogin ? "register" : "login")}
        >
          <Text style={styles.linkText}>
            {isLogin
              ? "Chưa có tài khoản? Đăng ký ngay"
              : "Đã có tài khoản? Quay lại đăng nhập"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
