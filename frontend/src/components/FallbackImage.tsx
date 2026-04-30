import React, { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { boLogoColor } from '@/src/assets';

type Props = {
  uri?: string;
  style: any;
};

export default function FallbackImage({ uri, style }: Props) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[style, { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }]}>
        <Image source={boLogoColor} style={{ width: '50%', height: '50%', opacity: 0.18 }} contentFit="contain" />
      </View>
    );
  }
  return (
    <Image source={{ uri }} style={style} contentFit="cover" transition={200} onError={() => setFailed(true)} />
  );
}
