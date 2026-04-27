// src/notifications/ActivityBanner.tsx
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface ActivityBannerProps {
  activityCount: number;
  replyCount: number;
  reactionCount: number;
  topOffset?: number;
}

export function ActivityBanner({
  activityCount,
  replyCount,
  reactionCount,
  topOffset = 100,
}: ActivityBannerProps) {
  const theme = useTheme();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (activityCount === 0) return;
    const timer = setTimeout(() => setDismissed(true), 4000);
    return () => clearTimeout(timer);
  }, [activityCount]);

  if (activityCount === 0 || dismissed) return null;

  const replyLabel = replyCount === 1 ? '1 new reply' : `${replyCount} new replies`;
  const reactionLabel = reactionCount === 1 ? '1 reaction' : `${reactionCount} reactions`;

  let label: string;
  if (replyCount > 0 && reactionCount > 0) {
    label = `💬 ${replyLabel} · ${reactionLabel}`;
  } else if (replyCount > 0) {
    label = `💬 ${replyLabel}`;
  } else {
    label = `💬 ${reactionLabel}`;
  }

  return (
    <View style={[styles.banner, { backgroundColor: theme.surface, top: topOffset }]}>
      <Text style={[styles.text, { color: theme.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderBottomColor: 'rgba(244,201,122,0.08)',
    borderBottomWidth: 1,
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
