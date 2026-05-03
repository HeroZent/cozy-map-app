import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BackgroundMusicProvider } from '../BackgroundMusicProvider';
import { useBackgroundMusic } from '../useBackgroundMusic';

function Probe() {
  const api = useBackgroundMusic();
  return <Text testID="probe">{api.isAudioAvailable ? 'yes' : 'no'}</Text>;
}

describe('BackgroundMusicProvider — empty manifest', () => {
  test('exposes isAudioAvailable=false when manifest is empty', () => {
    render(
      <BackgroundMusicProvider tracksOverride={[]}>
        <Probe />
      </BackgroundMusicProvider>
    );
    expect(screen.getByTestId('probe').props.children).toBe('no');
  });

  test('useBackgroundMusic throws when used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useBackgroundMusic must be used inside/);
    spy.mockRestore();
  });
});
