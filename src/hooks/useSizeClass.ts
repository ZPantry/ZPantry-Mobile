import { useWindowDimensions } from "react-native";

export type WindowWidthSizeClass = "compact" | "medium" | "expanded";
export type WindowHeightSizeClass = "compact" | "medium" | "expanded";

export interface WindowSizeInfo {
  width: number;
  height: number;
  fontScale: number;
  scale: number;
  widthSizeClass: WindowWidthSizeClass;
  heightSizeClass: WindowHeightSizeClass;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  isLandscape: boolean;
  isSmallDevice: boolean; // width < 360dp (~320dp small devices)
  suggestedColumns: number;
  readableMaxWidth: number;
  formMaxWidth: number;
}

/**
 * Android Material 3 Window Size Classes:
 * - Compact: width < 600dp (standard portrait phones, narrow foldables)
 * - Medium: 600dp <= width < 840dp (small tablets, unfolded foldables in portrait, large split-screen)
 * - Expanded: width >= 840dp (large tablets, unfolded foldables in landscape, desktop)
 */
export function useSizeClass(): WindowSizeInfo {
  const { width, height, fontScale, scale } = useWindowDimensions();

  const widthSizeClass: WindowWidthSizeClass =
    width < 600 ? "compact" : width < 840 ? "medium" : "expanded";

  const heightSizeClass: WindowHeightSizeClass =
    height < 480 ? "compact" : height < 900 ? "medium" : "expanded";

  const isCompact = widthSizeClass === "compact";
  const isMedium = widthSizeClass === "medium";
  const isExpanded = widthSizeClass === "expanded";
  const isLandscape = width > height;
  const isSmallDevice = width < 360;

  const suggestedColumns = isExpanded ? 3 : isMedium ? 2 : 1;
  const readableMaxWidth = isCompact ? 600 : isMedium ? 720 : 960;
  const formMaxWidth = 600;

  return {
    width,
    height,
    fontScale,
    scale,
    widthSizeClass,
    heightSizeClass,
    isCompact,
    isMedium,
    isExpanded,
    isLandscape,
    isSmallDevice,
    suggestedColumns,
    readableMaxWidth,
    formMaxWidth
  };
}

export default useSizeClass;
