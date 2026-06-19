import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { meals } from "@/constants/mockData";
import type { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const meal = meals.find((item) => item.id === route.params.mealId) ?? meals[0];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 30 }}>
        <View>
          <Image source={{ uri: meal.image }} style={{ width: "100%", height: 280, backgroundColor: colors.secondary }} />
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              position: "absolute",
              top: 18,
              left: 18,
              width: 46,
              height: 46,
              borderRadius: 17,
              backgroundColor: colors.card,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.82 : 1
            })}
          >
            <Ionicons name="chevron-back" size={26} color={colors.dark} />
          </Pressable>
        </View>

        <View style={{ padding: 20, gap: 18 }}>
          <Text style={{ color: colors.dark, fontSize: 31, lineHeight: 38, fontWeight: "900" }} selectable>
            {meal.name}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <CategoryChip label={meal.difficulty} icon="chef-hat" active />
            <CategoryChip label={meal.time} icon="clock-outline" />
            <CategoryChip label={`${meal.calories} kcal`} icon="fire" />
          </View>

          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderCurve: "continuous", padding: 18, gap: 14 }}>
            <Text style={{ color: colors.dark, fontSize: 20, fontWeight: "900" }} selectable>
              Nguyên liệu đang có
            </Text>
            {meal.availableIngredients.map((item) => (
              <View key={item} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={{ color: colors.text, fontWeight: "800" }} selectable>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderCurve: "continuous", padding: 18, gap: 14 }}>
            <Text style={{ color: colors.dark, fontSize: 20, fontWeight: "900" }} selectable>
              Cần mua thêm
            </Text>
            {meal.missingIngredients.map((item) => (
              <View key={item} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <MaterialCommunityIcons name="shopping" size={22} color={colors.warning} />
                <Text style={{ color: colors.text, fontWeight: "800" }} selectable>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ backgroundColor: colors.card, borderRadius: 28, borderCurve: "continuous", padding: 18, gap: 14 }}>
            <Text style={{ color: colors.dark, fontSize: 20, fontWeight: "900" }} selectable>
              Cách nấu
            </Text>
            {meal.steps.map((step, index) => (
              <View key={step} style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ width: 30, height: 30, borderRadius: 12, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: colors.primary, fontWeight: "900" }} selectable>
                    {index + 1}
                  </Text>
                </View>
                <Text style={{ flex: 1, color: colors.text, fontWeight: "700", lineHeight: 22 }} selectable>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <PrimaryButton title="Thêm vào kế hoạch hôm nay" icon="calendar-plus" />
          <PrimaryButton title="Tạo danh sách mua sắm" icon="cart" variant="outline" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
