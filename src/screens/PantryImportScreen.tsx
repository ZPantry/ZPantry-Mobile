import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { pantryImportApi, type ImportSource, type ImportPreviewItem } from "@/api/pantryImport";
import { ingredientsApi, type Ingredient } from "@/api/ingredients";
import SelectField from "@/components/SelectField";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { pickUploadImage, type PickedUploadImage } from "@/utils/pickUploadImage";
import { getFriendlyErrorMessage } from "@/utils/localize";

type Draft = ImportPreviewItem & { key: number; quantityText: string; unitText: string };
export default function PantryImportScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [source, setSource] = useState<ImportSource>("FOOD_IMAGE");
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
      if (!Array.isArray(result.items)) throw new Error("Kết quả nhận diện không hợp lệ. Hãy thử ảnh khác.");
      setRows(result.items.map((r, key) => ({ ...r, key, quantityText: r.quantity == null ? "" : String(r.quantity), unitText: r.unit || "" })));
      setWarnings(result.warnings || []);
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
      navigation.navigate("Tabs", { screen: "Pantry" });
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa lưu được. Bản chỉnh sửa vẫn được giữ lại.")); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 22, paddingBottom: 48, gap: 18, maxWidth: 720, width: "100%", alignSelf: "center" }}>
      <Pressable disabled={busy} onPress={() => navigation.goBack()} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: colors.primary, fontWeight: "800" }}>‹ Quay lại</Text></Pressable>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 28 }}>Thêm nguyên liệu từ ảnh</Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>1. Chọn ảnh  →  2. Kiểm tra  →  3. Lưu vào tủ</Text>
      <View pointerEvents={busy || rows !== null ? "none" : "auto"}>
        <SelectField label="Bạn muốn nhận diện gì?" value={source} onValueChange={(v) => setSource(v as ImportSource)} options={[
          { value: "FOOD_IMAGE", label: "Ảnh thực phẩm" }, { value: "RECEIPT", label: "Hóa đơn mua hàng" }
        ]} />
      </View>
      {image ? <Image source={{ uri: image.uri }} resizeMode="contain" style={{ height: 210, borderRadius: 18, backgroundColor: colors.card }} /> :
        <View style={{ backgroundColor: colors.card, padding: 28, borderRadius: 18, gap: 10 }}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>Một ảnh, nhiều nguyên liệu</Text>
          <Text style={{ color: colors.muted, lineHeight: 21 }}>Chọn ảnh rõ, đủ sáng. Với hóa đơn, giữ nguyên toàn bộ tên và số lượng. JPG, PNG, WEBP · tối đa 10 MB.</Text>
        </View>}
      <Action label={image ? "Chọn ảnh khác" : "Chọn ảnh từ thư viện"} onPress={choose} disabled={busy} soft />
      {image && rows === null ? <Action label={busy ? "Đang nhận diện…" : "Phân tích ảnh"} onPress={analyze} disabled={busy} /> : null}
      {busy ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text accessibilityRole="alert" selectable style={{ color: "#FFE6E6", lineHeight: 22 }}>{error}</Text> : null}
      {warnings.map((w, index) => <Text key={index} selectable style={{ color: colors.primary }}>{w === "No food ingredients were detected." ? "Chưa nhận diện được nguyên liệu. Hãy thử ảnh rõ hơn hoặc thêm thủ công." : w}</Text>)}
      {rows !== null ? <>
        <Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>Kiểm tra {rows.length} nguyên liệu</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Kết quả có thể chưa chính xác. Chọn đúng nguyên liệu, số lượng và đơn vị; bỏ các dòng không cần lưu.</Text>
        {rows.map((r) => <View key={r.key} style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: r.ingredientId ? colors.line : colors.primary, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>{r.rawName}</Text>
              <Text style={{ color: r.ingredientId ? colors.muted : colors.primary }}>{r.ingredientId ? r.canonicalIngredientName : "Cần chọn nguyên liệu tương ứng"}</Text></View>
            <Pressable disabled={busy} accessibilityLabel={`Bỏ ${r.rawName}`} onPress={() => { setRows((current) => current?.filter((x) => x.key !== r.key) ?? null); if (editing === r.key) setEditing(null); }} style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}><Text style={{ color: "#FFE6E6" }}>Bỏ</Text></Pressable>
          </View>
          <Action soft label={editing === r.key ? "Đóng tìm kiếm" : r.ingredientId ? "Đổi nguyên liệu" : "Chọn nguyên liệu"} disabled={busy}
            onPress={() => { setEditing(editing === r.key ? null : r.key); setQuery(""); }} />
          {editing === r.key ? <View style={{ gap: 10 }}>
            <TextInput accessibilityLabel="Tìm nguyên liệu" value={query} onChangeText={setQuery} placeholder="Tìm trong danh mục…" placeholderTextColor={colors.muted} style={inputStyle} editable={!busy} />
            {searching ? <ActivityIndicator color={colors.primary} /> : null}
            {searchError ? <Pressable onPress={() => setSearchRetry((v) => v + 1)}><Text style={{ color: "#FFE6E6" }}>{searchError} Nhấn để thử lại.</Text></Pressable> : null}
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
      </> : null}
      <Action soft label="Thêm thủ công" onPress={() => navigation.navigate("AddIngredient")} disabled={busy} />
    </ScrollView>
  </SafeAreaView>;
}
const inputStyle = { minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, color: colors.text };
function Action({ label, onPress, disabled, soft }: { label: string; onPress: () => void; disabled?: boolean; soft?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ minHeight: 48, padding: 14, borderRadius: 14, alignItems: "center", backgroundColor: soft ? colors.card : colors.primary, borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ color: soft ? colors.text : colors.textDark, fontWeight: "800" }}>{label}</Text>
  </Pressable>;
}
