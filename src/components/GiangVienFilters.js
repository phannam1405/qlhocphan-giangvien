import { View, Text, TextInput, TouchableOpacity } from "react-native";
import Chip from "./Chip";
import { styles } from "../styles";

const IMG_OPTIONS = [
  ["all", "Tất cả"],
  ["has", "Có ảnh"],
  ["none", "Chưa có ảnh"],
];
const SORT_OPTIONS = [
  ["default", "Mặc định"],
  ["az", "A → Z"],
  ["za", "Z → A"],
];

export default function GiangVienFilters({
  search,
  onSearch,
  imgFilter,
  onImgFilter,
  sort,
  onSort,
}) {
  return (
    <View style={styles.filterCard}>
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo mã giảng viên hoặc họ tên..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={onSearch}
          autoCapitalize="none"
        />
        {search ? (
          <TouchableOpacity
            style={styles.clearSearchBtn}
            onPress={() => onSearch("")}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text style={styles.filterLabel}>Lọc theo ảnh đại diện</Text>
          <View style={styles.chipRow}>
            {IMG_OPTIONS.map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                active={imgFilter === key}
                onPress={() => onImgFilter(key)}
              />
            ))}
          </View>
        </View>

        <View style={{ flex: 1, minWidth: 200 }}>
          <Text style={styles.filterLabel}>Sắp xếp theo họ tên</Text>
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                active={sort === key}
                onPress={() => onSort(key)}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
