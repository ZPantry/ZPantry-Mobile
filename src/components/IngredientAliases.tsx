import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import Text from "@/components/AppText";
import PrimaryButton from "@/components/PrimaryButton";
import { ingredientsApi, type IngredientAlias } from "@/api/ingredients";
import { colors } from "@/constants/colors";
import { getFriendlyErrorMessage } from "@/utils/localize";

export default function IngredientAliases({ ingredientId, disabled }: { ingredientId: string; disabled: boolean }) {
  const [aliases, setAliases] = useState<IngredientAlias[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    ingredientsApi.aliases(ingredientId).then(rows => { if (active) setAliases(rows); })
      .catch(e => { if (active) setError(getFriendlyErrorMessage(e, "Chưa tải được tên gọi khác.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ingredientId, retry]);
  const mutate = async (aliasId?: string) => {
    if (lock.current || disabled) return;
    if (!aliasId && aliases.some(a => a.aliasName.trim().toLocaleLowerCase() === draft.trim().toLocaleLowerCase())) {
      setError("Tên gọi này đã có trong danh sách."); return;
    }
    lock.current = true; setBusy(true); setError("");
    try {
      if (aliasId) {
        await ingredientsApi.removeAlias(ingredientId, aliasId);
        setAliases(rows => rows.filter(a => a.id !== aliasId)); setPendingDelete(null);
      } else {
        const alias = await ingredientsApi.addAlias(ingredientId, draft);
        setAliases(rows => [...rows, alias]); setDraft("");
      }
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa lưu được tên gọi. Vui lòng thử lại.")); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ borderRadius: 18, backgroundColor: colors.surface, padding: 18, gap: 12, borderWidth: 1, borderColor: colors.line }}>
    <Text style={{ color: colors.dark, fontSize: 19, fontWeight: "700" }}>Tên gọi khác</Text>
    <Text style={{ color: colors.muted, lineHeight: 21 }}>Thêm tên thường dùng hoặc tên trên hóa đơn để hỗ trợ nhận diện đúng nguyên liệu.</Text>
    {loading ? <ActivityIndicator color={colors.primary} /> : null}
    {!loading && !error && !aliases.length ? <Text style={{ color: colors.muted }}>Chưa có tên gọi khác. Thêm tên đầu tiên bên dưới.</Text> : null}
    {aliases.map(alias => <View key={alias.id} style={{ gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.input }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text selectable style={{ color: colors.text, flex: 1 }}>{alias.aliasName}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Xóa tên ${alias.aliasName}`} disabled={disabled || busy} onPress={() => setPendingDelete(alias.id)} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: colors.danger }}>Xóa</Text></Pressable>
      </View>
      {pendingDelete === alias.id ? <View style={{ gap: 8 }}>
        <Text style={{ color: colors.muted }}>Xóa tên gọi này khỏi nguyên liệu?</Text>
        <PrimaryButton title="Xác nhận xóa tên gọi" variant="outline" disabled={disabled} loading={busy} onPress={() => mutate(alias.id)} />
        <PrimaryButton title="Giữ lại" variant="soft" disabled={busy} onPress={() => setPendingDelete(null)} />
      </View> : null}
    </View>)}
    <View style={{ backgroundColor: colors.input, borderRadius: 12 }}><TextInput accessibilityLabel="Tên gọi khác" editable={!disabled && !busy && !loading} value={draft} onChangeText={setDraft} maxLength={200} placeholder="Ví dụ: cà rốt Đà Lạt" placeholderTextColor={colors.muted} style={{ minHeight: 48, padding: 12, borderRadius: 12, color: colors.text }} /></View>
    {error ? <><Text selectable accessibilityRole="alert" style={{ color: colors.danger, lineHeight: 21 }}>{error}</Text><PrimaryButton title="Tải lại tên gọi" variant="outline" disabled={busy || disabled} onPress={() => setRetry(v => v + 1)} /></> : null}
    <PrimaryButton title="Thêm tên gọi" variant="soft" disabled={disabled || loading || !draft.trim()} loading={busy} onPress={() => mutate()} />
  </View>;
}
