import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { colors } from "@/constants/colors";
import type { NutritionMetric } from "@/types";
import { progressPercent } from "@/utils/helpers";

type Props = {
  metrics: NutritionMetric[];
};

function ProgressRow({ metric }: { metric: NutritionMetric }) {
  const progress = progressPercent(metric.value, metric.target);
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }} selectable>
          {metric.label}
        </Text>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12, fontVariant: ["tabular-nums"] }} selectable>
          {metric.value} / {metric.target} {metric.unit}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.26)", overflow: "hidden" }}>
        <View style={{ width: `${progress}%`, height: "100%", borderRadius: 999, backgroundColor: metric.color }} />
      </View>
    </View>
  );
}

export default function NutritionCard({ metrics }: Props) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.line,
        padding: 18,
        gap: 14,
        boxShadow: "0 12px 28px rgba(0,0,0,0.20)"
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }} selectable>
          TÓM TẮT HÔM NAY
        </Text>
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }} selectable>
          29/06/2026
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 18, alignItems: "center" }}>
        <View style={{ width: 82, height: 82, borderRadius: 41, borderWidth: 8, borderColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
            1,200
          </Text>
          <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "800" }} selectable>
            /2,000 KCAL
          </Text>
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          {metrics.slice(1).map((metric) => (
            <ProgressRow key={metric.label} metric={metric} />
          ))}
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.24)" }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <Ionicons name="water-outline" size={17} color="#38BDF8" />
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }} selectable>
          Lượng nước: 1.2L / 2L
        </Text>
      </View>
    </View>
  );
}
