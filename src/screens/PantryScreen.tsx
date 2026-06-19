import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "@/components/AppHeader";
import CategoryChip from "@/components/CategoryChip";
import ExpiryAlertCard from "@/components/ExpiryAlertCard";
import PantryItemCard from "@/components/PantryItemCard";
import { colors } from "@/constants/colors";
import { categories, pantryItems } from "@/constants/mockData";

export default function PantryScreen() {
  const [active, setActive] = useState("Ngăn mát");
  const navigation = useNavigation<any>();
  const filtered = active === "Ngăn đông" ? pantryItems.filter((item) => item.location === "Ngan dong") : pantryItems.filter((item) => item.location === "Ngan mat");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 18 }}>
        <AppHeader title="Tủ lạnh của Khang" subtitle="Theo dõi hạn dùng và dùng đồ tươi trước" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {categories.map((category) => (
            <CategoryChip
              key={category}
              label={category}
              active={active === category}
              icon={category === "Ngăn đông" ? "snowflake" : category === "Thêm thực phẩm" ? "plus" : "fridge-outline"}
              onPress={() => (category === "Thêm thực phẩm" ? navigation.navigate("AddIngredient") : setActive(category))}
            />
          ))}
        </ScrollView>
        <ExpiryAlertCard title="Sữa tươi hết hạn hôm nay. Ưu tiên dùng cho bữa sáng nhé." tone="danger" />
        <View style={{ gap: 12 }}>
          {filtered.map((item) => (
            <PantryItemCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
      <Pressable
        onPress={() => navigation.navigate("AddIngredient")}
        style={({ pressed }) => ({
          position: "absolute",
          right: 22,
          bottom: 96,
          width: 62,
          height: 62,
          borderRadius: 24,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
          boxShadow: "0 12px 28px rgba(244, 166, 58, 0.35)"
        })}
      >
        <MaterialCommunityIcons name="plus" size={32} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}
