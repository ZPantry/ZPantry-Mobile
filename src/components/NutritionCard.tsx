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
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ color: colors.text, fontWeight: "800" }} selectable>
          {metric.label}
        </Text>
        <Text style={{ color: colors.muted, fontWeight: "700", fontVariant: ["tabular-nums"] }} selectable>
          {metric.value} / {metric.target} {metric.unit}
        </Text>
      </View>
      <View style={{ height: 9, borderRadius: 999, backgroundColor: "#F0D8AF", overflow: "hidden" }}>
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
        borderRadius: 28,
        borderCurve: "continuous",
        padding: 20,
        gap: 16,
        boxShadow: "0 10px 26px rgba(29, 36, 40, 0.10)"
      }}
    >
      <Text style={{ color: colors.dark, fontSize: 19, fontWeight: "900" }} selectable>
        Tóm tắt hôm nay
      </Text>
      {metrics.map((metric) => (
        <ProgressRow key={metric.label} metric={metric} />
      ))}
    </View>
  );
}
