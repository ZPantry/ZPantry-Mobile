import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CompleteTodayMenuItemResponse, TodayMenuItemDetail } from "@/api/todayMenu";
import { todayMenuApi } from "@/api/todayMenu";
import AppBackButton from "@/components/AppBackButton";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import type { RootStackParamList } from "@/types";
import { pickUploadImage, type PickedUploadImage } from "@/utils/pickUploadImage";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";
import { getFriendlyErrorMessage, translatePantryWarning, translateStatus } from "@/utils/localize";

type Props = NativeStackScreenProps<RootStackParamList, "TodayMenuItemDetail">;

function statusLabel(status: string) {
  return translateStatus(status);
}

function splitInstructions(text?: string | null) {
  return (text || "")
    .split(/\d+\.\s*/)
    .map((step) => step.trim())
    .filter(Boolean);
}

export default function TodayMenuItemDetailScreen({ route, navigation }: Props) {
  const toast = useToast();
  const [item, setItem] = useState<TodayMenuItemDetail | null>(null);
  const [completedResult, setCompletedResult] = useState<CompleteTodayMenuItemResponse | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedUploadImage | null>(null);
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const detail = await todayMenuApi.get(route.params.itemId);
      setItem(detail);
      setNote(detail.note || "");
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tải được chi tiết món trong thực đơn."));
      setItem(null);
    } finally {
      setIsLoading(false);
    }
  }, [route.params.itemId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const steps = useMemo(() => splitInstructions(item?.recipe?.instructionText), [item?.recipe?.instructionText]);
  const isCooked = item ? ["cooked", "completed"].includes(item.status.toLowerCase()) : false;
  const heroImage = pickedImage?.uri || item?.imageUrl || item?.recipe?.imageUrl || FALLBACK_FOOD_IMAGE_URL;

  const chooseImage = useCallback(async () => {
    try {
      const image = await pickUploadImage("cooked-meal");
      if (image) {
        setPickedImage(image);
      }
    } catch (error) {
      toast.show(getFriendlyErrorMessage(error, "Chưa chọn được ảnh món ăn.", "imageUpload"), "danger");
    }
  }, [toast]);

  const completeMeal = useCallback(async () => {
    if (!item || isCooked) return;

    if (!pickedImage) {
      toast.show("Vui lòng chọn ảnh thành phẩm trước khi hoàn thành món.", "info");
      return;
    }

    setIsCompleting(true);
    try {
      const result = await todayMenuApi.complete(item.id, {
        imageFile: pickedImage?.file || null,
        cookedAt: new Date().toISOString(),
        rating,
        note
      });
      setCompletedResult(result);
      toast.show("Đã hoàn thành món và lưu nhật ký nấu ăn.");
      await loadDetail();
    } catch (error) {
      toast.show(getFriendlyErrorMessage(error, "Chưa hoàn thành được món.", pickedImage?.file ? "imageUpload" : "default"), "danger");
    } finally {
      setIsCompleting(false);
    }
  }, [isCooked, item, loadDetail, note, pickedImage?.file, rating, toast]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadDetail} tintColor={colors.primary} />}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 34 }}
      >
        <View>
          <Image source={{ uri: normalizeRemoteImageUrl(heroImage) }} style={{ width: "100%", height: 268, backgroundColor: colors.secondary }} />
          <AppBackButton
            variant="floating"
            onPress={() => navigation.goBack()}
            style={{
              position: "absolute",
              top: 18,
              left: 18
            }}
          />
        </View>

        <View style={{ padding: 22, gap: 18 }}>
          {errorMessage ? (
            <Text style={{ color: "#FFE6E6", fontWeight: "800", textAlign: "center" }} selectable>
              {errorMessage}
            </Text>
          ) : null}

          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 30, lineHeight: 37, fontWeight: "900" }} selectable>
              {item?.mealName || "Chi tiết thực đơn"}
            </Text>
            {item ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Pill icon="calendar-outline" text={item.plannedDate} />
                <Pill icon="people-outline" text={`${item.servingSize || 1} phần`} />
                <Pill icon="checkmark-circle-outline" text={statusLabel(item.status)} />
              </View>
            ) : null}
          </View>

          {item ? (
            <>
              <Section title="Nguyên liệu cần dùng">
                {item.requiredIngredients?.length ? (
                  item.requiredIngredients.map((ingredient) => (
                    <InfoRow key={`${ingredient.ingredientId}-required`} icon="nutrition-outline" color={colors.primary} text={`${ingredient.ingredientName}: ${ingredient.quantity} ${ingredient.unit}`} />
                  ))
                ) : (
                  <InfoRow icon="information-circle-outline" color={colors.primary} text="Chưa có dữ liệu nguyên liệu cần dùng." />
                )}
              </Section>

              <Section title="Nguyên liệu trong tủ">
                {item.pantryItems?.length ? (
                  item.pantryItems.map((pantryItem) => (
                    <InfoRow key={pantryItem.id} icon="cube-outline" color={colors.success} text={`${pantryItem.ingredientName}: ${pantryItem.quantity} ${pantryItem.unit}`} />
                  ))
                ) : (
                  <InfoRow icon="alert-circle-outline" color={colors.warning} text="Chưa thấy nguyên liệu khớp trong pantry." />
                )}
              </Section>

              {steps.length ? (
                <Section title="Cách nấu">
                  {steps.map((step, index) => (
                    <View key={`${index}-${step}`} style={{ flexDirection: "row", gap: 12 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: colors.white, fontWeight: "900" }} selectable>
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, color: colors.text, fontWeight: "700", lineHeight: 22 }} selectable>
                        {step}
                      </Text>
                    </View>
                  ))}
                </Section>
              ) : null}

              <Section title={isCooked ? "Nhật ký đã lưu" : "Hoàn thành món"}>
                <PrimaryButton title={pickedImage ? "Đổi ảnh thành phẩm" : "Chọn ảnh thành phẩm"} icon="image-plus" variant="soft" onPress={chooseImage} />
                {pickedImage ? <Image source={{ uri: pickedImage.uri }} style={{ width: "100%", height: 160, borderRadius: 12, backgroundColor: colors.surface }} /> : null}

                <View style={{ gap: 10 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }} selectable>
                    Đánh giá
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => setRating(value)}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: value <= rating ? colors.primary : colors.card,
                          borderWidth: 1,
                          borderColor: value <= rating ? colors.primary : colors.line
                        }}
                      >
                        <Ionicons name="star" size={20} color={value <= rating ? colors.white : colors.muted} />
                      </Pressable>
                    ))}
                  </View>
                </View>

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Ghi chú sau khi nấu"
                  placeholderTextColor={colors.muted}
                  multiline
                  style={{
                    minHeight: 92,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.line,
                    color: colors.text,
                    padding: 14,
                    textAlignVertical: "top",
                    fontWeight: "700",
                    backgroundColor: "rgba(255,255,255,0.08)"
                  }}
                />

                {isCooked ? (
                  <InfoRow icon="checkmark-circle" color={colors.success} text="Món này đã hoàn thành. Pantry đã được xử lý ở lần xác nhận hoàn thành." />
                ) : (
                  <PrimaryButton title={isCompleting ? "Đang lưu..." : "Hoàn thành và ghi log"} icon="check-circle" onPress={completeMeal} />
                )}
              </Section>

              {completedResult?.warnings.length ? (
                <Section title="Cảnh báo pantry">
                  {completedResult.warnings.map((warning) => (
                    <InfoRow key={warning} icon="warning-outline" color={colors.warning} text={translatePantryWarning(warning)} />
                  ))}
                </Section>
              ) : null}

              {completedResult?.consumedIngredients.length ? (
                <Section title="Nguyên liệu đã trừ">
                  {completedResult.consumedIngredients.map((log) => (
                    <InfoRow key={log.id} icon="remove-circle-outline" color={colors.success} text={`${log.ingredientName}: ${log.quantityUsed} ${log.unit}${log.warning ? ` - ${translatePantryWarning(log.warning)}` : ""}`} />
                  ))}
                </Section>
              ) : null}
            </>
          ) : (
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 28 }}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={38} color={colors.primary} />
              <Text style={{ color: colors.muted, fontWeight: "800", textAlign: "center" }} selectable>
                Kéo xuống để thử tải lại chi tiết món.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
        {text}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, borderCurve: "continuous", padding: 18, gap: 14, borderWidth: 1, borderColor: colors.line }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({ icon, color, text }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={{ color: colors.text, fontWeight: "800", flex: 1, lineHeight: 21 }} selectable>
        {text}
      </Text>
    </View>
  );
}
