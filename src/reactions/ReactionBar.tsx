import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { REACTIONS } from './catalog';
import { useReact } from './useReact';
import type { Story, ReactionEmoji } from '@/data/types';

export interface ReactionBarProps {
  story: Story;
  onReacted?: () => void;
}

export function ReactionBar({ story, onReacted }: ReactionBarProps) {
  const theme = useTheme();
  const react = useReact();

  const [localCount, setLocalCount] = useState(story.reaction_count);
  const [localMine, setLocalMine] = useState<ReactionEmoji[]>(story.my_reactions);

  // Compute per-emoji counts from story data (simplified: show total divided indicator)
  // Full per-emoji counts would require joining emoji-level aggregates — use total for now
  const totalPerEmoji = (emoji: ReactionEmoji) => {
    // We only have total reaction_count, not per-emoji breakdown.
    // Show count only on active chips (ones the user has reacted with).
    return localMine.includes(emoji) ? 1 : 0;
  };

  const handleReact = async (emoji: ReactionEmoji) => {
    const hadIt = localMine.includes(emoji);
    // Optimistic update
    if (hadIt) {
      setLocalMine((prev) => prev.filter((e) => e !== emoji));
      setLocalCount((prev) => prev - 1);
    } else {
      setLocalMine((prev) => [...prev, emoji]);
      setLocalCount((prev) => prev + 1);
    }
    try {
      await react(story.id, emoji);
      onReacted?.();
    } catch {
      // Revert on error
      if (hadIt) {
        setLocalMine((prev) => [...prev, emoji]);
        setLocalCount((prev) => prev + 1);
      } else {
        setLocalMine((prev) => prev.filter((e) => e !== emoji));
        setLocalCount((prev) => prev - 1);
      }
    }
  };

  return (
    <View style={styles.wrap}>
      {REACTIONS.map((r) => {
        const active = localMine.includes(r.emoji);
        return (
          <Pressable
            key={r.emoji}
            onPress={() => handleReact(r.emoji)}
            style={[
              styles.chip,
              { backgroundColor: active ? theme.accent : 'rgba(245,230,200,0.08)' },
            ]}
          >
            <Text style={styles.icon}>{r.icon}</Text>
            {active && (
              <Text style={[styles.count, { color: '#2a1f0a' }]}>·</Text>
            )}
          </Pressable>
        );
      })}
      {localCount > 0 && (
        <Text style={[styles.total, { color: theme.textMuted }]}>{localCount}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  count: { fontSize: 11, fontWeight: '600' },
  icon: { fontSize: 14 },
  total: { fontSize: 12, marginLeft: 4, alignSelf: 'center' },
  wrap: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
});
