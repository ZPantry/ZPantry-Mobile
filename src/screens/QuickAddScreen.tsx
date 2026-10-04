import Text from "@/components/AppText";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import type { RootStackParamList } from "@/types";

export default function QuickAddScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 640, width: "100%", alignSelf: "center" }}>

      <Text style={{ color: colors.text, fontSize: 26, fontWeight: "700" }}>Thêm nhanh</Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>Chọn cách nhập thực phẩm. Bạn luôn được kiểm tra thông tin trước khi lưu vào tủ.</Text>
      <View style={{ backgroundColor: colors.dark, padding: 20, borderRadius: 20, gap: 10 }}>
        <Text style={{ color: colors.onDark, fontSize: 20, fontWeight: "700" }}>Căn bếp gọn, bữa ăn đủ đầy</Text>
        <Text style={{ color: colors.onDarkMuted, lineHeight: 22 }}>Nhập một lần, kiểm tra từng nguyên liệu và dùng ngay để lên thực đơn.</Text>
      </View>
      <AddMethod title="Thêm thủ công" description="Tìm trong danh mục, nhập lượng và hạn sử dụng." icon="plus" onPress={() => navigation.navigate("AddIngredient")} />
      <AddMethod title="Ảnh thực phẩm / hóa đơn" description="Tự nhận diện loại ảnh, kiểm tra kết quả trước khi lưu." icon="camera-outline" badge="Nhận diện tự động" onPress={() => navigation.navigate("PantryImport", { method: "FOOD_IMAGE" })} />
      <AddMethod title="Thêm bằng thực đơn" description="Lấy nguyên liệu từ các món đã lên lịch, theo đúng khẩu phần." icon="silverware-fork-knife" onPress={() => navigation.navigate("PantryImport", { method: "MENU" })} />
    </ScrollView>
  </SafeAreaView>;
}
function AddMethod({ title, description, icon, badge, onPress }: { title: string; description: string; icon: ComponentProps<typeof MaterialCommunityIcons>["name"]; badge?: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ backgroundColor: colors.surface, padding: 18, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: colors.line, boxShadow: "0 2px 8px rgba(0,48,20,0.04)", opacity: pressed ? 0.8 : 1 })}>
    <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name={icon} size={25} color={colors.primaryDark} /></View>
    <View style={{ flex: 1, gap: 6 }}>
      {badge ? <Text style={{ color: colors.success, fontSize: 11, fontWeight: "600" }}>{badge}</Text> : null}
      <Text style={{ color: colors.dark, fontSize: 16, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: colors.muted, lineHeight: 20, fontSize: 13 }}>{description}</Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
  </Pressable>;
}
