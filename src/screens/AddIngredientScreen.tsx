import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ingredientsApi, type Ingredient } from "@/api/ingredients";
import { pantryApi } from "@/api/pantry";
import AppBackButton from "@/components/AppBackButton";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import SearchBar from "@/components/SearchBar";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { authStorage } from "@/utils/authStorage";
import { getFriendlyErrorMessage } from "@/utils/localize";

const storageOptions = [
  { label: "Ngăn mát", value: "fridge" },
  { label: "Ngăn đông", value: "freezer" },
  { label: "Kệ bếp", value: "pantry" }
];
const tips = ["Tìm nguyên liệu trong danh mục. Bạn có thể bỏ qua hướng dẫn bất cứ lúc nào.", "Chọn một nguyên liệu để điền số lượng và đơn vị. Không cần chọn để xem bước tiếp.", "Kiểm tra thông tin rồi xác nhận lưu. Hạn dùng có thể để trống."];

export default function AddIngredientScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();
  const { user } = useAuth();
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [expiredAt, setExpiredAt] = useState("");
  const [storageLocation, setStorageLocation] = useState("fridge");
  const [note, setNote] = useState("");
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
  useEffect(() => {
    let active = true;
    if (user?.userId) void authStorage.getHasSeenAddIngredientTooltip(user.userId).then(seen => {
      if (active && !seen) setTutorialStep(0);
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.userId]);
  const dismissGuide = () => {
    setTutorialStep(null);
    if (user?.userId) void authStorage.setHasSeenAddIngredientTooltip(user.userId).catch(() => {});
  };
  const selected = ingredients.find(item => item.id === selectedId);
  const filtered = useMemo(() => {
    const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const keyword = normalize(search.trim());
    return ingredients.filter(item => normalize(item.name + " " + item.normalizedName + " " + item.category).includes(keyword));
  }, [ingredients, search]);
  const save = async () => {
    if (lock.current) return;
    const amount = Number(quantity.replace(",", "."));
    if (!selected) return setError("Vui lòng chọn nguyên liệu trong danh mục.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Số lượng phải lớn hơn 0.");
    if (!unit.trim()) return setError("Vui lòng nhập đơn vị.");
    const date = expiredAt.trim();
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date))
      return setError("Hạn dùng cần là ngày hợp lệ theo dạng YYYY-MM-DD.");
    lock.current = true; setSaving(true); setError("");
    try {
      await pantryApi.saveItem({ ingredientId: selected.id, quantity: amount, unit: unit.trim(), expiredAt: date || null, storageLocation, note: note.trim() });
      dismissGuide();
      toast.show("Đã lưu " + selected.name + " vào tủ.");
      navigation.popTo("Tabs", { screen: "Pantry" });
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa lưu được nguyên liệu. Thông tin vẫn được giữ lại.")); }
    finally { lock.current = false; setSaving(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 32, maxWidth: 720, width: "100%", alignSelf: "center" }}>
      <AppBackButton onPress={() => navigation.goBack()} />
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900" }}>Thêm thực phẩm</Text>
      {tutorialStep !== null ? <View style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.primary, fontWeight: "800" }}>Hướng dẫn {tutorialStep + 1}/3</Text>
        <Text style={{ color: colors.text, lineHeight: 21 }}>{tips[tutorialStep]}</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <PrimaryButton title="Bước trước" variant="soft" disabled={tutorialStep === 0} onPress={() => setTutorialStep(tutorialStep - 1)} />
          <PrimaryButton title={tutorialStep === 2 ? "Hoàn tất" : "Bước tiếp"} onPress={tutorialStep === 2 ? dismissGuide : () => setTutorialStep(tutorialStep + 1)} />
          <PrimaryButton title="Bỏ qua hướng dẫn" variant="outline" onPress={dismissGuide} />
        </View>
      </View> : null}
      <SearchBar placeholder="Tìm nguyên liệu" value={search} onChangeText={setSearch} />
      {loading && !loaded ? <ActivityIndicator color={colors.primary} /> : null}
      {loaded && !filtered.length ? <Text style={{ color: colors.muted }}>Không tìm thấy nguyên liệu. Hãy thử từ khóa khác.</Text> : null}
      <View style={{ gap: 8 }}>
        {filtered.slice(0, 30).map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={"Chọn " + item.name} accessibilityState={{ selected: selectedId === item.id }} disabled={saving} onPress={() => { setSelectedId(item.id); setUnit(item.defaultUnit || item.unit || "g"); setError(""); }} style={{ minHeight: 48, padding: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: selectedId === item.id ? colors.primary : colors.line, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ flex: 1, color: colors.text, fontWeight: "800" }}>{item.name}</Text><Text style={{ color: colors.primary }}>{selectedId === item.id ? "Đã chọn" : item.unit}</Text>
        </Pressable>)}
        {filtered.length > 30 ? <Text style={{ color: colors.muted }}>Đang hiện 30/{filtered.length} nguyên liệu. Nhập tên để tìm chính xác hơn.</Text> : null}
      </View>
      <Text style={{ color: colors.primary, fontWeight: "800" }}>{selected ? "Đang chọn: " + selected.name : "Chọn nguyên liệu để lưu"}</Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Số lượng" value={quantity} onChangeText={setQuantity} numeric disabled={saving} /></View>
        <View style={{ flex: 1 }}><Field label="Đơn vị" value={unit} onChangeText={setUnit} disabled={saving} /></View>
      </View>
      <Field label="Hạn dùng (không bắt buộc)" value={expiredAt} onChangeText={setExpiredAt} placeholder="YYYY-MM-DD" disabled={saving} />
      <Text style={{ color: colors.text, fontWeight: "800" }}>Nơi cất</Text>
      <View pointerEvents={saving ? "none" : "auto"} style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {storageOptions.map(item => <CategoryChip key={item.value} label={item.label} active={storageLocation === item.value} onPress={() => setStorageLocation(item.value)} />)}
      </View>
      <Field label="Ghi chú" value={note} onChangeText={setNote} disabled={saving} />
      <Text style={{ color: colors.muted, lineHeight: 21 }}>Nếu nguyên liệu đã có trong tủ, số lượng này sẽ thay thế số lượng hiện tại.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: "#FFE6E6" }}>{error}</Text> : null}
      {!loaded && !loading ? <PrimaryButton title="Tải lại danh mục" onPress={load} variant="soft" /> : null}
      <PrimaryButton title={saving ? "Đang lưu…" : "Xác nhận lưu vào tủ"} disabled={saving || loading} onPress={save} />
    </ScrollView>
  </SafeAreaView>;
}

function Field({ label, value, onChangeText, placeholder, numeric, disabled }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; numeric?: boolean; disabled?: boolean }) {
  return <View style={{ gap: 7 }}>
    <Text style={{ color: colors.text, fontWeight: "700" }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} editable={!disabled} keyboardType={numeric ? "decimal-pad" : "default"} style={{ minHeight: 44, color: colors.text, borderBottomWidth: 1, borderColor: colors.line, paddingHorizontal: 10, backgroundColor: colors.surface, borderRadius: 8 }} />
  </View>;
}
