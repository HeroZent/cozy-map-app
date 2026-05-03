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
jest.mock('@/compose/DraftConfirmChip', () => ({
  DraftConfirmChip: ({ onWrite, onCancel }: { onWrite: () => void; onCancel: () => void }) => {
    const { View, Text, Pressable } = require('react-native');
    const React = require('react');
    return React.createElement(
      View,
      { testID: 'draft-chip' },
      React.createElement(Pressable, { onPress: onWrite, testID: 'chip-write' }, React.createElement(Text, null, 'Write')),
      React.createElement(Pressable, { onPress: onCancel, testID: 'chip-cancel' }, React.createElement(Text, null, '✕')),
    );
  },
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

  it('tapping + drops a pin at viewport center when GPS is denied', async () => {
    const { getByText, queryByTestId, findByTestId } = render(<IndexScreen />);

    // Trigger the FAB. The "+" character on the FAB:
    fireEvent.press(getByText('＋'));

    // Pin renders (placing phase)
    expect(await findByTestId('draft-pin')).toBeTruthy();
    // ComposeSheet does NOT open
    expect(queryByTestId('compose-sheet')).toBeNull();
  });

  it('tapping + uses GPS coords when permission is granted', async () => {
    const Location = require('expo-location');
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValueOnce({ coords: { latitude: 7.7, longitude: 125.5 } });

    const { getByText, findByTestId } = render(<IndexScreen />);
    fireEvent.press(getByText('＋'));

    const pin = await findByTestId('draft-pin');
    expect(pin.props.accessibilityLabel).toBe('pin-7.7-125.5');
  });

  it('chip Write button transitions placing → composing (sheet opens)', async () => {
    const { queryByTestId } = render(<IndexScreen />);
    await act(async () => { await Promise.resolve(); });
    await waitFor(() => expect(onDoubleClickRef.current).toBeTruthy());

    act(() => {
      onDoubleClickRef.current!({ lat: 14.5, lng: 121.0 });
    });

    // We're in placing — chip visible, sheet not yet
    expect(queryByTestId('draft-chip')).toBeTruthy();
    expect(queryByTestId('compose-sheet')).toBeNull();

    fireEvent.press(queryByTestId('chip-write')!);

    expect(queryByTestId('compose-sheet')).toBeTruthy();
    // Chip should disappear in composing phase per spec
    expect(queryByTestId('draft-chip')).toBeNull();
  });

  it('chip ✕ button transitions placing → idle (pin and chip gone)', async () => {
    const { queryByTestId } = render(<IndexScreen />);
    await act(async () => { await Promise.resolve(); });
    await waitFor(() => expect(onDoubleClickRef.current).toBeTruthy());

    act(() => {
      onDoubleClickRef.current!({ lat: 14.5, lng: 121.0 });
    });

    expect(queryByTestId('draft-pin')).toBeTruthy();
    expect(queryByTestId('draft-chip')).toBeTruthy();

    fireEvent.press(queryByTestId('chip-cancel')!);

    expect(queryByTestId('draft-pin')).toBeNull();
    expect(queryByTestId('draft-chip')).toBeNull();
  });
});
