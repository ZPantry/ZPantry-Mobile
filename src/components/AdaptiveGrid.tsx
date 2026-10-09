import { type ReactNode } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useSizeClass } from "@/hooks/useSizeClass";

export function getAdaptiveColumns(
  width: number,
  options?: { minItemWidth?: number; maxColumns?: number }
): number {
  const minItemWidth = options?.minItemWidth ?? 280;
  const maxColumns = options?.maxColumns ?? 4;
  const calculated = Math.floor(width / minItemWidth);
  return Math.max(1, Math.min(maxColumns, calculated));
}

export interface AdaptiveGridProps<T> {
  data: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  minItemWidth?: number;
  gap?: number;
  columns?: number;
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
}

export function AdaptiveGrid<T>({
  data,
  renderItem,
  keyExtractor,
  minItemWidth = 280,
  gap = 12,
  columns: manualColumns,
  style,
  itemStyle
}: AdaptiveGridProps<T>) {
  const { width } = useSizeClass();
  const columns = manualColumns ?? getAdaptiveColumns(width, { minItemWidth });

  return (
    <View style={[styles.grid, { gap }, style]}>
      {data.map((item, index) => {
        const key = keyExtractor ? keyExtractor(item, index) : String(index);
        // Column width percent calculation taking gap into account
        const itemWidthPercent = `${(100 / columns) - 0.01}%` as const;
        return (
          <View
            key={key}
            style={[
              styles.item,
              columns > 1 ? { flexBasis: itemWidthPercent, maxWidth: itemWidthPercent } : { width: "100%" },
              itemStyle
            ]}
          >
            {renderItem(item, index)}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  item: {
    flexGrow: 1,
    flexShrink: 0,
  }
});

export default AdaptiveGrid;
