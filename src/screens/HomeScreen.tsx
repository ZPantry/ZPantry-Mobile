import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "@/components/AppHeader";
import ExpiryAlertCard from "@/components/ExpiryAlertCard";
import MealCard from "@/components/MealCard";
import NutritionCard from "@/components/NutritionCard";
import SearchBar from "@/components/SearchBar";
import { colors } from "@/constants/colors";
import { mealPlans, meals, todayNutrition } from "@/constants/mockData";

const shortcuts = [
  { label: "Quét mã", icon: "barcode-scan", target: "AddIngredient" },
  { label: "Lên kế hoạch", icon: "calendar-month", target: "Plan" },
  { label: "Thêm bữa", icon: "plus-circle", target: "AddIngredient" },
  { label: "Hỏi AI", icon: "robot-happy", target: "MealSuggestion" }
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, paddingBottom: 112, gap: 18 }}>
        <AppHeader subtitle="Chào Khang 👋" />
        <Text style={{ color: colors.dark, fontSize: 31, lineHeight: 38, fontWeight: "900" }} selectable>
          Hôm nay bạn muốn ăn gì?
        </Text>
        <SearchBar placeholder="Tìm kiếm món ăn, calories..." />

        <View style={{ flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
          {shortcuts.map((item) => (
            <View key={item.label} style={{ flex: 1, alignItems: "center", gap: 8 }} onTouchEnd={() => navigation.navigate(item.target)}>
              <View style={{ width: 58, height: 58, borderRadius: 21, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(29, 36, 40, 0.08)" }}>
                <MaterialCommunityIcons name={item.icon as never} size={27} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800", textAlign: "center" }} selectable>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        <NutritionCard metrics={todayNutrition} />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, borderRadius: 24, borderCurve: "continuous", backgroundColor: colors.card, padding: 16, gap: 10 }}>
            <Ionicons name="water" size={24} color="#38BDF8" />
            <Text style={{ color: colors.dark, fontWeight: "900", fontSize: 16 }} selectable>
              Lượng nước
            </Text>
            <Text style={{ color: colors.muted, fontWeight: "800" }} selectable>
              1.2L / 2L
            </Text>
          </View>
          <View style={{ flex: 1, borderRadius: 24, borderCurve: "continuous", backgroundColor: colors.dark, padding: 16, gap: 10 }}>
            <MaterialCommunityIcons name="sprout" size={24} color={colors.success} />
            <Text style={{ color: colors.white, fontWeight: "900", fontSize: 16 }} selectable>
              Giảm lãng phí
            </Text>
            <Text style={{ color: colors.secondary, fontWeight: "800" }} selectable>
              65% hoàn thành
            </Text>
          </View>
        </View>

        <ExpiryAlertCard title="Bạn đang thiếu 15g Protein hôm nay" />

        <View style={{ gap: 12 }}>
          <Text style={{ color: colors.dark, fontSize: 21, fontWeight: "900" }} selectable>
            AI đề xuất thực đơn hôm nay
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {meals.slice(0, 3).map((meal) => (
              <MealCard key={meal.id} meal={meal} compact onPress={() => navigation.navigate("RecipeDetail", { mealId: meal.id })} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={{ color: colors.dark, fontSize: 21, fontWeight: "900" }} selectable>
            Bữa ăn hôm nay
          </Text>
          {mealPlans.map((plan) => (
            <View key={plan.id} style={{ backgroundColor: colors.card, borderRadius: 22, borderCurve: "continuous", padding: 16, flexDirection: "row", alignItems: "center", gap: 13 }}>
              <Ionicons name={plan.icon as never} size={24} color={colors.primary} />
              <View>
                <Text style={{ color: colors.muted, fontWeight: "800" }} selectable>
                  Bữa {plan.time.toLowerCase()}
                </Text>
                <Text style={{ color: colors.dark, fontWeight: "900", fontSize: 16 }} selectable>
                  {plan.title}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
