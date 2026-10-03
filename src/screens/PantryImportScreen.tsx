import Text from "@/components/AppText";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, TextInput, View } from "react-native";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { pantryImportApi, type ImportSource, type ImportMethod, type ImportPreview, type ImportPreviewItem } from "@/api/pantryImport";
import { todayMenuApi, type TodayMenuItem } from "@/api/todayMenu";
import { ingredientsApi, type Ingredient } from "@/api/ingredients";
import SelectField from "@/components/SelectField";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { pickUploadImage, type PickedUploadImage } from "@/utils/pickUploadImage";
import { getFriendlyErrorMessage } from "@/utils/localize";

type Draft = ImportPreviewItem & { key: number; quantityText: string; unitText: string };
export default function PantryImportScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const method: ImportMethod = route.params?.method || "FOOD_IMAGE";
  const imageMethod = method === "FOOD_IMAGE" || method === "RECEIPT";
  const toast = useToast();
  const [source, setSource] = useState<ImportSource>(method === "RECEIPT" ? "RECEIPT" : "FOOD_IMAGE");
  const [text, setText] = useState("");
  const [menuDate, setMenuDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [meals, setMeals] = useState<TodayMenuItem[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [menuRetry, setMenuRetry] = useState(0);
  const [image, setImage] = useState<PickedUploadImage | null>(null);
  const [rows, setRows] = useState<Draft[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Ingredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchRetry, setSearchRetry] = useState(0);
  useEffect(() => {
    if (method !== "MENU") return;
    let active = true;
    setMeals([]); setSelectedMeals([]); setMenuError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(menuDate) || Number.isNaN(Date.parse(menuDate)) || new Date(menuDate).toISOString().slice(0, 10) !== menuDate) {
      setMenuLoading(false); setMenuError("Nhập ngày hợp lệ theo dạng YYYY-MM-DD."); return;
    }
    setMenuLoading(true);
    void todayMenuApi.all(menuDate).then(items => {
      if (active) setMeals(items.filter(item => !["cancelled", "canceled"].includes(item.status.toLowerCase())));
    }).catch(e => { if (active) setMenuError(getFriendlyErrorMessage(e, "Chưa tải được thực đơn.")); })
      .finally(() => { if (active) setMenuLoading(false); });
    return () => { active = false; };
  }, [method, menuDate, menuRetry]);
  const showPreview = (result: ImportPreview) => {
    if (!Array.isArray(result.items)) throw new Error("Kết quả không hợp lệ. Vui lòng thử lại.");
    setRows(result.items.map((r, key) => ({ ...r, key, quantityText: r.quantity == null ? "" : String(r.quantity), unitText: r.unit || "" })));
    setWarnings(result.warnings || []);
  };
  const prepare = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setEditing(null);
    try {
      showPreview(method === "TEXT" ? await pantryImportApi.parseText(text) : await pantryImportApi.fromMenu(meals.filter(meal => selectedMeals.includes(meal.id))));
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa tạo được danh sách nguyên liệu. Vui lòng thử lại.")); }
    finally { lock.current = false; setBusy(false); }
  };
  useEffect(() => {
    if (editing === null) return;
    let active = true;
    setSearching(true); setSearchError(""); setMatches([]);
    const timer = setTimeout(async () => {
      try {
        const result = await ingredientsApi.search(query.trim(), 1, 15);
        if (active) setMatches(result.data);
      } catch (e) { if (active) setSearchError(getFriendlyErrorMessage(e, "Chưa tìm được nguyên liệu.")); }
      finally { if (active) setSearching(false); }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [editing, query, searchRetry]);
  const choose = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const chosen = await pickUploadImage("pantry-import", false);
      if (!chosen) return;
      if (!chosen.mimeType || !["image/jpeg", "image/png", "image/webp"].includes(chosen.mimeType)) {
        setError("Chọn ảnh JPG, PNG hoặc WEBP. Ảnh HEIC cần chuyển định dạng trước."); return;
      }
      if (chosen.size !== undefined && chosen.size > 10 * 1024 * 1024) { setError("Ảnh vượt quá 10 MB. Hãy chọn ảnh nhỏ hơn."); return; }
      setImage(chosen); setRows(null); setWarnings([]); setEditing(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Chưa chọn được ảnh."); }
    finally { lock.current = false; setBusy(false); }
  };
  const analyze = async () => {
    if (!image || lock.current) return;
    lock.current = true; setBusy(true); setError(""); setEditing(null);
    try {
      const result = await pantryImportApi.analyze(source, image.file);
      showPreview(result);
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa phân tích được ảnh. Vui lòng thử lại.")); }
    finally { lock.current = false; setBusy(false); }
  };
  const patchRow = (key: number, update: Partial<Draft>) => {
    setError("");
    setRows((current) => current?.map((r) => r.key === key ? { ...r, ...update } : r) ?? null);
  };
  const confirm = async () => {
    if (!rows?.length || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await pantryImportApi.confirm(rows.map((r) => ({ ingredientId: r.ingredientId || "", quantity: Number(r.quantityText.replace(",", ".")), unit: r.unitText.trim() })));
      setRows(null); toast.show("Đã cập nhật nguyên liệu trong tủ.");
      navigation.popTo("Tabs", { screen: "Pantry" });
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa lưu được. Bản chỉnh sửa vẫn được giữ lại.")); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 22, paddingBottom: 48, gap: 18, maxWidth: 720, width: "100%", alignSelf: "center" }}>
      <Pressable disabled={busy} onPress={() => navigation.goBack()} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: colors.primary, fontWeight: "600" }}>‹ Quay lại</Text></Pressable>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 26 }}>{method === "TEXT" ? "Thêm bằng văn bản" : method === "MENU" ? "Thêm bằng thực đơn" : "Thêm nguyên liệu từ ảnh"}</Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>1. {method === "TEXT" ? "Nhập thực phẩm" : method === "MENU" ? "Chọn món" : "Chọn ảnh"}  →  2. Kiểm tra  →  3. Lưu vào tủ</Text>
      {method === "TEXT" ? <>
        <TextInput accessibilityLabel="Danh sách thực phẩm" multiline value={text} onChangeText={setText} editable={!busy && rows === null} placeholder="Ví dụ: 2 củ cà rốt, 200 g thịt bò" placeholderTextColor={colors.muted} style={[inputStyle, { minHeight: 100, textAlignVertical: "top" }]} />
        {rows === null ? <Action label={busy ? "Đang phân tích…" : "Phân tích văn bản"} disabled={busy || !text.trim()} onPress={prepare} /> : null}
      </> : null}
      {method === "MENU" ? <>
        <Text style={{ color: colors.text }}>Ngày thực đơn</Text>
        <TextInput accessibilityLabel="Ngày thực đơn" value={menuDate} onChangeText={setMenuDate} editable={!busy && rows === null} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={inputStyle} />
        {menuLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {menuError ? <><Text accessibilityRole="alert" style={{ color: colors.danger }}>{menuError}</Text><Action label="Tải lại thực đơn" disabled={menuLoading || busy} soft onPress={() => setMenuRetry(v => v + 1)} /></> : null}
        {!menuLoading && !menuError && !meals.length ? <><Text style={{ color: colors.muted }}>Ngày này chưa có món. Thêm món vào thực đơn rồi quay lại đây.</Text><Action label="Mở thực đơn" soft onPress={() => navigation.popTo("Tabs", { screen: "Plan" })} /></> : null}
        {meals.map(meal => <Pressable key={meal.id} accessibilityRole="checkbox" accessibilityLabel={meal.mealName} accessibilityState={{ checked: selectedMeals.includes(meal.id) }} aria-checked={selectedMeals.includes(meal.id)} disabled={busy || rows !== null || !meal.recipeId} onPress={() => setSelectedMeals(current => current.includes(meal.id) ? current.filter(id => id !== meal.id) : [...current, meal.id])} style={{ padding: 12, minHeight: 48, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: selectedMeals.includes(meal.id) ? colors.primary : colors.line }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>{selectedMeals.includes(meal.id) ? "✓ " : ""}{meal.mealName}</Text><Text style={{ color: colors.muted }}>{meal.servingSize} khẩu phần{meal.recipeId ? "" : " · Chưa có công thức"}</Text>
        </Pressable>)}
        {rows === null ? <Action label="Xem nguyên liệu cần thêm" onPress={prepare} disabled={busy || menuLoading || !selectedMeals.length} /> : null}
      </> : null}
      {imageMethod ? <>
      <View pointerEvents={busy || rows !== null ? "none" : "auto"}>
        <SelectField label="Bạn muốn nhận diện gì?" value={source} onValueChange={(v) => setSource(v as ImportSource)} options={[
          { value: "FOOD_IMAGE", label: "Ảnh thực phẩm" }, { value: "RECEIPT", label: "Hóa đơn mua hàng" }
        ]} />
      </View>
      {image ? <Image source={{ uri: image.uri }} resizeMode="contain" style={{ height: 210, borderRadius: 18, backgroundColor: colors.card }} /> :
        <View style={{ backgroundColor: colors.card, padding: 28, borderRadius: 18, gap: 10 }}>
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 18 }}>Một ảnh, nhiều nguyên liệu</Text>
          <Text style={{ color: colors.muted, lineHeight: 21 }}>Chọn ảnh rõ, đủ sáng. Với hóa đơn, giữ nguyên toàn bộ tên và số lượng. JPG, PNG, WEBP · tối đa 10 MB.</Text>
        </View>}
      <Action label={image ? "Chọn ảnh khác" : "Chọn ảnh từ thư viện"} onPress={choose} disabled={busy} soft />
      {image && rows === null ? <Action label={busy ? "Đang nhận diện…" : "Phân tích ảnh"} onPress={analyze} disabled={busy} /> : null}
      </> : null}
      {busy ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text accessibilityRole="alert" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}
      {warnings.map((w, index) => <Text key={index} selectable style={{ color: colors.primary }}>{w === "No food ingredients were detected." ? "Chưa nhận diện được nguyên liệu. Hãy thử ảnh rõ hơn hoặc thêm thủ công." : w}</Text>)}
      {rows !== null ? <>
        <Text style={{ color: colors.text, fontSize: 21, fontWeight: "700" }}>Kiểm tra {rows.length} nguyên liệu</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Kết quả có thể chưa chính xác. Chọn đúng nguyên liệu, số lượng và đơn vị; bỏ các dòng không cần lưu.</Text>
        {rows.map((r) => <View key={r.key} style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: r.ingredientId ? colors.line : colors.primary, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}>{r.rawName}</Text>
              <Text style={{ color: r.ingredientId ? colors.muted : colors.primary }}>{r.ingredientId ? r.canonicalIngredientName : "Cần chọn nguyên liệu tương ứng"}</Text></View>
            <Pressable disabled={busy} accessibilityLabel={`Bỏ ${r.rawName}`} onPress={() => { setRows((current) => current?.filter((x) => x.key !== r.key) ?? null); if (editing === r.key) setEditing(null); }} style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}><Text style={{ color: colors.danger }}>Bỏ</Text></Pressable>
          </View>
          <Action soft label={editing === r.key ? "Đóng tìm kiếm" : r.ingredientId ? "Đổi nguyên liệu" : "Chọn nguyên liệu"} disabled={busy}
            onPress={() => { setEditing(editing === r.key ? null : r.key); setQuery(""); }} />
          {editing === r.key ? <View style={{ gap: 10 }}>
            <TextInput accessibilityLabel="Tìm nguyên liệu" value={query} onChangeText={setQuery} placeholder="Tìm trong danh mục…" placeholderTextColor={colors.muted} style={inputStyle} editable={!busy} />
            {searching ? <ActivityIndicator color={colors.primary} /> : null}
            {searchError ? <Pressable onPress={() => setSearchRetry((v) => v + 1)}><Text style={{ color: colors.danger }}>{searchError} Nhấn để thử lại.</Text></Pressable> : null}
            {!searching && !searchError && !matches.length ? <Text style={{ color: colors.muted }}>Không tìm thấy. Thử tên khác hoặc bỏ dòng này.</Text> : null}
            {matches.map((i) => <Pressable disabled={busy} key={i.id} onPress={() => { patchRow(r.key, { ingredientId: i.id, canonicalIngredientName: i.name, resolverStatus: "RESOLVED" }); setEditing(null); }} style={{ minHeight: 44, padding: 10, borderBottomWidth: 1, borderColor: colors.line }}>
              <Text style={{ color: colors.text }}>{i.name} · đơn vị danh mục: {i.unit}</Text>
            </Pressable>)}
          </View> : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}><Text style={{ color: colors.muted }}>Số lượng</Text><TextInput accessibilityLabel={`Số lượng ${r.rawName}`} editable={!busy} value={r.quantityText} onChangeText={(v) => patchRow(r.key, { quantityText: v })} keyboardType="decimal-pad" style={inputStyle} /></View>
            <View style={{ flex: 1, gap: 6 }}><Text style={{ color: colors.muted }}>Đơn vị</Text><TextInput accessibilityLabel={`Đơn vị ${r.rawName}`} editable={!busy} value={r.unitText} onChangeText={(v) => patchRow(r.key, { unitText: v })} maxLength={50} placeholder="g, kg, cái…" placeholderTextColor={colors.muted} style={inputStyle} /></View>
          </View>
        </View>)}
        <Text style={{ color: colors.primary, lineHeight: 22 }}>Nếu nguyên liệu đã có trong tủ, số lượng sẽ được thay bằng số bạn xác nhận, không cộng thêm. Bạn có thể đặt hạn sử dụng trong chi tiết tủ sau khi lưu.</Text>
        <Action label={busy ? "Đang lưu…" : `Xác nhận lưu ${rows.length} nguyên liệu`} onPress={confirm} disabled={busy || !rows.length} />
        <Action label="Chỉnh lại nguồn nhập" soft disabled={busy} onPress={() => { setRows(null); setEditing(null); setError(""); setWarnings([]); }} />
      </> : null}
      <Action soft label="Thêm thủ công" onPress={() => navigation.navigate("AddIngredient")} disabled={busy} />
    </ScrollView>
  </SafeAreaView>;
}
const inputStyle = { minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, color: colors.text };
function Action({ label, onPress, disabled, soft }: { label: string; onPress: () => void; disabled?: boolean; soft?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ minHeight: 44, padding: 12, borderRadius: 12, alignItems: "center", backgroundColor: soft ? colors.card : colors.primary, borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: soft ? colors.text : colors.textDark, fontWeight: "600" }}>{label}</Text>
  </Pressable>;
}
