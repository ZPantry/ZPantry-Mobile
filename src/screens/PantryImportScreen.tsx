import KeyboardSafeView from "@/components/KeyboardSafeView";
import AppInput from "@/components/AppInput";
import DateField from "@/components/DateField";
import Text from "@/components/AppText";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { pantryImportApi, type ImportSource, type ImportMethod, type ImportPreview, type ImportPreviewItem } from "@/api/pantryImport";
import { todayMenuApi, type TodayMenuItem } from "@/api/todayMenu";
import { ingredientsApi, type Ingredient } from "@/api/ingredients";
import SelectField from "@/components/SelectField";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { captureUploadImage, pickUploadImage, type PickedUploadImage } from "@/utils/pickUploadImage";
import PrimaryButton from "@/components/PrimaryButton";
import { getFriendlyErrorMessage } from "@/utils/localize";
import { getIngredientQuantityStep } from "@/utils/ingredientQuantity";
import AllergyConflictBanner, { isAllergyConflictMessage } from "@/components/AllergyConflictBanner";
import { useQuotaWarning } from "@/hooks/useQuotaWarning";

type Draft = ImportPreviewItem & { key: number; quantityText: string; unitText: string; quantityAutofilled: boolean; quantityTouched: boolean };
const unitOptions = [
  { value: "g", label: "g" }, { value: "kg", label: "kg" }, { value: "ml", label: "ml" },
  { value: "l", label: "lít" }, { value: "cái", label: "cái" }, { value: "quả", label: "quả" },
  { value: "hộp", label: "hộp" }, { value: "chai", label: "chai" }, { value: "gói", label: "gói" }
] as const;

function validQuantity(value: string) {
  const quantity = Number(value.replace(",", ".").trim());
  return Number.isFinite(quantity) && quantity > 0;
}

function needsConfirmation(row: Draft) {
  return !row.ingredientId || row.reviewRequired || row.resolverStatus === "AMBIGUOUS" || row.resolverStatus === "UNRESOLVED" || Boolean(row.flags?.includes("LOW_CONFIDENCE"));
}
export default function PantryImportScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  // Text import is temporarily unavailable, including older navigation links.
  const method: ImportMethod = route.params?.method === "TEXT" ? "FOOD_IMAGE" : route.params?.method || "FOOD_IMAGE";
  const imageMethod = method === "FOOD_IMAGE" || method === "RECEIPT";
  const toast = useToast();
  const warnLowQuota = useQuotaWarning();
  const [source, setSource] = useState<ImportSource>(method === "RECEIPT" ? "RECEIPT" : "FOOD_IMAGE");
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
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [analysisId, setAnalysisId] = useState<string | undefined>();
  const confirmKey = useRef<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [retryableAiError, setRetryableAiError] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Ingredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchRetry, setSearchRetry] = useState(0);
  const [attemptedConfirm, setAttemptedConfirm] = useState(false);
  useEffect(() => {
    if (method !== "MENU") return;
    let active = true;
    setMeals([]); setSelectedMeals([]); setMenuError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(menuDate) || Number.isNaN(Date.parse(menuDate)) || new Date(menuDate).toISOString().slice(0, 10) !== menuDate) {
      setMenuLoading(false); setMenuError("Vui lòng chọn đủ ngày, tháng và năm hợp lệ."); return;
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
    setRows(result.items.map((r, key) => {
      const quantityAutofilled = r.quantity == null || r.quantity <= 0;
      const unitText = r.unit || "";
      return { ...r, key, quantityText: quantityAutofilled ? defaultQuantityForUnit(unitText) : String(r.quantity), unitText, quantityAutofilled, quantityTouched: false };
    }));
    setWarnings(result.warnings || []);
    setAnalysisId(result.analysisId);
    confirmKey.current = undefined;
    setAttemptedConfirm(false);
    if (!result.items.length && result.reason) setAnalysisNotice(unknownReasonMessage(result.reason));
    else setAnalysisNotice("");
  };
  const prepare = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setRetryableAiError(false); setEditing(null);
    try {
      showPreview(await pantryImportApi.fromMenu(meals.filter(meal => selectedMeals.includes(meal.id))));
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
  const choose = async (fromCamera = false) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const chosen = await (fromCamera ? captureUploadImage("pantry-import") : pickUploadImage("pantry-import", false));
      if (!chosen) return;
      if (!chosen.mimeType || !["image/jpeg", "image/png", "image/webp"].includes(chosen.mimeType)) {
        setError("Chọn ảnh JPG, PNG hoặc WEBP. Ảnh HEIC cần chuyển định dạng trước."); return;
      }
      if (chosen.size !== undefined && chosen.size > 10 * 1024 * 1024) { setError("Ảnh vượt quá 10 MB. Hãy chọn ảnh nhỏ hơn."); return; }
      setImage(chosen); setRows(null); setWarnings([]); setAnalysisNotice(""); setAnalysisId(undefined); confirmKey.current = undefined; setEditing(null); setAttemptedConfirm(false); setRetryableAiError(false);
    } catch (e) { setError(e instanceof Error ? e.message : fromCamera ? "Chưa chụp được ảnh. Vui lòng thử lại hoặc chọn ảnh từ thư viện." : "Chưa chọn được ảnh."); }
    finally { lock.current = false; setBusy(false); }
  };
  const analyze = async () => {
    if (!image || lock.current) return;
    lock.current = true; setBusy(true); setError(""); setEditing(null);
    try {
      const result = await pantryImportApi.analyze(source, image.file);
      void warnLowQuota("OCR");
      showPreview(result);
    } catch (e) {
      const message = getFriendlyErrorMessage(e, "Chưa phân tích được ảnh. Vui lòng thử lại.");
      setRetryableAiError(message.includes("Lượt của bạn không bị trừ"));
      setError(message);
    }
    finally { lock.current = false; setBusy(false); }
  };
  const patchRow = (key: number, update: Partial<Draft>) => {
    setError("");
    setRows((current) => current?.map((r) => r.key === key
      ? { ...r, ...update, quantityAutofilled: update.quantityText === undefined ? r.quantityAutofilled : false }
      : r) ?? null);
  };
  const confirm = async () => {
    if (!rows?.length || lock.current) return;
    setAttemptedConfirm(true);
    if (rows.some(row => !row.ingredientId || !validQuantity(row.quantityText) || !row.unitText.trim())) return;
    lock.current = true; setBusy(true); setError("");
    try {
      confirmKey.current ??= randomUUID();
      await pantryImportApi.confirm(rows.map((r) => ({ ingredientId: r.ingredientId || "", quantity: Number(r.quantityText.replace(",", ".")), unit: r.unitText.trim() })), analysisId, confirmKey.current);
      setRows(null); toast.show("Đã cập nhật nguyên liệu trong tủ.");
      navigation.popTo("Tabs", { screen: "Pantry" });
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa lưu được. Bản chỉnh sửa vẫn được giữ lại.")); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: colors.background }}><KeyboardSafeView>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 22, paddingBottom: 48, gap: 18, maxWidth: 720, width: "100%", alignSelf: "center" }}>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 26 }}>{method === "MENU" ? "Thêm bằng thực đơn" : "Thêm nguyên liệu từ ảnh"}</Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>1. {method === "MENU" ? "Chọn món" : "Chụp hoặc chọn ảnh"}  →  2. Kiểm tra  →  3. Lưu vào tủ</Text>
      {method === "MENU" ? <>
        <Text style={{ color: colors.text }}>Ngày thực đơn</Text>
        <DateField label="Ngày thực đơn" value={menuDate} onChange={setMenuDate} disabled={busy || rows !== null} />
        {menuLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {menuError ? <><Text accessibilityRole="alert" style={{ color: colors.danger }}>{menuError}</Text><Action label="Tải lại thực đơn" disabled={menuLoading || busy} soft onPress={() => setMenuRetry(v => v + 1)} /></> : null}
        {!menuLoading && !menuError && !meals.length ? <><Text style={{ color: colors.muted }}>Ngày này chưa có món. Thêm món vào thực đơn rồi quay lại đây.</Text><Action label="Mở thực đơn" soft onPress={() => navigation.popTo("Tabs", { screen: "Plan" })} /></> : null}
        {meals.map(meal => <Pressable key={meal.id} accessibilityRole="checkbox" accessibilityLabel={meal.mealName} accessibilityState={{ checked: selectedMeals.includes(meal.id) }} aria-checked={selectedMeals.includes(meal.id)} disabled={busy || rows !== null || !(meal.recipeId || meal.mealId)} onPress={() => setSelectedMeals(current => current.includes(meal.id) ? current.filter(id => id !== meal.id) : [...current, meal.id])} style={{ padding: 12, minHeight: 48, borderRadius: 10, backgroundColor: selectedMeals.includes(meal.id) ? colors.secondary : colors.surface, borderWidth: 1, borderColor: selectedMeals.includes(meal.id) ? colors.primary : colors.line }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>{selectedMeals.includes(meal.id) ? "✓ " : ""}{meal.mealName}</Text><Text style={{ color: colors.muted }}>{meal.servingSize} khẩu phần{meal.recipeId || meal.mealId ? "" : " · Chưa có công thức"}</Text>
        </Pressable>)}
        {rows === null ? <Action label="Xem nguyên liệu cần thêm" onPress={prepare} disabled={busy || menuLoading || !selectedMeals.length} /> : null}
      </> : null}
      {imageMethod ? <>
      <View pointerEvents={busy || rows !== null ? "none" : "auto"}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>Bạn muốn nhận diện gì?</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
          {([
            { value: "FOOD_IMAGE" as const, label: "Ảnh thực phẩm", icon: "food-apple-outline" as const },
            { value: "RECEIPT" as const, label: "Hóa đơn", icon: "receipt-text-outline" as const }
          ]).map((option) => {
            const selected = source === option.value;
            return <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ selected }}
              onPress={() => { setSource(option.value); setError(""); }}
              style={{ flex: 1, minHeight: 100, padding: 14, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 7,
                borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.line,
                backgroundColor: selected ? colors.secondary : colors.surface }}>
              <MaterialCommunityIcons name={option.icon} size={30} color={selected ? colors.primaryDark : colors.muted} />
              <Text style={{ color: selected ? colors.primaryDark : colors.muted, fontWeight: "700", textAlign: "center" }}>{option.label}</Text>
              {selected ? <View style={{ position: "absolute", right: 10, top: 10, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }}>
                <MaterialCommunityIcons name="check" size={14} color={colors.surface} />
              </View> : null}
            </Pressable>;
          })}
        </View>
      </View>
      <View style={{ backgroundColor: colors.card, padding: 18, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: colors.line }}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>Một ảnh, nhiều nguyên liệu</Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>{source === "RECEIPT"
          ? "Giữ nguyên toàn bộ tên và số lượng, không bị cắt mép. JPG, PNG, WEBP · tối đa 10 MB."
          : "Chụp rõ, đủ sáng. Một ảnh có thể chứa nhiều nguyên liệu. JPG, PNG, WEBP · tối đa 10 MB."}</Text>
      </View>
      {image ? <Image source={{ uri: image.uri }} resizeMode="contain" style={{ height: 210, borderRadius: 18, backgroundColor: colors.card }} /> :
        null}
      <PrimaryButton title={image ? "Chụp lại ảnh" : "Chụp ảnh"} icon="camera-outline" onPress={() => choose(true)} disabled={busy} variant={image ? "soft" : "solid"} />
      <PrimaryButton title={image ? "Chọn ảnh khác từ thư viện" : "Chọn ảnh từ thư viện"} icon="image-outline" onPress={() => choose()} disabled={busy} variant="outline" />
      {image && rows === null ? <Action label={busy ? "Đang nhận diện…" : "Phân tích ảnh"} onPress={analyze} disabled={busy} /> : null}
      {rows === null ? <Action soft label="Thêm thủ công" onPress={() => navigation.navigate("AddIngredient")} disabled={busy} /> : null}
      </> : null}
      {busy ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? isAllergyConflictMessage(error) ? <AllergyConflictBanner message={error} /> : <Text accessibilityRole="alert" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}
      {retryableAiError && image && rows === null ? <Action label="Thử lại nhận diện" onPress={analyze} disabled={busy} soft /> : null}
      {analysisNotice ? <Text accessibilityRole="alert" selectable style={{ color: colors.warning, lineHeight: 22 }}>{analysisNotice} Lượt AI của bạn không bị trừ.</Text> : null}
      {warnings.map((w, index) => <Text key={index} selectable style={{ color: colors.primary }}>{w === "No food ingredients were detected." ? "Chưa nhận diện được nguyên liệu. Hãy thử ảnh rõ hơn hoặc thêm thủ công." : w}</Text>)}
      {rows !== null ? <>
        <Text style={{ color: colors.text, fontSize: 21, fontWeight: "700" }}>Kiểm tra {rows.length} nguyên liệu</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Kết quả có thể chưa chính xác. Chọn đúng nguyên liệu, số lượng và đơn vị; bỏ các dòng không cần lưu.</Text>
        {rows.map((r) => {
          const pendingConfirmation = needsConfirmation(r);
          const quantityError = (attemptedConfirm || r.quantityTouched) && !validQuantity(r.quantityText);
          const unitError = attemptedConfirm && !r.unitText.trim();
          return <View key={r.key} style={{ backgroundColor: pendingConfirmation ? "#FFFBEB" : colors.card, borderRadius: 16, borderWidth: 1, borderColor: pendingConfirmation ? "#FCD34D" : colors.line, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 5 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>AI nhận diện: {r.rawName}</Text>
                <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: pendingConfirmation ? "#FEF3C7" : "#E4F3E7" }}>
                  <Text style={{ color: pendingConfirmation ? "#B45309" : colors.success, fontSize: 12, fontWeight: "700" }}>{pendingConfirmation ? "Cần xác nhận" : "Đã xác nhận"}</Text>
                </View>
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                {pendingConfirmation ? "AI chưa chắc chắn. Hãy chọn nguyên liệu đúng trong danh mục." : `Đã chọn: ${r.canonicalIngredientName}`}
              </Text>
            </View>
            <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`Bỏ ${r.rawName}`} onPress={() => { setRows((current) => current?.filter((x) => x.key !== r.key) ?? null); if (editing === r.key) setEditing(null); }} style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>
          <Action soft label={editing === r.key ? "Đóng tìm kiếm" : r.ingredientId ? "Đổi nguyên liệu" : "Chọn nguyên liệu"} disabled={busy}
            onPress={() => {
              const opening = editing !== r.key;
              setEditing(opening ? r.key : null);
              // When catalog resolution failed, begin with Gemini's detected name so the user does
              // not have to type it again before choosing the correct catalog ingredient.
              setQuery(opening && !r.ingredientId && pendingConfirmation ? r.rawName : "");
            }} />
          {editing === r.key ? <View style={{ gap: 10 }}>
            <AppInput accessibilityLabel="Tìm nguyên liệu" value={query} onChangeText={setQuery} placeholder="Tìm trong danh mục…" placeholderTextColor={colors.muted} style={inputStyle} editable={!busy} />
            {searching ? <ActivityIndicator color={colors.primary} /> : null}
            {searchError ? <Pressable onPress={() => setSearchRetry((v) => v + 1)}><Text style={{ color: colors.danger }}>{searchError} Nhấn để thử lại.</Text></Pressable> : null}
            {!searching && !searchError && !matches.length ? <Text style={{ color: colors.muted }}>Không tìm thấy. Thử tên khác hoặc bỏ dòng này.</Text> : null}
            {matches.map((i) => <Pressable disabled={busy} key={i.id} onPress={() => {
              patchRow(r.key, {
                ingredientId: i.id, canonicalIngredientName: i.name, resolverStatus: "RESOLVED", reviewRequired: false, flags: [],
                unitText: i.unit || i.defaultUnit || "piece",
                quantityText: String(getIngredientQuantityStep(i, i.unit || i.defaultUnit || "piece")),
                quantityTouched: false
              });
              setEditing(null);
            }} style={{ minHeight: 44, padding: 10, borderBottomWidth: 1, borderColor: colors.line }}>
              <Text style={{ color: colors.text }}>{i.name} · đơn vị danh mục: {i.unit}</Text>
            </Pressable>)}
          </View> : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}><Text style={{ color: colors.muted }}>Số lượng</Text><AppInput accessibilityLabel={`Số lượng ${r.rawName}`} editable={!busy} value={r.quantityText} onChangeText={(v) => patchRow(r.key, { quantityText: v })} onBlur={() => patchRow(r.key, { quantityTouched: true })} keyboardType="decimal-pad" style={{ ...inputStyle, borderColor: quantityError ? "#DC2626" : colors.line }} />
              {quantityError ? <Text accessibilityRole="alert" style={{ color: "#DC2626", fontSize: 12 }}>Nhập số lượng lớn hơn 0 trước khi lưu.</Text> : null}</View>
            <View style={{ flex: 1 }}><SelectField label={`Đơn vị ${r.rawName}`} displayLabel="Đơn vị" value={r.unitText} options={unitOptions} onValueChange={(value) => patchRow(r.key, { unitText: value })} disabled={busy} error={unitError ? "Chọn đơn vị trước khi lưu." : undefined} /></View>
          </View>
        </View>;
        })}
        <Text style={{ color: colors.primary, lineHeight: 22 }}>Nếu nguyên liệu đã có cùng đơn vị trong tủ, số lượng sẽ được cộng dồn. Khác đơn vị sẽ được lưu thành dòng riêng để không quy đổi sai. Bạn có thể đặt hạn sử dụng trong chi tiết tủ sau khi lưu.</Text>
        <Action label={busy ? "Đang lưu…" : `Xác nhận lưu ${rows.length} nguyên liệu`} onPress={confirm} disabled={busy || !rows.length} />
        <Action label="Chỉnh lại nguồn nhập" soft disabled={busy} onPress={() => { setRows(null); setEditing(null); setError(""); setWarnings([]); setAttemptedConfirm(false); }} />
      </> : null}
      {!imageMethod ? <Action soft label="Thêm thủ công" onPress={() => navigation.navigate("AddIngredient")} disabled={busy} /> : null}
    </ScrollView>
  </KeyboardSafeView></SafeAreaView>;
}
function unknownReasonMessage(reason: string) {
  return ({ BLURRY: "Ảnh bị mờ, hãy chụp lại gần hơn.", TOO_DARK: "Ảnh quá tối, hãy thêm ánh sáng.", NO_FOOD: "Không thấy thực phẩm hoặc hóa đơn trong ảnh.", NOT_SUPPORTED: "Ảnh menu, công thức hoặc món đã nấu chưa được hỗ trợ.", UNCERTAIN: "Chưa nhận diện được loại ảnh, hãy chọn thủ công." } as Record<string, string>)[reason] || "Chưa nhận diện được ảnh.";
}
const inputStyle = { minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, color: colors.text };
function defaultQuantityForUnit(unit: string) {
  const normalized = unit.trim().toLowerCase();
  return normalized === "g" || normalized === "gram" || normalized === "ml" ? "100" : "1";
}
function Action({ label, onPress, disabled, soft }: { label: string; onPress: () => void; disabled?: boolean; soft?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ minHeight: 44, padding: 12, borderRadius: 12, alignItems: "center", backgroundColor: soft ? colors.card : colors.primary, borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: soft ? colors.text : colors.textDark, fontWeight: "600" }}>{label}</Text>
  </Pressable>;
}
