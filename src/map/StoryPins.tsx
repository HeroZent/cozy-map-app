/* eslint-disable react/prop-types */
import { Marker, useMap } from 'react-map-gl/maplibre';
import { Pressable } from 'react-native';
import { PinMarker } from './PinMarker';
import { ClusterMarker } from './ClusterMarker';
import { useClusters } from './useClusters';
import type { Story } from '@/data/types';

export interface StoryPinsProps {
  stories: Story[];
  zoom: number;
  bbox: [number, number, number, number];
  onSelect: (story: Story) => void;
}

interface ClusterProps {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string | number;
}

interface PointProps {
  cluster?: false;
  story: Story;
}

type FeatureProps = ClusterProps | PointProps;

export function StoryPins({ stories, zoom, bbox, onSelect }: StoryPinsProps) {
  const { current: map } = useMap();
  const { clusters, supercluster } = useClusters(stories, zoom, bbox);

  return (
    <>
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates as [number, number];
        const props = c.properties as FeatureProps;
        if (props.cluster) {
          const id = c.id as number;
          return (
            <Marker key={`c-${id}`} longitude={lng} latitude={lat} anchor="center">
              <ClusterMarker
                count={props.point_count}
                onPress={() => {
                  const expansion = supercluster.getClusterExpansionZoom(id);
                  map?.flyTo({ center: [lng, lat], zoom: expansion });
                }}
              />
            </Marker>
          );
        }
        const story = props.story;
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
