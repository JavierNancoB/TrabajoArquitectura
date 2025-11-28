import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      tabBarStyle: {
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        borderTopColor: Colors[colorScheme ?? 'light'].tabIconDefault,
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Demostración trabajo Arquitectura de Software',
          tabBarIcon: ({ color }) => <IconSymbol name={"log-in" as any} size={50} color={color} />,
          tabBarButton: (props) => <HapticTab {...props} />,
        }}
      />
    </Tabs>
  );
}
