import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import { pantryApi } from "@/api/pantry";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import SearchBar from "@/components/SearchBar";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";

const storageOptions = ["Ngăn mát", "Ngăn đông", "Kệ bếp"];

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeStorageLocation(label: string) {
  if (label === "Kệ bếp") return "pantry";
  return "fridge";
}

export default function AddIngredientScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pantryIngredientIds, setPantryIngredientIds] = useState<Set<string>>(new Set());
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("piece");
  const [expiredAt, setExpiredAt] = useState(toInputDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)));
  const [storageLocation, setStorageLocation] = useState(storageOptions[0]);
  const [note, setNote] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadIngredients = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [ingredientPage, pantryItems] = await Promise.all([ingredientsApi.list(1, 100), pantryApi.list()]);
      setIngredients(ingredientPage.data);
      setPantryIngredientIds(new Set(pantryItems.map((item) => item.ingredientId)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được danh sách nguyên liệu.");
      setIngredients([]);
      setPantryIngredientIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  const availableIngredients = useMemo(() => ingredients.filter((ingredient) => !pantryIngredientIds.has(ingredient.id)), [ingredients, pantryIngredientIds]);
  const selectedIngredient = ingredients.find((ingredient) => ingredient.id === selectedIngredientId);
  const filteredIngredients = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return availableIngredients;
    return availableIngredients.filter((ingredient) => `${ingredient.name} ${ingredient.normalizedName} ${ingredient.category}`.toLowerCase().includes(keyword));
  }, [availableIngredients, searchText]);

  const resetSelection = () => {
    setSelectedIngredientId("");
    setQuantity("1");
    setUnit("piece");
    setExpiredAt(toInputDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)));
    setStorageLocation(storageOptions[0]);
    setNote("");
  };

  const selectIngredient = (ingredient: Ingredient) => {
    if (selectedIngredientId === ingredient.id) {
      resetSelection();
      setErrorMessage("");
      return;
    }

    setSelectedIngredientId(ingredient.id);
    setUnit(ingredient.defaultUnit || ingredient.unit || "piece");
    setErrorMessage("");
  };

  const saveIngredient = async () => {
    const amount = Number(quantity.replace(",", "."));

    if (!selectedIngredient) {
      setErrorMessage("Vui lòng chọn nguyên liệu có sẵn trong hệ thống.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Số lượng cần lớn hơn 0.");
      return;
    }
    if (!unit.trim()) {
      setErrorMessage("Vui lòng nhập đơn vị, ví dụ: g, cái, trái, hộp.");
      return;
    }
    if (Number.isNaN(new Date(expiredAt).getTime())) {
      setErrorMessage("Hạn dùng cần có dạng năm-tháng-ngày, ví dụ 2026-07-05.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      await pantryApi.saveItem({
        ingredientId: selectedIngredient.id,
        quantity: amount,
        unit: unit.trim(),
        expiredAt,
        storageLocation: normalizeStorageLocation(storageLocation),
        note: note.trim()
      });

      toast.show(`Đã lưu ${selectedIngredient.name} vào tủ.`);
      navigation.goBack();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa lưu được nguyên liệu vào tủ.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadIngredients} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 22, paddingBottom: 42, gap: 18 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }} selectable>
              Thêm vào tủ
            </Text>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "900", marginTop: 3 }} selectable>
              {filteredIngredients.length} nguyên liệu chưa có trong tủ
            </Text>
          </View>
          <PrimaryButton title="" icon="close" variant="soft" onPress={() => navigation.goBack()} style={{ width: 48, minHeight: 48, paddingHorizontal: 0 }} />
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
            Chọn nguyên liệu có sẵn
          </Text>
          <SearchBar placeholder="Tìm nguyên liệu chưa có trong tủ" value={searchText} onChangeText={setSearchText} />
          {filteredIngredients.length === 0 ? (
            <EmptyState icon="check-circle-outline" text={availableIngredients.length === 0 ? "Tất cả nguyên liệu hệ thống đã có trong tủ của bạn." : "Không có nguyên liệu phù hợp với từ khóa này."} />
          ) : (
            <View style={{ gap: 10 }}>
              {filteredIngredients.map((item) => (
                <IngredientRow key={item.id} ingredient={item} selected={item.id === selectedIngredientId} onPress={() => selectIngredient(item)} />
              ))}
            </View>
          )}
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
            Thông tin lưu trữ
          </Text>

          {selectedIngredient ? (
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: colors.white, borderRadius: 14, padding: 12 }}>
              <Image source={{ uri: normalizeRemoteImageUrl(selectedIngredient.imageUrl || FALLBACK_FOOD_IMAGE_URL) }} style={{ width: 58, height: 58, borderRadius: 14, backgroundColor: colors.secondary }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textDark, fontSize: 18, fontWeight: "900" }} selectable>
                  {selectedIngredient.name}
                </Text>
                <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "800", marginTop: 2 }} selectable>
                  {selectedIngredient.category || "Nguyên liệu hệ thống"}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FormInput label="Số lượng" value={quantity} onChangeText={setQuantity} placeholder="1" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput label="Đơn vị" value={unit} onChangeText={setUnit} placeholder="g" />
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

          {errorMessage ? (
            <Text style={{ color: "#FFE6E6", fontWeight: "800", textAlign: "center", lineHeight: 20 }} selectable>
              {errorMessage}
            </Text>
          ) : null}

          <PrimaryButton title={isSaving ? "Đang lưu..." : "Xác nhận lưu vào tủ"} icon="content-save" onPress={saveIngredient} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function IngredientRow({ ingredient, selected, onPress }: { ingredient: Ingredient; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 78,
        borderRadius: 14,
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: selected ? colors.primary : "transparent",
        padding: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.86 : 1,
        boxShadow: selected ? "0 10px 22px rgba(244,162,28,0.22)" : "0 8px 18px rgba(0,0,0,0.14)"
      })}
    >
      <Image source={{ uri: normalizeRemoteImageUrl(ingredient.imageUrl || FALLBACK_FOOD_IMAGE_URL) }} style={{ width: 58, height: 58, borderRadius: 12, backgroundColor: colors.secondary }} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: colors.textDark, fontSize: 16, fontWeight: "900" }} selectable>
          {ingredient.name}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "800", marginTop: 4 }} selectable>
          {ingredient.category || "Nguyên liệu"} · {ingredient.defaultUnit || ingredient.unit || "piece"}
        </Text>
      </View>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: selected ? colors.primary : colors.secondary, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name={selected ? "check" : "plus"} size={19} color={selected ? colors.white : colors.primaryDark} />
      </View>
    </Pressable>
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

function EmptyState({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      <Text style={{ flex: 1, color: colors.text, fontWeight: "800", lineHeight: 21 }} selectable>
        {text}
      </Text>
    </View>
  );
}
