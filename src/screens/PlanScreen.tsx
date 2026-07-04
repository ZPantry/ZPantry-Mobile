import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { TodayMenuItem } from "@/api/todayMenu";
import { todayMenuApi } from "@/api/todayMenu";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { RootStackParamList } from "@/types";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";
import { getFriendlyErrorMessage, translateMealType, translateStatus } from "@/utils/localize";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

function formatDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date = new Date()) {
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function statusMeta(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "cooked" || normalized === "completed") {
    return { label: translateStatus(status), color: colors.success, icon: "checkmark-circle" as const };
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return { label: translateStatus(status), color: colors.danger, icon: "close-circle" as const };
  }
  return { label: translateStatus(status), color: colors.primary, icon: "time" as const };
}

export default function PlanScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const navigation = useNavigation<Navigation>();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  const [items, setItems] = useState<TodayMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadTodayMenu = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const page = await todayMenuApi.list(todayKey, 1, 20);
      setItems(page.data);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tải được thực đơn hôm nay."));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [todayKey]);

  useFocusEffect(
    useCallback(() => {
      loadTodayMenu();
    }, [loadTodayMenu])
  );

  const cookedCount = items.filter((item) => ["cooked", "completed"].includes(item.status.toLowerCase())).length;

  const removeItem = useCallback(
    async (item: TodayMenuItem) => {
      try {
        await todayMenuApi.remove(item.id);
        toast.show("Đã xóa món khỏi thực đơn hôm nay.");
        setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      } catch (error) {
        toast.show(getFriendlyErrorMessage(error, "Chưa xóa được món."), "danger");
      }
    },
    [toast]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadTodayMenu} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 22, paddingBottom: 118, gap: 18 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }} selectable>
              Thực đơn hôm nay
            </Text>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "900", marginTop: 4 }} selectable>
              {formatDateLabel(today)}
            </Text>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={23} color={colors.primary} />
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }} selectable>
            Xin chào {user?.fullName || "bạn"}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Metric value={String(items.length)} label="Món đã lên kế hoạch" />
            <Metric value={String(cookedCount)} label="Món đã hoàn thành" alignRight />
          </View>
        </View>

        {errorMessage ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
            <Text style={{ color: "#FFE6E6", fontWeight: "800", textAlign: "center" }} selectable>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 14 }}>
          {items.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 12, alignItems: "center" }}>
              <Ionicons name="calendar-outline" size={34} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" }} selectable>
                Chưa có món trong thực đơn hôm nay
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20, textAlign: "center" }} selectable>
                Mở một công thức rồi nhấn Thêm vào thực đơn hôm nay để bắt đầu.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <TodayMenuCard
                key={item.id}
                item={item}
                onPress={() => navigation.navigate("TodayMenuItemDetail", { itemId: item.id })}
                onRemove={() => removeItem(item)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ value, label, alignRight = false }: { value: string; label: string; alignRight?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: alignRight ? "flex-end" : "flex-start", gap: 4 }}>
      <Text style={{ color: colors.primary, fontSize: 24, fontWeight: "900", fontVariant: ["tabular-nums"] }} selectable>
        {value}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800", textAlign: alignRight ? "right" : "left" }} selectable>
        {label}
      </Text>
    </View>
  );
}

function TodayMenuCard({ item, onPress, onRemove }: { item: TodayMenuItem; onPress: () => void; onRemove: () => void }) {
  const meta = statusMeta(item.status);
  const isCooked = ["cooked", "completed"].includes(item.status.toLowerCase());

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderRadius: 12,
        overflow: "hidden",
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
        boxShadow: "0 12px 24px rgba(0,0,0,0.20)"
      })}
    >
      <Image source={{ uri: normalizeRemoteImageUrl(item.imageUrl || FALLBACK_FOOD_IMAGE_URL) }} style={{ width: "100%", height: 142, backgroundColor: colors.secondary }} />
      <View style={{ padding: 14, gap: 11 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textDark, fontSize: 20, lineHeight: 25, fontWeight: "900" }} selectable>
              {item.mealName}
            </Text>
            <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "800", marginTop: 3 }} selectable>
              {translateMealType(item.mealType)} · {item.servingSize || 1} phần
            </Text>
          </View>
          <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: `${meta.color}24`, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name={meta.icon} size={14} color={meta.color} />
            <Text style={{ color: colors.textDark, fontSize: 11, fontWeight: "900" }} selectable>
              {meta.label}
            </Text>
          </View>
        </View>

        {item.note ? (
          <Text style={{ color: colors.mutedDark, fontSize: 13, fontWeight: "700", lineHeight: 19 }} selectable>
            {item.note}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "900" }} selectable>
            Mở chi tiết
          </Text>
          {isCooked ? null : <PrimaryButton title="Xóa" icon="trash-can-outline" variant="outline" onPress={onRemove} style={{ minHeight: 38, paddingHorizontal: 12 }} />}
        </View>
      </View>
    </Pressable>
  );
}
