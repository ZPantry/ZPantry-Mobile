import { useState, type ReactNode } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

export function getAdaptiveColumns(
  width: number,
  options?: { minItemWidth?: number; maxColumns?: number; gap?: number }
): number {
  const minItemWidth = options?.minItemWidth ?? 280;
  const maxColumns = options?.maxColumns ?? 4;
  const calculated = Math.floor((width + (options?.gap ?? 0)) / (minItemWidth + (options?.gap ?? 0)));
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
  const [width, setWidth] = useState(0);
  // Measure the container, which can be narrower than the window (gutters/cards).
  const columns = Math.max(1, Math.min(
    manualColumns ?? 4,
    getAdaptiveColumns(width, { minItemWidth, gap, maxColumns: manualColumns ?? 4 })
  ));
  const itemWidth = Math.max(0, (width - gap * (columns - 1)) / columns);

  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[styles.grid, { gap }, style]}>
      {data.map((item, index) => {
        const key = keyExtractor ? keyExtractor(item, index) : String(index);
        return (
          <View
            key={key}
            style={[
              styles.item,
              { width: width ? itemWidth : "100%" },
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
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
  }
});

export default AdaptiveGrid;
