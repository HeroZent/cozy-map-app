import { Marker } from 'react-map-gl/maplibre';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PinMarker } from './PinMarker';
import type { Story } from '@/data/types';

export interface StoryPinsProps {
  stories: Story[];
}

export function StoryPins({ stories }: StoryPinsProps) {
  const router = useRouter();
  return (
    <>
      {stories.map((s) => {
        const [lng, lat] = s.location.coordinates;
        return (
          <Marker key={s.id} longitude={lng} latitude={lat} anchor="center">
            <Pressable onPress={() => router.push(`/story/${s.id}`)}>
              <PinMarker mood={s.mood} isMemory={s.is_memory} />
            </Pressable>
          </Marker>
        );
      })}
    </>
  );
}
