import { View, Text, TouchableOpacity, Image } from "react-native";
import Checkbox from "./Checkbox";
import { styles } from "../styles";

export default function GiangVienCard({
  giangVien,
  selected = false,
  onToggle,
  onEdit,
  onDelete,
}) {
  return (
    <View
      style={[
        styles.card,
        selected && { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
      ]}
    >
      <TouchableOpacity
        onPress={() => onToggle(giangVien.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ marginRight: 12 }}
      >
        <Checkbox state={selected ? "checked" : "none"} />
      </TouchableOpacity>

      {giangVien.Image ? (
        <Image source={{ uri: giangVien.Image }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(giangVien.Fullname || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={styles.name} numberOfLines={1}>
          {giangVien.Fullname}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          Mã GV: {giangVien.IDGV} · Tổng số lớp: {giangVien.SumClass}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.btnSmall, styles.btnEdit]}
        onPress={() => onEdit(giangVien)}
      >
        <Text style={styles.btnEditText}>✏️ Sửa</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btnSmall, styles.btnDelete]}
        onPress={() => onDelete(giangVien)}
      >
        <Text style={styles.btnDeleteText}>🗑️ Xóa</Text>
      </TouchableOpacity>
    </View>
  );
}
