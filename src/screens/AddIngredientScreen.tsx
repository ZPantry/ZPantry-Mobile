import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CategoryChip from "@/components/CategoryChip";
import MealCard from "@/components/MealCard";
import PrimaryButton from "@/components/PrimaryButton";
import SearchBar from "@/components/SearchBar";
import { colors } from "@/constants/colors";
import { meals } from "@/constants/mockData";

const currentIngredients = ["Cà chua", "Xà lách", "Thịt bò", "Trứng gà", "Hành tây"];

export default function AddIngredientScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.dark, fontSize: 28, fontWeight: "900" }} selectable>
            Thêm nguyên liệu
          </Text>
          <PrimaryButton title="" icon="close" variant="soft" onPress={() => navigation.goBack()} style={{ width: 48, minHeight: 48, paddingHorizontal: 0 }} />
        </View>
        <SearchBar placeholder="Nhập nguyên liệu bạn đang có" />
        <PrimaryButton title="Quét để thêm thực phẩm nhanh" icon="barcode-scan" />

        <View style={{ gap: 12 }}>
          <Text style={{ color: colors.dark, fontSize: 20, fontWeight: "900" }} selectable>
            Nguyên liệu đang có
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {currentIngredients.map((item) => (
              <CategoryChip key={item} label={item} icon="food-apple-outline" />
            ))}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={{ color: colors.dark, fontSize: 20, fontWeight: "900" }} selectable>
            Gợi ý món ăn nhanh
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {meals.slice(0, 2).map((meal) => (
              <MealCard key={meal.id} meal={meal} compact onPress={() => navigation.navigate("RecipeDetail", { mealId: meal.id })} />
            ))}
          </ScrollView>
        </View>

        <View style={{ backgroundColor: colors.dark, borderRadius: 28, borderCurve: "continuous", padding: 20, gap: 14 }}>
          <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="receipt" size={27} color={colors.secondary} />
          </View>
          <Text style={{ color: colors.white, fontSize: 21, fontWeight: "900" }} selectable>
            Quét hóa đơn
          </Text>
          <Text style={{ color: colors.secondary, fontSize: 15, lineHeight: 22, fontWeight: "600" }} selectable>
            Cập nhật nguyên liệu trực tiếp thông qua hóa đơn mua hàng.
          </Text>
          <PrimaryButton title="Nhập nhanh" icon="flash" />
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 24, borderCurve: "continuous", padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <MaterialCommunityIcons name="lightbulb-on" size={24} color={colors.warning} />
          <Text style={{ flex: 1, color: colors.text, fontWeight: "800", lineHeight: 21 }} selectable>
            Dữ liệu đang là mock nên bạn có thể thử UI mà không cần đăng nhập hay backend.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
