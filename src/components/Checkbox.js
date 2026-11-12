import { View, Text } from "react-native";

// state: "none" (chưa chọn) | "checked" (đã chọn) | "partial" (chọn một phần)
export default function Checkbox({ state = "none", size = 22 }) {
  const on = state !== "none";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: on ? "#2563eb" : "#94a3b8",
        backgroundColor: on ? "#2563eb" : "#ffffff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {on ? (
        <Text
          style={{
            color: "#ffffff",
            fontSize: size * 0.7,
            fontWeight: "800",
            lineHeight: size * 0.9,
          }}
        >
          {state === "partial" ? "−" : "✓"}
        </Text>
      ) : null}
    </View>
  );
}
