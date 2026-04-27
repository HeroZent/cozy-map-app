// src/notifications/MemoryBanner.tsx
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Notification } from '@/data/useNotifications';

export interface MemoryBannerProps {
  notifications: Notification[];
  memoryCount: number;
  markRead: (ids: string[]) => Promise<void>;
  bottomOffset?: number;
}

export function MemoryBanner({
  notifications,
  memoryCount,
  markRead,
  bottomOffset = 0,
}: MemoryBannerProps) {
  const theme = useTheme();

  if (memoryCount === 0) return null;

  const memoryIds = notifications
    .filter((n) => n.type === 'memory_promoted')
    .map((n) => n.id);

  const label =
    memoryCount === 1
      ? '✦ One of your sulat became a memory'
      : `✦ ${memoryCount} of your sulat became memories`;

  return (
    <Pressable
      onPress={() => markRead(memoryIds)}
      style={[
        styles.banner,
        { backgroundColor: theme.surface, bottom: bottomOffset },
      ]}
    >
      <Text style={[styles.text, { color: theme.pinMemory.body }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderTopColor: 'rgba(244,201,122,0.08)',
    borderTopWidth: 1,
    justifyContent: 'center',
    left: 0,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
  },
  text: {
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
});
