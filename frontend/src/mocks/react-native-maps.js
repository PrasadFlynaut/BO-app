// Web stub — react-native-maps is native-only. On web, restaurant-map.web.tsx
// is used instead (via Expo Router platform resolution), but Metro still
// processes restaurant-map.tsx at bundle time, so this stub prevents the crash.
import React from 'react';
import { View } from 'react-native';

const Noop = () => null;

const MapView = React.forwardRef((props, ref) => React.createElement(View, { ref, ...props }));
MapView.displayName = 'MapView';

export default MapView;
export const Marker = Noop;
export const Callout = Noop;
export const Polygon = Noop;
export const Polyline = Noop;
export const Circle = Noop;
export const Overlay = Noop;
export const Heatmap = Noop;
export const PROVIDER_GOOGLE = null;
export const PROVIDER_DEFAULT = null;
export const MAP_TYPES = {};
