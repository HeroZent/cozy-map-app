import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { PinMarker } from '@/map/PinMarker';

test('PinMarker renders the mood emoji', () => {
  const { getByText } = render(
    <ThemeProvider>
      <PinMarker mood="hopeful" isMemory={false} />
    </ThemeProvider>,
  );
  expect(getByText('🌱')).toBeTruthy();
});

test('Memory pin renders decoration mark', () => {
  const { getByText } = render(
    <ThemeProvider>
      <PinMarker mood="memory" isMemory={true} />
    </ThemeProvider>,
  );
  expect(getByText('🕯️')).toBeTruthy();
  expect(getByText('✦')).toBeTruthy();
});
