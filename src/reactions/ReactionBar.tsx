import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { REACTIONS } from './catalog';
import { useReact } from './useReact';
import { ReactionChip } from './ReactionChip';
import type { Story, ReactionEmoji } from '@/data/types';

export interface ReactionBarProps {
  story: Story;
  onReacted?: () => void;
}

export function ReactionBar({ story, onReacted }: ReactionBarProps) {
  const theme = useTheme();
  const react = useReact();

  const [localCounts, setLocalCounts] = useState<Partial<Record<ReactionEmoji, number>>>(story.reaction_counts);
  const [localMine, setLocalMine] = useState<ReactionEmoji[]>(story.my_reactions);

  // Re-sync when parent refreshes story data after onReacted
  useEffect(() => {
    setLocalCounts(story.reaction_counts);
    setLocalMine(story.my_reactions);
  }, [story.reaction_counts, story.my_reactions]);

  const handleReact = async (emoji: ReactionEmoji) => {
    const hadIt = localMine.includes(emoji);
    // Optimistic update
    if (hadIt) {
      setLocalMine((prev) => prev.filter((e) => e !== emoji));
      setLocalCounts((prev) => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] ?? 0) - 1) }));
    } else {
      setLocalMine((prev) => [...prev, emoji]);
      setLocalCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
    }
    try {
      await react(story.id, emoji);
      onReacted?.();
    } catch {
      // Revert on error
      if (hadIt) {
        setLocalMine((prev) => [...prev, emoji]);
        setLocalCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
      } else {
        setLocalMine((prev) => prev.filter((e) => e !== emoji));
        setLocalCounts((prev) => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] ?? 0) - 1) }));
      }
    }
  };

  return (
    <View style={styles.wrap}>
      {REACTIONS.map((r) => (
        <ReactionChip
          key={r.emoji}
          icon={r.icon}
          count={localCounts[r.emoji] ?? 0}
          active={localMine.includes(r.emoji)}
          activeBg={theme.accent}
          inactiveBg="rgba(245,230,200,0.08)"
          activeFg="#2a1f0a"
          inactiveFg={theme.textMuted}
          onPress={() => handleReact(r.emoji)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
});
