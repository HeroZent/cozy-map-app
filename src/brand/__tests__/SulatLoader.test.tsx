/**
 * @jest-environment jsdom
 *
 * SulatLoader injects keyframes via <style> and embeds 30 stars + 11 lanterns —
 * jsdom is needed so document.head.appendChild + dangerouslySetInnerHTML work.
 */
import { render } from '@testing-library/react-native';
import { SulatLoader } from '../SulatLoader';

describe('SulatLoader', () => {
  test('mounts with the bottom-label text', () => {
    const { getByText } = render(<SulatLoader visible={true} />);
    expect(getByText('FINDING NEARBY LANTERNS…')).toBeTruthy();
  });

  test('mounts with the tagline text', () => {
    const { getByText } = render(<SulatLoader visible={true} />);
    expect(getByText('a place for letters in the dark')).toBeTruthy();
  });

  test('renders 30 stars', () => {
    const { getAllByTestId } = render(<SulatLoader visible={true} />);
    expect(getAllByTestId('sulat-loader-star')).toHaveLength(30);
  });

  test('renders 11 lanterns', () => {
    const { getAllByTestId } = render(<SulatLoader visible={true} />);
    expect(getAllByTestId('sulat-lantern')).toHaveLength(11);
  });

  test('star positions are deterministic across renders (same seed)', () => {
    const { getAllByTestId, unmount } = render(<SulatLoader visible={true} />);
    const firstRender = getAllByTestId('sulat-loader-star').map((s) => {
      const styles = Array.isArray(s.props.style) ? Object.assign({}, ...s.props.style.flat()) : s.props.style;
      return [styles.left, styles.top].join(',');
    });
    unmount();
    const { getAllByTestId: getAllByTestId2 } = render(<SulatLoader visible={true} />);
    const secondRender = getAllByTestId2('sulat-loader-star').map((s) => {
      const styles = Array.isArray(s.props.style) ? Object.assign({}, ...s.props.style.flat()) : s.props.style;
      return [styles.left, styles.top].join(',');
    });
    expect(firstRender).toEqual(secondRender);
  });

  test('visible=false sets wrapper opacity to 0', () => {
    const { getByTestId } = render(<SulatLoader visible={false} />);
    const wrap = getByTestId('sulat-loader');
    const styles = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.flat())
      : wrap.props.style;
    expect(styles.opacity).toBe(0);
  });

  test('visible=true sets wrapper opacity to 1', () => {
    const { getByTestId } = render(<SulatLoader visible={true} />);
    const wrap = getByTestId('sulat-loader');
    const styles = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.flat())
      : wrap.props.style;
    expect(styles.opacity).toBe(1);
  });
});
