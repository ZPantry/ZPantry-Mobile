import { useNavigation } from "@react-navigation/native";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "@/components/AppHeader";
import CategoryChip from "@/components/CategoryChip";
import MealCard from "@/components/MealCard";
import { colors } from "@/constants/colors";
import { meals } from "@/constants/mockData";

export default function MealSuggestionScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <FlatList
        data={meals.slice(0, 4)}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, paddingBottom: 112, gap: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <AppHeader title="AI đề xuất thực đơn" subtitle="Dựa trên nguyên liệu bạn đang có" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <CategoryChip label="Phù hợp nhất" active icon="star" />
              <CategoryChip label="Nhanh gọn" icon="clock-outline" />
              <CategoryChip label="Ít calories" icon="fire" />
            </View>
            <Text style={{ color: colors.dark, fontSize: 20, fontWeight: "900" }} selectable>
              Công thức nên thử
            </Text>
          </View>
        }
        renderItem={({ item }) => <MealCard meal={item} onPress={() => navigation.navigate("RecipeDetail", { mealId: item.id })} />}
      />
    </SafeAreaView>
  );
}
