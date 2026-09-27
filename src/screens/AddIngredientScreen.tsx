import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
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
import { authStorage } from "@/utils/authStorage";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";
import { getFriendlyErrorMessage } from "@/utils/localize";

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
  const { user } = useAuth();
  const [tutorialStep, setTutorialStep] = useState(0); // 0: inactive, 1: intro, 2: point to list, 3: point to form
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
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
      const ingredientPage = await ingredientsApi.list(1, 100);
      setIngredients(ingredientPage.data);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tải được danh sách nguyên liệu."));
      setIngredients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  useEffect(() => {
    if (user?.userId) {
      authStorage.getHasSeenAddIngredientTooltip(user.userId).then((hasSeen) => {
        if (!hasSeen) {
          setTutorialStep(1);
          Animated.parallel([
            Animated.timing(slideUpAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true })
          ]).start();
        }
      });
    }
  }, [user?.userId, slideUpAnim, opacityAnim]);

  const handleNextStep1 = () => {
    Animated.parallel([
      Animated.timing(slideUpAnim, { toValue: 50, duration: 300, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(() => {
      setTutorialStep(2);
    });
  };

  const handleCloseTutorial = async () => {
    if (user?.userId) {
      await authStorage.setHasSeenAddIngredientTooltip(user.userId);
    }
    setTutorialStep(0);
  };

  const availableIngredients = ingredients;
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

      if (user?.userId && tutorialStep > 0) {
        await authStorage.setHasSeenAddIngredientTooltip(user.userId);
      }

      toast.show(`Đã lưu ${selectedIngredient.name} vào tủ.`);
      navigation.goBack();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa lưu được nguyên liệu vào tủ."));
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
        {tutorialStep > 0 && (
          <View style={{ position: "absolute", top: 200, left: 100, width: 20, height: 20, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 10, transform: [{ scale: 400 }] }} pointerEvents="none" />
        )}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 11 }}>
          <View>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }} selectable>
              Thêm vào tủ
            </Text>
          </View>
          <PrimaryButton title="" icon="close" variant="soft" onPress={() => navigation.goBack()} style={{ width: 48, minHeight: 48, paddingHorizontal: 0 }} />
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14, zIndex: tutorialStep === 2 ? 20 : 1 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
            Chọn nguyên liệu
          </Text>
          <SearchBar placeholder="Tìm nguyên liệu chưa có trong tủ" value={searchText} onChangeText={setSearchText} />
          {filteredIngredients.length === 0 ? (
            <EmptyState icon="check-circle-outline" text={availableIngredients.length === 0 ? "Hệ thống chưa có nguyên liệu nào." : "Không có nguyên liệu phù hợp với từ khóa này."} />
          ) : (
            <View style={{ gap: 10 }}>
              {filteredIngredients.map((item, index) => {
                const isHighlighted = tutorialStep === 2 && index === 0;
                return (
                  <View key={item.id} style={{ zIndex: isHighlighted ? 30 : 1 }}>
                    <IngredientRow 
                      ingredient={item} 
                      selected={item.id === selectedIngredientId} 
                      onPress={() => {
                        selectIngredient(item);
                        if (tutorialStep === 2) setTutorialStep(3);
                      }} 
                    />
                    {isHighlighted && (
                      <View style={{ zIndex: 30, flexDirection: "row", alignItems: "flex-start", marginTop: 4 }}>
                        <MaterialCommunityIcons name="arrow-top-left-thick" size={40} color={colors.primary} style={{ marginLeft: 30, marginTop: -10 }} />
                        <View style={{ backgroundColor: colors.card, padding: 12, borderRadius: 12, flex: 1, marginLeft: 5, borderWidth: 2, borderColor: colors.primary }}>
                          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 14 }}>Bấm vào một nguyên liệu bất kỳ để chọn nhé!</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {tutorialStep === 3 && (
          <View style={{ zIndex: 30, alignItems: "center", marginBottom: -10, paddingHorizontal: 10 }}>
            <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.primary, width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
              <Text style={{ color: colors.text, fontWeight: "800", lineHeight: 22, fontSize: 14, marginBottom: 16 }}>
                Chỗ này là nơi bạn nhập các thông số. Sau khi nhập xong thì bấm vào nút Xác nhận lưu vào tủ để lưu nguyên liệu nha.
              </Text>
              <PrimaryButton title="Tôi đã hiểu" onPress={handleCloseTutorial} style={{ minHeight: 44 }} />
            </View>
            <MaterialCommunityIcons name="arrow-down-thick" size={40} color={colors.primary} style={{ marginTop: -5, marginBottom: -15 }} />
          </View>
        )}

        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderCurve: "continuous", borderWidth: 1, borderColor: tutorialStep === 3 ? colors.primary : colors.line, padding: 16, gap: 14, zIndex: tutorialStep === 3 ? 20 : 1, boxShadow: tutorialStep === 3 ? "0 0 0 4px rgba(244,162,28,0.3)" : "none" }}>
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

      {/* Tooltip Step 1 */}
      {tutorialStep === 1 && (
        <Animated.View style={{
          position: "absolute", bottom: 40, left: 20, right: 20,
          backgroundColor: colors.card, borderRadius: 16, padding: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)", zIndex: 101,
          borderWidth: 1, borderColor: colors.line,
          transform: [{ translateY: slideUpAnim }], opacity: opacityAnim
        }}>
          <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "900", marginBottom: 8 }}>Chi tiết nguyên liệu</Text>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 20, marginBottom: 20 }}>Tại đây bạn có thể tìm kiếm nguyên liệu và chọn nó để thêm vào tủ của bạn. Hãy điền số lượng và hạn sử dụng tương ứng nhé!</Text>
          <Pressable 
            onPress={handleNextStep1}
            style={({ pressed }) => ({
              backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10,
              alignItems: "center", opacity: pressed ? 0.8 : 1
            })}
          >
            <Text style={{ color: colors.white, fontSize: 15, fontWeight: "900" }}>Đã hiểu</Text>
          </Pressable>
        </Animated.View>
      )}
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
