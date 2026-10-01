import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppBackButton from "@/components/AppBackButton";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import type { RootStackParamList } from "@/types";

export default function QuickAddScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 640, width: "100%", alignSelf: "center" }}>
      <AppBackButton onPress={() => navigation.goBack()} />
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900" }}>Thêm nhanh</Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>Chọn cách nhập thực phẩm. Bạn luôn được kiểm tra thông tin trước khi lưu vào tủ.</Text>
      <PrimaryButton title="Thêm thủ công" icon="plus" onPress={() => navigation.navigate("AddIngredient")} />
      <PrimaryButton title="Thêm bằng thực đơn" variant="soft" icon="silverware-fork-knife" onPress={() => navigation.navigate("PantryImport", { method: "MENU" })} />
      <PrimaryButton title="Thêm bằng văn bản" variant="soft" icon="text" onPress={() => navigation.navigate("PantryImport", { method: "TEXT" })} />
      <PrimaryButton title="Ảnh thực phẩm / hóa đơn" variant="outline" icon="camera-outline" onPress={() => navigation.navigate("PantryImport", { method: "FOOD_IMAGE" })} />
    </ScrollView>
  </SafeAreaView>;
}
