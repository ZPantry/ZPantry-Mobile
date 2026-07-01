import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, View } from "react-native";
import { colors } from "@/constants/colors";

type Props = {
  placeholder: string;
  actionLabel?: string;
  value?: string;
  onChangeText?: (value: string) => void;
};

export default function SearchBar({ placeholder, actionLabel = "Tìm kiếm", value, onChangeText }: Props) {
  return (
    <View
      style={{
        minHeight: 48,
        borderRadius: 999,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        boxShadow: "0 10px 22px rgba(0,0,0,0.16)"
      }}
    >
      <Ionicons name="search" size={21} color={colors.white} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "700", paddingVertical: 0 }} />
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }} selectable>
        {actionLabel}
      </Text>
    </View>
  );
}
