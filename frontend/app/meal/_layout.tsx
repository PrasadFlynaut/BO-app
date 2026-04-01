import { Stack } from 'expo-router';
import { Colors } from '@/src/theme';

export default function MealLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bgBase } }} />;
}
