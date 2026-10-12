import { useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { recommendationsApi } from "@/api/recommendations";
import Text from "@/components/AppText";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { getFriendlyErrorMessage } from "@/utils/localize";

export default function RecommendationFeedback({ recommendationId, recipeId }: { recommendationId?: string; recipeId: string }) {
  const [rating, setRating] = useState(0), [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState("");
  const lock = useRef(false);
  if (!recommendationId) return null;
  const save = async () => {
    if (lock.current || !rating) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await recommendationsApi.feedback(recommendationId, { mealRecommendationId: recommendationId, recipeId, rating, feedbackType: "RATING", comment: comment.trim() });
      setDone(true);
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa gửi được đánh giá. Nội dung vẫn được giữ lại.")); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ padding: 18, borderRadius: 16, gap: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
    <Text style={{ color: colors.dark, fontSize: 20, fontWeight: "700" }}>Gợi ý này có phù hợp?</Text>
    {done ? <Text accessibilityLiveRegion="polite" style={{ color: colors.success, lineHeight: 22 }}>Cảm ơn bạn! Đánh giá đã được lưu.</Text> : <>
      <View style={{ flexDirection: "row", gap: 8 }}>{[1, 2, 3, 4, 5].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Đánh giá ${value} sao`} accessibilityState={{ selected: rating === value }} disabled={busy} onPress={() => setRating(value)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Ionicons name={value <= rating ? "star" : "star-outline"} size={30} color={colors.primaryDark} /></Pressable>)}</View>
      <TextInput accessibilityLabel="Nhận xét gợi ý" value={comment} onChangeText={setComment} editable={!busy} multiline placeholder="Điều bạn thích hoặc muốn cải thiện…" placeholderTextColor={colors.muted} style={{ minHeight: 90, textAlignVertical: "top", backgroundColor: colors.input, borderRadius: 12, padding: 12, color: colors.text }} />
      {error ? <Text selectable accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
      <PrimaryButton title="Gửi đánh giá" loading={busy} disabled={!rating} onPress={save} />
    </>}
  </View>;
}
