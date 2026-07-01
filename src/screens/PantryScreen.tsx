import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { PantryApiItem } from "@/api/pantry";
import { pantryApi } from "@/api/pantry";
import CategoryChip from "@/components/CategoryChip";
import ExpiryAlertCard from "@/components/ExpiryAlertCard";
import PantryItemCard from "@/components/PantryItemCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import type { PantryItem, PantryStatus } from "@/types";

const pantryCategories = ["Ngăn mát", "Ngăn đông", "Kệ bếp", "Thêm thực phẩm"];

type PantryListItem = PantryItem & {
  apiItem: PantryApiItem;
  ingredient?: Ingredient;
};

function normalizeLocation(location: string): PantryItem["location"] {
  const lower = location.toLowerCase();
  if (lower.includes("đông") || lower.includes("dong")) return "Ngan dong";
  return "Ngan mat";
}

function statusFromDate(expiredAt: string): PantryStatus {
  const daysLeft = Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 1) return "danger";
  if (daysLeft <= 5) return "warning";
  return "safe";
}

function expiryLabel(expiredAt: string) {
  const daysLeft = Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return `Đã hết hạn ${Math.abs(daysLeft)} ngày`;
  if (daysLeft === 0) return "Hết hạn hôm nay";
  if (daysLeft === 1) return "Hết hạn ngày mai";
  return `Hết hạn sau ${daysLeft} ngày`;
}

function progressFromDate(expiredAt: string) {
  const daysLeft = Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(8, Math.min(100, daysLeft * 12));
}

function iconForCategory(category?: string) {
  const value = (category || "").toLowerCase();
  if (value.includes("fish") || value.includes("cá")) return "fish";
  if (value.includes("meat") || value.includes("thịt")) return "food-steak";
  if (value.includes("fruit") || value.includes("trái")) return "fruit-cherries";
  if (value.includes("grain") || value.includes("gạo")) return "rice";
  if (value.includes("protein") || value.includes("trứng")) return "egg";
  return "leaf";
}

function mapPantryItem(item: PantryApiItem, ingredient?: Ingredient): PantryListItem {
  return {
    id: item.id,
    name: ingredient?.name || item.note || "Thực phẩm",
    quantity: `${item.quantity} ${item.unit}`,
    location: normalizeLocation(item.storageLocation),
    expiryLabel: expiryLabel(item.expiredAt),
    status: statusFromDate(item.expiredAt),
    icon: iconForCategory(ingredient?.category),
    progress: progressFromDate(item.expiredAt),
    apiItem: item,
    ingredient
  };
}

export default function PantryScreen() {
  const [active, setActive] = useState("Ngăn mát");
  const [items, setItems] = useState<PantryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const displayName = user?.fullName || "bạn";

  const loadPantry = useCallback(async () => {
    if (!user?.userId) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const [ingredientPage, pantryPage] = await Promise.all([ingredientsApi.list(1, 100), pantryApi.list(user.userId, 1, 100)]);
      const ingredientById = new Map(ingredientPage.data.map((ingredient) => [ingredient.id, ingredient]));
      setItems(pantryPage.data.map((item) => mapPantryItem(item, ingredientById.get(item.ingredientId))));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được tủ lạnh.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId]);

  useFocusEffect(
    useCallback(() => {
      loadPantry();
    }, [loadPantry])
  );

  const filtered = useMemo(() => {
    if (active === "Ngăn đông") return items.filter((item) => item.location === "Ngan dong");
    if (active === "Kệ bếp") return items.filter((item) => item.location === "Ngan mat" && item.name.toLowerCase().includes("gạo"));
    return items.filter((item) => item.location === "Ngan mat");
  }, [active, items]);

  const expiringItem = items.find((item) => item.status === "danger" || item.status === "warning");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadPantry} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 22, paddingBottom: 118, gap: 18 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }} selectable>
              Quay lại
            </Text>
          </Pressable>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            <View style={{ position: "absolute", top: 3, right: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger }} />
          </View>
        </View>

        <View>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }} selectable>
            Tủ lạnh của {displayName}
          </Text>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "900", marginTop: 3 }} selectable>
            {items.length} thực phẩm đang lưu trữ
          </Text>
        </View>

        {errorMessage ? <ExpiryAlertCard title={errorMessage} tone="danger" /> : null}
        {expiringItem ? <ExpiryAlertCard title={`${expiringItem.name} ${expiringItem.expiryLabel.toLowerCase()}. Ưu tiên dùng sớm để tránh lãng phí.`} tone={expiringItem.status === "danger" ? "danger" : "warning"} /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {pantryCategories.map((category) => (
            <CategoryChip
              key={category}
              label={category}
              active={active === category}
              icon={category === "Ngăn đông" ? "snowflake" : category === "Thêm thực phẩm" ? "plus" : "fridge-outline"}
              onPress={() => (category === "Thêm thực phẩm" ? navigation.navigate("AddIngredient") : setActive(category))}
            />
          ))}
        </ScrollView>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
              {active}
            </Text>
            <View style={{ borderRadius: 999, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.line }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }} selectable>
                {filtered.length} món
              </Text>
            </View>
          </View>

          {filtered.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
                Chưa có thực phẩm ở mục này
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
                Bấm thêm thực phẩm để lưu nguyên liệu bạn đang có.
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <PantryItemCard
                key={item.id}
                item={item}
                onPress={() =>
                  navigation.navigate("PantryItemDetail", {
                    pantryItem: item.apiItem,
                    ingredient: item.ingredient
                  })
                }
              />
            ))
          )}
        </View>

        <Pressable
          onPress={() => navigation.navigate("AddIngredient")}
          style={({ pressed }) => ({
            minHeight: 64,
            borderRadius: 32,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.line,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 6,
            gap: 16,
            opacity: pressed ? 0.82 : 1
          })}
        >
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="plus" size={30} color={colors.white} />
          </View>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
            Thêm thực phẩm
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
