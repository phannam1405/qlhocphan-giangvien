import { View, ActivityIndicator } from "react-native";
import { styles } from "../styles";

export default function Loading() {
  return (
    <View style={[styles.page, { justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator size="large" />
    </View>
  );
}
