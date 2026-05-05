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

test('renders the ★ glyph when isStarred=true', () => {
  const { getByText } = render(
    <ThemeProvider>
      <PinMarker mood="hopeful" isMemory={false} isStarred />
    </ThemeProvider>,
  );
  expect(getByText('★')).toBeTruthy();
});

test('does not render the ★ glyph when isStarred is false or omitted', () => {
  const { queryByText } = render(
    <ThemeProvider>
      <PinMarker mood="hopeful" isMemory={false} />
    </ThemeProvider>,
  );
  expect(queryByText('★')).toBeNull();
});
