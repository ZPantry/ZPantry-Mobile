import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";

const defaultImageUrl = FALLBACK_FOOD_IMAGE_URL;
const storageOptions = ["Ngăn mát", "Ngăn đông", "Kệ bếp"];

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeStorageLocation(label: string) {
  if (label === "Ngăn đông") return "Ngan dong";
  if (label === "Kệ bếp") return "Ke bep";
  return "Ngan mat";
}

export default function AddIngredientScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const toast = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Rau củ");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("phần");
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
      const page = await ingredientsApi.list(1, 100);
      setIngredients(page.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được danh sách nguyên liệu.");
      setIngredients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  const filteredIngredients = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return ingredients;
    return ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(keyword) || ingredient.category.toLowerCase().includes(keyword));
  }, [ingredients, searchText]);

  const selectedIngredient = ingredients.find((ingredient) => ingredient.id === selectedIngredientId);

  const selectIngredient = (ingredient: Ingredient) => {
    setSelectedIngredientId(ingredient.id);
    setName(ingredient.name);
    setCategory(ingredient.category);
    setUnit(ingredient.unit);
  };

  const saveIngredient = async () => {
    if (!user?.userId) {
      setErrorMessage("Bạn cần đăng nhập để thêm thực phẩm vào tủ.");
      return;
    }

    const cleanName = name.trim();
    const cleanUnit = unit.trim();
    const amount = Number(quantity.replace(",", "."));

    if (!cleanName) {
      setErrorMessage("Vui lòng nhập tên nguyên liệu.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Số lượng cần lớn hơn 0.");
      return;
    }
    if (!cleanUnit) {
      setErrorMessage("Vui lòng nhập đơn vị, ví dụ: quả, gram, hộp.");
      return;
    }
    if (Number.isNaN(new Date(expiredAt).getTime())) {
      setErrorMessage("Hạn dùng cần có dạng năm-tháng-ngày, ví dụ 2026-07-05.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      const ingredient =
        selectedIngredient && selectedIngredient.name === cleanName
          ? selectedIngredient
          : await ingredientsApi.create({
              name: cleanName,
              category: category.trim() || "Khác",
              unit: cleanUnit,
              caloriesPerUnit: 0,
              proteinPerUnit: 0,
              fatPerUnit: 0,
              carbPerUnit: 0,
              imageUrl: defaultImageUrl
            });

      await pantryApi.saveItem(user.userId, {
        ingredientId: ingredient.id,
        quantity: amount,
        unit: cleanUnit,
        expiredAt: new Date(expiredAt).toISOString(),
        storageLocation: normalizeStorageLocation(storageLocation),
        note: note.trim()
      });

      toast.show(`Đã thêm ${ingredient.name} vào tủ lạnh.`);
      setSelectedIngredientId("");
      setName("");
      setCategory("Rau củ");
      setQuantity("1");
      setUnit("phần");
      setExpiredAt(toInputDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)));
      setNote("");
      await loadIngredients();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa thêm được nguyên liệu.");
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
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }} selectable>
            Thêm nguyên liệu
          </Text>
          <PrimaryButton title="" icon="close" variant="soft" onPress={() => navigation.goBack()} style={{ width: 48, minHeight: 48, paddingHorizontal: 0 }} />
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
            Thêm vào tủ của bạn
          </Text>
          <FormInput label="Tên nguyên liệu" value={name} onChangeText={(value) => {
            setName(value);
            setSelectedIngredientId("");
          }} placeholder="Ví dụ: Trứng gà" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FormInput label="Số lượng" value={quantity} onChangeText={setQuantity} placeholder="1" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput label="Đơn vị" value={unit} onChangeText={setUnit} placeholder="quả" />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FormInput label="Nhóm" value={category} onChangeText={setCategory} placeholder="Rau củ" />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput label="Hạn dùng" value={expiredAt} onChangeText={setExpiredAt} placeholder="2026-07-05" />
            </View>
          </View>
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
            <Text style={{ color: "#FFE6E6", fontWeight: "800", textAlign: "center" }} selectable>
              {errorMessage}
            </Text>
          ) : null}

          <PrimaryButton title={isSaving ? "Đang lưu..." : "Lưu vào tủ"} icon="content-save" onPress={saveIngredient} />
        </View>

        <View style={{ gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
            Chọn nhanh từ nguyên liệu có sẵn
          </Text>
          <SearchBar placeholder="Tìm nguyên liệu" value={searchText} onChangeText={setSearchText} />
          {filteredIngredients.length === 0 ? (
            <EmptyState icon="food-apple-outline" text="Chưa có nguyên liệu phù hợp. Bạn có thể nhập mới ở form phía trên." />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {filteredIngredients.map((item) => (
                <CategoryChip key={item.id} label={`${item.name} · ${item.unit}`} active={item.id === selectedIngredientId} icon="food-apple-outline" onPress={() => selectIngredient(item)} />
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
            Dinh dưỡng tham khảo
          </Text>
          {ingredients.length === 0 ? (
            <EmptyState icon="chart-donut" text="Chưa có dữ liệu dinh dưỡng để hiển thị." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {ingredients.slice(0, 8).map((ingredient) => (
                <Pressable key={ingredient.id} onPress={() => selectIngredient(ingredient)} style={{ width: 148, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: ingredient.id === selectedIngredientId ? colors.primary : colors.line, overflow: "hidden" }}>
                  <Image source={{ uri: normalizeRemoteImageUrl(ingredient.imageUrl || defaultImageUrl) }} style={{ width: "100%", height: 82, backgroundColor: colors.surface }} />
                  <View style={{ padding: 11, gap: 5 }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>
                      {ingredient.name}
                    </Text>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }} selectable>
                      {ingredient.caloriesPerUnit} kcal / {ingredient.unit}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }} selectable>
                      Đạm {ingredient.proteinPerUnit}g · Bột {ingredient.carbPerUnit}g · Béo {ingredient.fatPerUnit}g
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
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
