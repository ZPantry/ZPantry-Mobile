import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import type { PantryApiItem } from "@/api/pantry";
import { pantryApi } from "@/api/pantry";
import AppBackButton from "@/components/AppBackButton";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { statusColor } from "@/utils/helpers";

const storageOptions = ["Ngăn mát", "Ngăn đông", "Kệ bếp"];
function toInputDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function normalizeStorageLocation(label: string) {
  if (label === "Ngăn đông") return "Ngan dong";
  if (label === "Kệ bếp") return "Ke bep";
  return "Ngan mat";
}

function displayStorageLocation(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("dong") || lower.includes("đông")) return "Ngăn đông";
  if (lower.includes("bep") || lower.includes("bếp")) return "Kệ bếp";
  return "Ngăn mát";
}

function daysLeft(expiredAt: string) {
  return Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function expiryCopy(expiredAt: string) {
  const left = daysLeft(expiredAt);
  if (left < 0) return `Đã hết hạn ${Math.abs(left)} ngày`;
  if (left === 0) return "Hết hạn hôm nay";
  if (left === 1) return "Hết hạn ngày mai";
  return `Còn ${left} ngày sử dụng`;
}

function pantryTone(expiredAt: string) {
  const left = daysLeft(expiredAt);
  if (left <= 1) return "danger";
  if (left <= 5) return "warning";
  return "safe";
}

export default function PantryItemDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const toast = useToast();
  const initialItem = route.params?.pantryItem as PantryApiItem | undefined;
  const ingredient = route.params?.ingredient as Ingredient | undefined;
  const [item, setItem] = useState<PantryApiItem | undefined>(initialItem);
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(initialItem?.quantity ?? 1));
  const [unit, setUnit] = useState(initialItem?.unit ?? ingredient?.unit ?? "phần");
  const [expiredAt, setExpiredAt] = useState(toInputDate(initialItem?.expiredAt ?? new Date().toISOString()));
  const [storageLocation, setStorageLocation] = useState(displayStorageLocation(initialItem?.storageLocation ?? "Ngan mat"));
  const [note, setNote] = useState(initialItem?.note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const tone = useMemo(() => pantryTone(item?.expiredAt ?? new Date().toISOString()), [item?.expiredAt]);
  const toneColor = statusColor(tone);

  const title = ingredient?.name || item?.note || "Nguyên liệu";

  const validate = () => {
    const amount = Number(quantity.replace(",", "."));
    if (!item?.id || !item.ingredientId) return "Không tìm thấy nguyên liệu cần cập nhật.";
    if (!Number.isFinite(amount) || amount <= 0) return "Số lượng phải lớn hơn 0.";
    if (!unit.trim()) return "Đơn vị không được để trống.";
    if (Number.isNaN(new Date(expiredAt).getTime())) return "Hạn dùng cần có dạng năm-tháng-ngày, ví dụ 2026-07-05.";
    return "";
  };

  const updateItem = async () => {
    const message = validate();
    if (message) {
      setErrorMessage(message);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        ingredientId: item!.ingredientId,
        quantity: Number(quantity.replace(",", ".")),
        unit: unit.trim(),
        expiredAt: new Date(expiredAt).toISOString(),
        storageLocation: normalizeStorageLocation(storageLocation),
        note: note.trim()
      };
      const updated = await pantryApi.updateItem(item!.id, payload);
      setItem(updated);
      setIsEditing(false);
      toast.show(`Đã cập nhật ${title}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa cập nhật được nguyên liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = () => {
    if (!item?.id) {
      setErrorMessage("Thiếu itemId nên chưa thể xóa nguyên liệu.");
      return;
    }

    setErrorMessage("");
    setIsConfirmingDelete(true);
  };

  const confirmDeleteItem = async () => {
    if (!item?.id) {
      setErrorMessage("Thiếu itemId nên chưa thể xóa nguyên liệu.");
      setIsConfirmingDelete(false);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      await pantryApi.removeItem(item.id);
      setIsConfirmingDelete(false);
      toast.show(`Đã xóa ${title} khỏi tủ lạnh.`);
      navigation.goBack();
    } catch (error) {
      setIsConfirmingDelete(false);
      setErrorMessage(error instanceof Error ? error.message : "Chưa xóa được nguyên liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: 22 }} edges={["top"]}>
        <AppBackButton variant="icon" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <MaterialCommunityIcons name="fridge-alert-outline" size={42} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" }} selectable>
            Không tìm thấy nguyên liệu
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", textAlign: "center", lineHeight: 21 }} selectable>
            Quay lại tủ lạnh và thử mở lại mục bạn muốn xem.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 22, paddingBottom: 42, gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <AppBackButton variant="icon" onPress={() => navigation.goBack()} />
          <Pressable
            onPress={() => setIsEditing((current) => !current)}
            style={({ pressed }) => ({
              minHeight: 44,
              borderRadius: 22,
              backgroundColor: isEditing ? colors.primary : colors.card,
              borderWidth: 1,
              borderColor: isEditing ? colors.primary : colors.line,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              opacity: pressed ? 0.82 : 1
            })}
          >
            <MaterialCommunityIcons name={isEditing ? "eye-outline" : "pencil-outline"} size={19} color={isEditing ? colors.textDark : colors.text} />
            <Text style={{ color: isEditing ? colors.textDark : colors.text, fontSize: 13, fontWeight: "900" }} selectable>
              {isEditing ? "Xem lại" : "Chỉnh sửa"}
            </Text>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 18, gap: 14, boxShadow: "0 14px 28px rgba(0,0,0,0.22)" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 62, height: 62, borderRadius: 18, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name={ingredient?.category?.toLowerCase().includes("meat") ? "food-steak" : "food-apple-outline"} size={33} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textDark, fontSize: 26, fontWeight: "900", lineHeight: 31 }} selectable>
                {title}
              </Text>
              <Text style={{ color: colors.mutedDark, fontSize: 13, fontWeight: "800", marginTop: 2 }} selectable>
                {ingredient?.category || "Nguyên liệu trong tủ"}
              </Text>
            </View>
          </View>

          <View style={{ borderRadius: 14, backgroundColor: `${toneColor}20`, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name={tone === "safe" ? "check-circle" : "alert-circle"} size={24} color={toneColor} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: "900" }} selectable>
                {expiryCopy(item.expiredAt)}
              </Text>
              <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "700", marginTop: 2 }} selectable>
                Cập nhật hạn dùng để Z-Pantry ưu tiên gợi ý món phù hợp.
              </Text>
            </View>
          </View>
        </View>

        {isEditing ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
              Cập nhật nguyên liệu
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <FormInput label="Số lượng" value={quantity} onChangeText={setQuantity} placeholder="1" keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <FormInput label="Đơn vị" value={unit} onChangeText={setUnit} placeholder="quả" />
              </View>
            </View>
            <FormInput label="Hạn dùng" value={expiredAt} onChangeText={setExpiredAt} placeholder="2026-07-05" />
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
                Nơi cất
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {storageOptions.map((option) => (
                  <CategoryChip key={option} label={option} active={storageLocation === option} icon={option === "Ngăn đông" ? "snowflake" : "fridge-outline"} onPress={() => setStorageLocation(option)} />
                ))}
              </View>
            </View>
            <FormInput label="Ghi chú" value={note} onChangeText={setNote} placeholder="Ví dụ: mua ở chợ sáng nay" multiline />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <InfoRow icon="scale-balance" label="Số lượng" value={`${item.quantity} ${item.unit}`} />
            <InfoRow icon="calendar-clock" label="Hạn dùng" value={new Date(item.expiredAt).toLocaleDateString("vi-VN")} />
            <InfoRow icon="fridge-outline" label="Nơi cất" value={displayStorageLocation(item.storageLocation)} />
            <InfoRow icon="note-text-outline" label="Ghi chú" value={item.note || "Chưa có ghi chú"} />
          </View>
        )}

        {errorMessage ? (
          <Text style={{ color: "#FFE6E6", fontWeight: "800", textAlign: "center", lineHeight: 20 }} selectable>
            {errorMessage}
          </Text>
        ) : null}

        <View style={{ gap: 10 }}>
          {isEditing ? <PrimaryButton title={isSaving ? "Đang lưu..." : "Lưu thay đổi"} icon="content-save" onPress={updateItem} /> : null}
          <Pressable
            onPress={openDeleteConfirm}
            disabled={isSaving}
            style={({ pressed }) => ({
              minHeight: 54,
              borderRadius: 27,
              backgroundColor: "rgba(255,77,79,0.16)",
              borderWidth: 1,
              borderColor: "rgba(255,77,79,0.48)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              opacity: pressed || isSaving ? 0.78 : 1
            })}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: 16, fontWeight: "900" }} selectable>
              Xóa khỏi tủ lạnh
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal transparent visible={isConfirmingDelete} animationType="fade" onRequestClose={() => setIsConfirmingDelete(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.58)", padding: 22, justifyContent: "center" }}>
          <View style={{ borderRadius: 18, backgroundColor: colors.white, padding: 18, gap: 14, boxShadow: "0 18px 36px rgba(0,0,0,0.28)" }}>
            <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,77,79,0.14)", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="trash-can-outline" size={30} color={colors.danger} />
            </View>
            <View style={{ gap: 7 }}>
              <Text style={{ color: colors.textDark, fontSize: 22, fontWeight: "900", lineHeight: 27 }} selectable>
                Xóa khỏi tủ lạnh?
              </Text>
              <Text style={{ color: colors.mutedDark, fontSize: 14, fontWeight: "700", lineHeight: 21 }} selectable>
                {title} sẽ bị xóa khỏi tủ lạnh của bạn. 
              </Text>
            </View>

            <View style={{ borderRadius: 12, backgroundColor: "#FFF3F3", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <MaterialCommunityIcons name="information-outline" size={22} color={colors.danger} />
              <Text style={{ flex: 1, color: colors.textDark, fontSize: 13, fontWeight: "800", lineHeight: 19 }} selectable>
                Mục này sẽ biến mất khỏi tủ lạnh và không còn được dùng khi gợi ý món.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setIsConfirmingDelete(false)}
                disabled={isSaving}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 50,
                  borderRadius: 25,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#EEF3EF",
                  opacity: pressed || isSaving ? 0.76 : 1
                })}
              >
                <Text style={{ color: colors.textDark, fontSize: 15, fontWeight: "900" }} selectable>
                  Hủy
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmDeleteItem}
                disabled={isSaving}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 50,
                  borderRadius: 25,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.danger,
                  opacity: pressed || isSaving ? 0.76 : 1
                })}
              >
                <Text style={{ color: colors.white, fontSize: 15, fontWeight: "900" }} selectable>
                  {isSaving ? "Đang xóa..." : "Xóa"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
        {label}
      </Text>
      <View style={{ minHeight: multiline ? 78 : 46, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: multiline ? "flex-start" : "center", paddingHorizontal: 12, paddingVertical: multiline ? 10 : 0 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "700", paddingVertical: 0, minHeight: multiline ? 56 : undefined, textAlignVertical: multiline ? "top" : "center" }}
        />
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ minHeight: 66, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }} selectable>
          {label}
        </Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 2 }} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}
