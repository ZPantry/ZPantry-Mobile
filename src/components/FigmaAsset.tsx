import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

export type DesignAsset = { source: number; width: number; height: number; node: string };

// Each export keeps the Figma layer's geometry; larger artwork may be scaled
// proportionally by its caller. Never tint or redraw original brand icons.
export default function FigmaAsset({ asset, style, label, fit = 'contain' }: {
  asset: DesignAsset; style?: StyleProp<ImageStyle>; label?: string; fit?: 'contain' | 'cover';
}) {
  return <Image source={asset.source} contentFit={fit} accessibilityLabel={label}
    testID={`figma-${asset.node}`} style={[{ width: asset.width, height: asset.height }, style]} />;
}
