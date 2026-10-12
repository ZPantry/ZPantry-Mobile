import Text from "@/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, View } from "react-native";
import { colors } from "@/constants/colors";
import { layoutTokens } from "@/constants/responsive";

type Props = {
  placeholder: string;
  actionLabel?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
  onActionPress?: () => void;
};

export default function SearchBar({ placeholder, actionLabel = "Tìm kiếm", value, onChangeText, onSubmit, onActionPress }: Props) {
  return (
    <View
      style={{
        minHeight: 48,
        borderRadius: 10,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: "#B7C2B9",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        boxShadow: "0 2px 6px rgba(0,48,20,0.04)"
      }}
    >
      <Ionicons name="search" size={19} color={colors.muted} />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        blurOnSubmit
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{ flex: 1, minWidth: 0, color: colors.text, fontSize: 14, fontWeight: "600", paddingVertical: 8 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onActionPress || onSubmit}
        hitSlop={layoutTokens.hitSlop48From36}
        style={({ pressed }) => ({ minHeight: 36, justifyContent: "center", opacity: pressed ? 0.72 : 1 })}
      >
        <Text
          maxFontSizeMultiplier={layoutTokens.maxFontScaleCaps.button}
          style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}
          selectable={false}
        >
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}
