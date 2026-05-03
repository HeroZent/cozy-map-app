// tests/unit/screenToMapCoords.test.tsx
// Smoke test for the screen->map coord helper. Confirms that:
//   1) Calling screenToMapCoords() with no registered lookup returns null.
//   2) After a component registers a lookup via useRegisterScreenLookup,
//      screenToMapCoords() routes through it and returns the lookup's
//      result.
//   3) Unmounting the component cleans up the registration so subsequent
//      calls return null again.

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  screenToMapCoords,
  useRegisterScreenLookup,
  type ScreenLookup,
} from '@/map/screenToMapCoords';

function Registrar({ lookup }: { lookup: ScreenLookup }) {
  useRegisterScreenLookup(lookup);
  return null;
}

describe('screenToMapCoords', () => {
  it('returns null when no map has registered a lookup', async () => {
    const result = await screenToMapCoords({ x: 100, y: 200 });
    expect(result).toBeNull();
  });

  it('routes through the registered lookup and returns its result', async () => {
    const fake: ScreenLookup = jest.fn(async ({ x, y }) => ({
      lat: x / 10,
      lng: y / 10,
    }));
    const { unmount } = render(<Registrar lookup={fake} />);

    const result = await screenToMapCoords({ x: 50, y: 75 });
    expect(fake).toHaveBeenCalledWith({ x: 50, y: 75 });
    expect(result).toEqual({ lat: 5, lng: 7.5 });

    unmount();
    // After unmount, the registration is cleaned up.
    expect(await screenToMapCoords({ x: 1, y: 1 })).toBeNull();
  });
});
