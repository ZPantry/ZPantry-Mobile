import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { PantryApiItem } from "@/api/pantry";
import { pantryApi } from "@/api/pantry";
import AppBackButton from "@/components/AppBackButton";
import CategoryChip from "@/components/CategoryChip";
import ExpiryAlertCard from "@/components/ExpiryAlertCard";
import PantryItemCard from "@/components/PantryItemCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import type { PantryItem, PantryStatus } from "@/types";
import { getFriendlyErrorMessage } from "@/utils/localize";
import PrimaryButton from "@/components/PrimaryButton";

const pantryCategories = ["Ngăn mát", "Ngăn đông", "Kệ bếp"];

type PantryListItem = PantryItem & {
  apiItem: PantryApiItem;
  ingredient?: Ingredient;
};

function normalizeLocation(location: string): PantryItem["location"] {
  const lower = location.toLowerCase();
  if (lower.includes("đông") || lower.includes("dong") || lower.includes("freeze")) return "Ngan dong";
  if (lower === "pantry" || lower.includes("kệ") || lower.includes("bep") || lower.includes("shelf")) return "Ke bep";
  return "Ngan mat";
}

function statusFromDate(expiredAt: string): PantryStatus {
  if (!expiredAt) return "safe";
  const daysLeft = Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 1) return "danger";
  if (daysLeft <= 5) return "warning";
  return "safe";
}

function expiryLabel(expiredAt: string) {
  if (!expiredAt) return "Chưa có hạn sử dụng";
  const daysLeft = Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return `Đã hết hạn ${Math.abs(daysLeft)} ngày`;
  if (daysLeft === 0) return "Hết hạn hôm nay";
  if (daysLeft === 1) return "Hết hạn ngày mai";
  return `Hết hạn sau ${daysLeft} ngày`;
}

function progressFromDate(expiredAt: string) {
  if (!expiredAt) return 0;
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
    name: ingredient?.name || item.ingredientName || item.note || "Thực phẩm",
    quantity: `${item.quantity} ${item.unit}`,
    location: normalizeLocation(item.storageLocation),
    expiryLabel: expiryLabel(item.expiredAt),
    status: statusFromDate(item.expiredAt),
    icon: iconForCategory(ingredient?.category),
    imageUrl: ingredient?.imageUrl,
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
  const { user, onboardingStep, completeOnboardingStep } = useAuth();
  const displayName = user?.fullName || "bạn";
  const [showExpiry, setShowExpiry] = useState(false);
  const notified = useRef("");

  const loadPantry = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [ingredientPage, pantryItems] = await Promise.all([ingredientsApi.all().then(data => ({ data })), pantryApi.all()]);
      const ingredientById = new Map(ingredientPage.data.map((ingredient) => [ingredient.id, ingredient]));
      setItems(pantryItems.map((item) => mapPantryItem(item, ingredientById.get(item.ingredientId))));
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tải được tủ lạnh."));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPantry();
    }, [loadPantry])
  );

  const filtered = useMemo(() => {
    if (active === "Ngăn đông") return items.filter((item) => item.location === "Ngan dong");
    if (active === "Kệ bếp") return items.filter((item) => item.location === "Ke bep");
    return items.filter((item) => item.location === "Ngan mat");
  }, [active, items]);

  const expiringItems = items.filter((item) => item.status === "danger" || item.status === "warning");
  const expiryKey = expiringItems.map(item => item.id + item.apiItem.expiredAt).sort().join("|");
  useEffect(() => {
    if (expiryKey && notified.current !== expiryKey && onboardingStep === "done") {
      notified.current = expiryKey;
      setShowExpiry(true);
    }
  }, [expiryKey, onboardingStep]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadPantry} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24, gap: 14 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppBackButton onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))} />
          <Pressable accessibilityRole="button" accessibilityLabel="Thông báo hạn dùng" onPress={() => setShowExpiry(true)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            {expiringItems.length ? <View style={{ position: "absolute", top: 5, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} /> : null}
          </Pressable>
        </View>

        <View style={{ gap: 8 }}>
          <PrimaryButton title="Thêm bằng thực đơn" variant="soft" icon="silverware-fork-knife" onPress={() => navigation.navigate("PantryImport", { method: "MENU" })} />
          <PrimaryButton title="Thêm bằng văn bản" variant="outline" icon="text" onPress={() => navigation.navigate("PantryImport", { method: "TEXT" })} />
          <PrimaryButton title="Thêm nhanh" variant="outline" icon="plus-circle-outline" onPress={() => navigation.navigate("QuickAdd")} />
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm thực phẩm"
          onPress={() => {
            if (onboardingStep === "interactive_guide") {
              completeOnboardingStep("done");
            }
            navigation.navigate("AddIngredient");
          }}
          style={({ pressed }) => ({
            minHeight: 52,
            borderRadius: 12,
            backgroundColor: colors.primary,
            borderWidth: 1,
            borderColor: colors.secondary,
            flexDirection: "row",
            alignItems: "center",
            padding: 10,
            gap: 10,
            opacity: pressed ? 0.86 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }]
          })}
        >
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.24)", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="plus" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontSize: 16, fontWeight: "800" }} selectable>
              Thêm thực phẩm
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: "800", marginTop: 3 }} selectable>
              Chọn nguyên liệu và nhập số lượng
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.white} />
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {pantryCategories.map((category) => (
            <CategoryChip key={category} label={category} active={active === category} icon={category === "Ngăn đông" ? "snowflake" : "fridge-outline"} onPress={() => setActive(category)} />
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
      </ScrollView>

      {onboardingStep === "interactive_guide" ? <View style={{ padding: 12, backgroundColor: colors.surface, gap: 8 }}>
        <Text style={{ color: colors.text }}>Bạn có thể thêm nguyên liệu bằng nhiều cách trong Thêm nhanh.</Text>
        <PrimaryButton title="Bỏ qua hướng dẫn" variant="soft" onPress={() => { void completeOnboardingStep("done"); }} />
      </View> : null}
      <Modal transparent visible={showExpiry} animationType="fade" onRequestClose={() => setShowExpiry(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 }}>
          <View accessibilityViewIsModal style={{ backgroundColor: colors.background, borderRadius: 18, padding: 20, gap: 16, maxHeight: "75%", maxWidth: 520, width: "100%", alignSelf: "center" }}>
            <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "900" }}>Hạn dùng cần chú ý</Text>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {expiringItems.length ? expiringItems.map(item => <View key={item.id} style={{ gap: 4 }}>
                <Text style={{ color: colors.text, fontWeight: "800" }}>{item.name}</Text>
                <Text style={{ color: item.status === "danger" ? "#FFB3B3" : colors.muted }}>{item.expiryLabel}</Text>
              </View>) : <Text style={{ color: colors.text }}>Chưa có thực phẩm sắp hết hạn.</Text>}
            </ScrollView>
            <PrimaryButton title="Đóng thông báo" onPress={() => setShowExpiry(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
