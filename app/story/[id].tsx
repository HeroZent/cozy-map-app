import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/data/supabase';
import { StoryView } from '@/story/StoryView';
import { useTheme } from '@/theme/ThemeContext';
import type { Story } from '@/data/types';

export default function StoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error: e } = await supabase
        .from('stories')
        .select('id, author_id, mood, body, location_label, pin_mode, language, status, is_memory, created_at, location:location::json')
        .eq('id', id)
        .single();
      if (e) {
        setError(e.message);
        return;
      }
      setStory(data as Story);
    })();
  }, [id]);

  if (error) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.textPrimary }}>{error}</Text>
    </View>
  );
  if (!story) return <View style={[styles.fill, { backgroundColor: theme.background }]} />;
  return <StoryView story={story} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  fill: { flex: 1 },
});
