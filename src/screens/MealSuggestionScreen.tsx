import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { pantryApi, type PantryApiItem } from "@/api/pantry";
import { recommendationsApi } from "@/api/recommendations";
import SelectField from "@/components/SelectField";
import { colors } from "@/constants/colors";
import { getFriendlyErrorMessage } from "@/utils/localize";

export default function MealSuggestionScreen() {
  const navigation = useNavigation<any>();
  const [pantry, setPantry] = useState<PantryApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const busy = useRef(false);
  const [topK, setTopK] = useState("5");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setPantry(await pantryApi.list(1, 100)); setLoaded(true); }
    catch (e) { setError(getFriendlyErrorMessage(e, "Chưa tải được tủ thực phẩm.")); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const suggest = async () => {
    if (busy.current || !loaded) return;
    busy.current = true; setSuggesting(true); setError("");
    try {
      const result = await recommendationsApi.personalized(Number(topK));
      navigation.navigate("MealRecommendationResults", {
        recommendations: result.recommendations,
        pantryItems: pantry.map((p) => ({ id: p.id, ingredientId: p.ingredientId, name: p.ingredientName || "Nguyên liệu", quantity: p.quantity, unit: p.unit, source: "pantry" }))
      });
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa tạo được gợi ý. Vui lòng thử lại.")); }
    finally { busy.current = false; setSuggesting(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 22, paddingBottom: 130, gap: 20, maxWidth: 760, width: "100%", alignSelf: "center" }}>
      <View style={{ gap: 8 }}><Text style={{ color: colors.primary, fontWeight: "800" }}>NẤU TỪ NHỮNG GÌ BẠN CÓ</Text>
        <Text style={{ color: colors.text, fontSize: 30, fontWeight: "900" }}>Hôm nay ăn gì?</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Không cần nhập lại nguyên liệu. Gợi ý dùng tủ thực phẩm và dị ứng đã lưu của bạn.</Text></View>
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate("ProfileSetup", { editing: true })}
        style={{ borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.card, borderRadius: 18, padding: 18, gap: 7 }}>
        <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 17 }}>Hồ sơ ăn uống  ›</Text>
        <Text style={{ color: colors.text, lineHeight: 21 }}>Kiểm tra dị ứng trước khi tìm món. Bạn có thể chỉnh mục tiêu và chế độ ăn tại đây.</Text>
      </Pressable>
      {loading && !loaded ? <ActivityIndicator size="large" color={colors.primary} /> : null}
      {error ? <View accessibilityRole="alert" style={{ gap: 10 }}><Text selectable style={{ color: "#FFE6E6", lineHeight: 22 }}>{error}</Text>
        <Pressable onPress={load} disabled={loading || suggesting} style={{ padding: 12 }}><Text style={{ color: colors.primary }}>Tải lại tủ thực phẩm</Text></Pressable></View> : null}
      {loaded ? <View style={{ backgroundColor: colors.card, padding: 18, borderRadius: 18, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Có sẵn trong tủ</Text>
        {pantry.length ? pantry.slice(0, 8).map((p) => <View key={p.id} style={{ flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
          <Text style={{ color: colors.text, flex: 1 }}>{p.ingredientName || "Nguyên liệu"}</Text>
          <Text style={{ color: colors.primary }}>{p.quantity} {p.unit}</Text>
        </View>) : <Text style={{ color: colors.muted, lineHeight: 21 }}>Tủ đang trống. Thêm nguyên liệu để bắt đầu tìm món.</Text>}
        {pantry.length > 8 ? <Text style={{ color: colors.muted }}>Và các nguyên liệu khác trong tủ…</Text> : null}
        <Pressable onPress={() => navigation.navigate("PantryImport")} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: colors.primary, fontWeight: "800" }}>+ Thêm từ ảnh / hóa đơn</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("AddIngredient")} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: colors.text }}>Thêm nguyên liệu thủ công  ›</Text>
        </Pressable>
      </View> : null}
      <SelectField label="Số món gợi ý" value={topK} onValueChange={setTopK} options={[{ value: "5", label: "5 món · chọn nhanh" }, { value: "10", label: "10 món · nhiều lựa chọn" }]} />
      <Text style={{ color: colors.muted, lineHeight: 21 }}>Bộ lọc dựa trên chất gây dị ứng đã khai báo của món. Kiểm tra thành phần thực tế trước khi nấu. Mục tiêu và chế độ ăn hiện chưa được lọc tự động.</Text>
      <Pressable accessibilityRole="button" onPress={suggest} disabled={suggesting || loading || !loaded || !pantry.length}
        style={{ minHeight: 56, borderRadius: 16, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", opacity: suggesting || loading || !pantry.length ? 0.5 : 1 }}>
        <Text style={{ color: colors.textDark, fontSize: 17, fontWeight: "900" }}>{suggesting ? "Đang tìm món phù hợp…" : "Tìm món cho tôi"}</Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>;
}
