import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DraftConfirmChip } from '../DraftConfirmChip';

jest.mock('@/lib/reverseGeocode', () => ({
  reverseGeocode: jest.fn(),
}));

// On native, the chip wraps in a Marker — passthrough so we can render in jest.
jest.mock('@maplibre/maplibre-react-native', () => ({
  Marker: ({ children }: { children: React.ReactNode }) =>
    require('react').createElement(require('react-native').View, null, children),
}));

const { reverseGeocode } = jest.requireMock('@/lib/reverseGeocode') as {
  reverseGeocode: jest.Mock;
};

describe('DraftConfirmChip', () => {
  beforeEach(() => {
    reverseGeocode.mockReset();
  });

  it('renders Locating… while reverseGeocode is pending', () => {
    reverseGeocode.mockImplementation(() => new Promise(() => {})); // never resolves
    const { getByText } = render(
      <DraftConfirmChip
        coords={{ lat: 14.5, lng: 121.0 }}
        onWrite={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByText(/Locating/i)).toBeTruthy();
  });

  it('shows resolved label after reverseGeocode succeeds', async () => {
    // reverseGeocode returns { short, full } | null. The chip renders `short`.
    reverseGeocode.mockResolvedValueOnce({
      short: 'Malolos, Bulacan',
      full: 'Malolos, Bulacan, Central Luzon, Philippines',
    });
    const { findByText } = render(
      <DraftConfirmChip
        coords={{ lat: 14.5, lng: 121.0 }}
        onWrite={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(await findByText(/Malolos, Bulacan/)).toBeTruthy();
  });

  it('falls back to "Dropped pin" when reverseGeocode returns null', async () => {
    reverseGeocode.mockResolvedValueOnce(null);
    const { findByText } = render(
      <DraftConfirmChip
        coords={{ lat: 14.5, lng: 121.0 }}
        onWrite={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(await findByText(/Dropped pin/)).toBeTruthy();
  });

  it('falls back to "Dropped pin" on reverseGeocode error', async () => {
    reverseGeocode.mockRejectedValueOnce(new Error('boom'));
    const { findByText } = render(
      <DraftConfirmChip
        coords={{ lat: 14.5, lng: 121.0 }}
        onWrite={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(await findByText(/Dropped pin/)).toBeTruthy();
  });

  it('Write button calls onWrite', () => {
    reverseGeocode.mockResolvedValueOnce(null);
    const onWrite = jest.fn();
    const { getByText } = render(
      <DraftConfirmChip
        coords={{ lat: 14.5, lng: 121.0 }}
        onWrite={onWrite}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Write'));
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it('✕ button calls onCancel', () => {
    reverseGeocode.mockResolvedValueOnce(null);
    const onCancel = jest.fn();
    const { getByText } = render(
      <DraftConfirmChip
        coords={{ lat: 14.5, lng: 121.0 }}
        onWrite={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.press(getByText('✕'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
