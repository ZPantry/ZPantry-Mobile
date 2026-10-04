import AppInput from "@/components/AppInput";
import ExpiryDaysField from "@/components/ExpiryDaysField";
import { expiryDateFromDays } from "@/utils/expiryDays";
import Text from "@/components/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView as ResultsScrollView, View } from "react-native";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { ingredientsApi, type Ingredient } from "@/api/ingredients";
import { pantryApi } from "@/api/pantry";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import SearchBar from "@/components/SearchBar";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { getFriendlyErrorMessage } from "@/utils/localize";

const storageOptions = [
  { label: "Ngăn mát", value: "fridge" },
  { label: "Ngăn đông", value: "freezer" },
  { label: "Kệ bếp", value: "pantry" }
];
type Draft = { ingredient: Ingredient; quantity: number; unit: string; expiryDays: string; storageLocation: string; note: string };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();

export default function AddIngredientScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setIngredients(await ingredientsApi.all()); setLoaded(true); }
    catch (e) { setError(getFriendlyErrorMessage(e, "Chưa tải được danh mục.")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => {
    const keyword = normalize(search.trim());
    return ingredients.filter(item => normalize([item.name, item.normalizedName, item.category].filter(Boolean).join(" ")).includes(keyword));
  }, [ingredients, search]);
  const patch = (id: string, values: Partial<Omit<Draft, 'ingredient' | 'unit'>>) => {
    setDrafts(current => current.map(d => d.ingredient.id === id ? { ...d, ...values } : d)); setError("");
  };
  const changeQuantity = (id: string, delta: number) => {
    setDrafts(current => current.map(d => d.ingredient.id === id ? { ...d, quantity: Math.max(100, d.quantity + delta) } : d));
    setError("");
  };
  const toggle = (ingredient: Ingredient) => {
    const unit = ingredient.unit?.trim() || ingredient.defaultUnit?.trim();
    if (!unit) return;
    setDrafts(current => current.some(d => d.ingredient.id === ingredient.id)
      ? current.filter(d => d.ingredient.id !== ingredient.id)
      : [...current, { ingredient, unit, quantity: 100, expiryDays: "", storageLocation: "fridge", note: "" }]);
    setError("");
  };
  const save = async () => {
    if (lock.current || !drafts.length) return;
    let items;
    try {
      items = drafts.map(d => ({ ingredientId: d.ingredient.id, quantity: d.quantity, unit: d.unit,
        expiredAt: expiryDateFromDays(d.expiryDays), storageLocation: d.storageLocation, note: d.note.trim() }));
    } catch (e) { return setError((e as Error).message); }
    lock.current = true; setSaving(true); setError("");
    try {
      await pantryApi.saveItems(items);
      toast.show(`Đã lưu ${drafts.length} nguyên liệu vào tủ.`);
      navigation.popTo("Tabs", { screen: "Pantry" });
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa lưu được nguyên liệu. Danh sách đã chọn vẫn được giữ lại.")); }
    finally { lock.current = false; setSaving(false); }
  };
  return <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 24, maxWidth: 720, width: "100%", alignSelf: "center" }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "700" }}>Thêm thực phẩm</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Chọn nhiều nguyên liệu, điều chỉnh lượng rồi lưu một lần.</Text>
      </View>
      <SearchBar placeholder="Tìm nguyên liệu" value={search} onChangeText={setSearch} />
      {loading && !loaded ? <ActivityIndicator color={colors.primary} /> : null}
      {loaded && !filtered.length ? <Text style={{ color: colors.muted }}>Không tìm thấy nguyên liệu. Hãy thử từ khóa khác.</Text> : null}
      {filtered.length ? <ResultsScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }} contentContainerStyle={{ gap: 8 }}>
        {filtered.slice(0, 30).map(item => {
          const active = drafts.some(d => d.ingredient.id === item.id);
          const unit = item.unit?.trim() || item.defaultUnit?.trim();
          return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={"Chọn " + item.name} accessibilityState={{ selected: active, disabled: saving || !unit }}
            disabled={saving || !unit} onPress={() => toggle(item)} style={{ minHeight: 56, padding: 12, borderRadius: 12,
              backgroundColor: active ? colors.secondary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.line,
              flexDirection: "row", alignItems: "center", gap: 10, opacity: unit ? 1 : 0.6 }}>
            <MaterialCommunityIcons name={active ? "checkbox-marked" : "checkbox-blank-outline"} size={23} color={active ? colors.primary : colors.muted} />
            <Text style={{ flex: 1, color: colors.text, fontWeight: "600" }}>{item.name}</Text>
            <Text style={{ color: active ? colors.primaryDark : colors.muted }}>{unit || "Chưa có đơn vị"}</Text>
          </Pressable>;
        })}
      </ResultsScrollView> : null}
      {filtered.length > 30 ? <Text style={{ color: colors.muted }}>Đang hiện 30/{filtered.length} nguyên liệu. Nhập tên để tìm chính xác hơn.</Text> : null}
      <Text style={{ color: colors.text, fontSize: 19, fontWeight: "700" }}>Đã chọn ({drafts.length})</Text>
      {!drafts.length ? <View style={{ padding: 22, gap: 8, alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line }}>
        <MaterialCommunityIcons name="basket-plus-outline" size={32} color={colors.primary} />
        <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 22 }}>Chọn nguyên liệu ở trên để thêm vào danh sách.</Text>
      </View> : null}
      {drafts.map(d => <View key={d.ingredient.id} testID={`selected-ingredient-${d.ingredient.id}`} style={{ gap: 14, padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{d.ingredient.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Đơn vị có sẵn: {d.unit}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Bỏ ${d.ingredient.name}`} disabled={saving} onPress={() => toggle(d.ingredient)}
            style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.secondary, borderRadius: 12, padding: 8 }}>
          <QuantityButton name="minus" label={`Giảm 100 ${d.unit} ${d.ingredient.name}`} disabled={saving || d.quantity <= 100} onPress={() => changeQuantity(d.ingredient.id, -100)} />
          <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Text accessibilityLabel={`Số lượng ${d.ingredient.name}`} style={{ color: colors.primaryDark, fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{d.quantity} {d.unit}</Text>
            <Text style={{ color: colors.primaryDark, fontSize: 12 }}>Mỗi lần thêm 100 {d.unit}</Text>
          </View>
          <QuantityButton name="plus" label={`Thêm 100 ${d.unit} ${d.ingredient.name}`} disabled={saving} onPress={() => changeQuantity(d.ingredient.id, 100)} />
        </View>
        <ExpiryDaysField value={d.expiryDays} onChange={value => patch(d.ingredient.id, { expiryDays: value })} disabled={saving} />
        <Text style={{ color: colors.text, fontWeight: '600' }}>Nơi cất</Text>
        <View pointerEvents={saving ? 'none' : 'auto'} style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {storageOptions.map(option => <CategoryChip key={option.value} label={option.label} active={d.storageLocation === option.value} onPress={() => patch(d.ingredient.id, { storageLocation: option.value })} />)}
        </View>
        <AppInput accessibilityLabel={`Ghi chú ${d.ingredient.name}`} placeholder="Ghi chú (không bắt buộc)" placeholderTextColor={colors.muted} value={d.note} onChangeText={note => patch(d.ingredient.id, { note })} editable={!saving} />
      </View>)}
      {drafts.length ? <Text style={{ color: colors.muted, lineHeight: 21 }}>Nếu nguyên liệu đã có trong tủ, số lượng này sẽ thay thế số lượng hiện tại.</Text> : null}
      {!loaded && !loading ? <PrimaryButton title="Tải lại danh mục" onPress={load} variant="soft" /> : null}
    </ScrollView>
    <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
      <View style={{ maxWidth: 680, width: '100%', alignSelf: 'center', gap: 8 }}>
        {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, lineHeight: 20 }}>{error}</Text> : null}
        <PrimaryButton title={saving ? "Đang lưu…" : drafts.length ? `Lưu ${drafts.length} nguyên liệu vào tủ` : "Chọn nguyên liệu để lưu"} disabled={saving || !drafts.length} onPress={save} />
      </View>
    </View>
  </SafeAreaView>;
}

function QuantityButton({ name, label, disabled, onPress }: { name: 'plus' | 'minus'; label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12,
      backgroundColor: name === 'plus' ? colors.primary : colors.surface, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
    <MaterialCommunityIcons name={name} size={24} color={name === 'plus' ? colors.textDark : colors.primaryDark} />
  </Pressable>;
}
