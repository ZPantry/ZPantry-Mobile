import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "@/components/AppHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { mealPlans, weeklyPlan } from "@/constants/mockData";

export default function PlanScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, paddingBottom: 112, gap: 18 }}>
        <AppHeader title="Kế hoạch hôm nay" subtitle="Sáng, trưa, tối rõ ràng để không phải nghĩ nhiều" />

        <View style={{ gap: 14 }}>
          {mealPlans.map((plan, index) => (
            <View key={plan.id} style={{ flexDirection: "row", gap: 14 }}>
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={plan.icon as never} size={22} color={colors.primary} />
                </View>
                {index < mealPlans.length - 1 ? <View style={{ width: 3, flex: 1, minHeight: 52, backgroundColor: colors.secondary, marginTop: 8 }} /> : null}
              </View>
              <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 26, borderCurve: "continuous", padding: 18, gap: 8, boxShadow: "0 8px 20px rgba(29, 36, 40, 0.08)" }}>
                <Text style={{ color: colors.primary, fontWeight: "900" }} selectable>
                  Bữa {plan.time.toLowerCase()}
                </Text>
                <Text style={{ color: colors.dark, fontSize: 19, fontWeight: "900" }} selectable>
                  {plan.title}
                </Text>
                <Text style={{ color: colors.muted, fontWeight: "700", lineHeight: 21 }} selectable>
                  {plan.note}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: colors.dark, borderRadius: 28, borderCurve: "continuous", padding: 20, gap: 12 }}>
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: "900" }} selectable>
            Planning 7 days later
          </Text>
          <Text style={{ color: colors.secondary, fontWeight: "700", lineHeight: 21 }} selectable>
            Gợi ý thực đơn một tuần, ưu tiên nguyên liệu sắp hết hạn trước.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 4 }}>
            {weeklyPlan.map((item) => (
              <View key={item.day} style={{ width: 118, minHeight: 134, borderRadius: 22, borderCurve: "continuous", backgroundColor: "rgba(255,255,255,0.10)", padding: 14, gap: 10 }}>
                <Text style={{ color: colors.secondary, fontWeight: "900", fontSize: 16 }} selectable>
                  {item.day}
                </Text>
                <Text style={{ color: colors.white, fontWeight: "900", lineHeight: 20 }} selectable>
                  {item.meal}
                </Text>
                <Text style={{ color: colors.secondary, fontWeight: "800" }} selectable>
                  {item.kcal} kcal
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <PrimaryButton title="Tối ưu lại kế hoạch" icon="auto-fix" />
      </ScrollView>
    </SafeAreaView>
  );
}
