import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock the map so we can fire its onDoubleClick callback synchronously.
const onDoubleClickRef: { current: ((loc: { lat: number; lng: number }) => void) | null } = { current: null };

// app/index.tsx wraps the map in React.lazy(() => import('@/map/LazyMapView')).
// jest-expo doesn't transform dynamic import() to require(), so we replace
// React.lazy with a synchronous loader for the duration of this test.
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    lazy: (factory: () => Promise<any>) => {
      const Component: any = (props: any) => {
        const { View } = require('react-native');
        const onDoubleClick = props?.onDoubleClick;
        onDoubleClickRef.current = onDoubleClick;
        return actual.createElement(View, null, props.children);
      };
      return Component;
    },
  };
});
jest.mock('@/map/StoryPins', () => ({ StoryPins: () => null }));
jest.mock('@/map/HeatmapLayer', () => ({ HeatmapLayer: () => null }));
jest.mock('@/compose/DraftPinMarker', () => ({
  DraftPinMarker: ({ longitude, latitude }: { longitude: number; latitude: number }) =>
    require('react').createElement(
      require('react-native').View,
      { testID: 'draft-pin', accessibilityLabel: `pin-${latitude}-${longitude}` },
    ),
}));
jest.mock('@/compose/ComposeSheet', () => ({
  ComposeSheet: () => require('react').createElement(require('react-native').View, { testID: 'compose-sheet' }),
}));
jest.mock('@/data/useStories', () => ({ useStories: () => ({ stories: [], loading: false, error: null }) }));
jest.mock('@/data/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    memoryCount: 0,
    activityCount: 0,
    activityNotificationIds: [],
    markRead: jest.fn(),
    loading: false,
  }),
}));
jest.mock('@/data/useUser', () => ({ useUser: () => ({ user: { id: 'u1' }, loading: false, error: null }) }));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}), { virtual: true });
jest.mock('expo-router', () => ({
  useFocusEffect: () => {},
}));

import IndexScreen from '../../app/index';

describe('draft pin compose flow', () => {
  beforeEach(() => { onDoubleClickRef.current = null; });

  it('double-tapping the map drops a pin (placing phase) but does not open ComposeSheet', async () => {
    const { queryByTestId } = render(<IndexScreen />);
    // Flush React.lazy dynamic import + Suspense
    await act(async () => { await Promise.resolve(); });
    await waitFor(() => expect(onDoubleClickRef.current).toBeTruthy());

    act(() => {
      onDoubleClickRef.current!({ lat: 14.5, lng: 121.0 });
    });

    // Pin appears
    expect(queryByTestId('draft-pin')).toBeTruthy();
    // ComposeSheet does NOT appear yet
    expect(queryByTestId('compose-sheet')).toBeNull();
  });
});
