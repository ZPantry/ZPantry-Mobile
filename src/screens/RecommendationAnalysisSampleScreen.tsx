import Text from "@/components/AppText";
import { colors } from "@/constants/colors";
import type { RootStackParamList } from "@/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "RecommendationAnalysisSample">;

export default function RecommendationAnalysisSampleScreen({ route, navigation }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const recommendations = route.params.recommendations;
  const first = recommendations[0];
  const summary = useMemo(() => {
    if (!first) return "Chưa có món để phân tích.";
    const parts = [`${first.name} đang đứng đầu danh sách.`];
    if (first.matchedIngredients.length) parts.push(`Bạn đã có ${first.matchedIngredients.join(", ")}.`);
    if (first.expiringSoonIngredients.length) parts.push(`Nên ưu tiên dùng sớm: ${first.expiringSoonIngredients.join(", ")}.`);
    if (first.missingIngredients.length) parts.push(`Cần bổ sung: ${first.missingIngredients.join(", ")}.`);
    return parts.join(" ");
  }, [first]);
  const analyze = () => {
    if (!first) return;
    setAnswer(question.trim() ? `${summary} Câu hỏi của bạn đã được ghi nhận cho chức năng AI phân tích trong phiên bản sau.` : summary);
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["left", "right", "bottom"]}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 720, width: "100%", alignSelf: "center" }}>
      <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>Phân tích lựa chọn món</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>Bản mẫu này chỉ phân tích top món do hệ thống xếp hạng. Khi API AI phân tích được bổ sung, màn hình sẽ gửi đúng danh sách này thay vì tạo món mới.</Text>
      </View>
      {recommendations.map((item, index) => <View key={item.mealId} style={{ backgroundColor: colors.white, borderRadius: 12, padding: 14, gap: 6 }}>
        <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "700" }}>#{index + 1}</Text>
        <Text style={{ color: colors.textDark, fontSize: 17, fontWeight: "700" }}>{item.name}</Text>
        <Text style={{ color: colors.mutedDark, fontSize: 12 }}>{item.reason || item.description}</Text>
      </View>)}
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>Bạn muốn phân tích điều gì?</Text>
        <TextInput accessibilityLabel="Câu hỏi phân tích món ăn" value={question} onChangeText={setQuestion} placeholder="Ví dụ: Món nào nên nấu trước?" placeholderTextColor={colors.muted} multiline style={{ minHeight: 92, padding: 12, borderRadius: 12, backgroundColor: colors.white, color: colors.text, borderWidth: 1, borderColor: colors.line, textAlignVertical: "top" }} />
        <Pressable accessibilityRole="button" onPress={analyze} style={{ minHeight: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: colors.primary }}>
          <Text style={{ color: colors.white, fontWeight: "700" }}>Xem phân tích mẫu</Text>
        </Pressable>
      </View>
      {answer ? <View style={{ borderRadius: 12, padding: 14, backgroundColor: colors.secondary }}><Text style={{ color: colors.textDark, fontSize: 14, lineHeight: 22 }}>{answer}</Text></View> : null}
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}><Text style={{ color: colors.primaryDark, fontWeight: "700" }}>Quay lại danh sách món</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
