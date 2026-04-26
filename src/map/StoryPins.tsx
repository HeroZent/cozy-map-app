import { Marker } from 'react-map-gl/maplibre';
import { Pressable } from 'react-native';
import { PinMarker } from './PinMarker';
import type { Story } from '@/data/types';

export interface StoryPinsProps {
  stories: Story[];
  zoom: number;
  bbox: [number, number, number, number];
  onSelect: (story: Story) => void;
}

export function StoryPins({ stories, onSelect }: StoryPinsProps) {
  return (
    <>
      {stories.map((story) => {
        const [lng, lat] = story.location.coordinates as [number, number];
        return (
          <Marker key={story.id} longitude={lng} latitude={lat} anchor="center">
            <Pressable onPress={() => onSelect(story)}>
              <PinMarker mood={story.mood} isMemory={story.is_memory} reactionCount={story.reaction_count} />
            </Pressable>
          </Marker>
        );
      })}
    </>
  );
}
