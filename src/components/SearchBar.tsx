import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";
import { colors } from "@/constants/colors";

type Props = {
  placeholder: string;
};

export default function SearchBar({ placeholder }: Props) {
  return (
    <View
      style={{
        minHeight: 54,
        borderRadius: 20,
        borderCurve: "continuous",
        backgroundColor: colors.card,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        boxShadow: "0 8px 20px rgba(29, 36, 40, 0.08)"
      }}
    >
      <Ionicons name="search" size={21} color={colors.muted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" }}
      />
    </View>
  );
}
