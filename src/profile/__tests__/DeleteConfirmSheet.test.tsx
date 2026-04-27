// src/profile/__tests__/DeleteConfirmSheet.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DeleteConfirmSheet } from '../DeleteConfirmSheet';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    textPrimary: '#fff',
    textMuted: '#888',
    accent: '#f4c97a',
    pinMemory: { body: '#d4a96a', glow: '#d4a96a', decoration: '✦' },
    id: 'lantern',
    name: 'Lantern Glow',
    description: '',
    mapStyle: '',
    background: '#0a0e22',
    fontFamily: 'serif',
    pin: { glow: '#f4c97a', body: '#f4c97a', pulseDuration: 2000 },
    heatmap: [],
    reactionTint: '#f4c97a',
  }),
}));

describe('DeleteConfirmSheet', () => {
  it('renders nothing when visible is false', () => {
    const { queryByText } = render(
      <DeleteConfirmSheet
        visible={false}
        deleting={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(queryByText('Delete sulat')).toBeNull();
  });

  it('renders title and warning copy when visible is true', () => {
    const { getByText } = render(
      <DeleteConfirmSheet
        visible={true}
        deleting={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByText('Delete sulat')).toBeTruthy();
    expect(getByText("This sulat can't be recovered after deletion.")).toBeTruthy();
  });

  it('renders Cancel and Delete buttons when visible', () => {
    const { getByText } = render(
      <DeleteConfirmSheet
        visible={true}
        deleting={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
  });

  it('calls onCancel when Cancel is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <DeleteConfirmSheet
        visible={true}
        deleting={false}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Delete is pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <DeleteConfirmSheet
        visible={true}
        deleting={false}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows "Deleting…" and disables both buttons when deleting is true', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const { getByText, queryByText } = render(
      <DeleteConfirmSheet
        visible={true}
        deleting={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(getByText('Deleting…')).toBeTruthy();
    expect(queryByText('Delete')).toBeNull();
    // Buttons disabled — pressing them does nothing
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.press(getByText('Deleting…'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
