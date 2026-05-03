import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SulatLogo } from '../SulatLogo';

describe('SulatLogo', () => {
  test('renders the wordmark text "sulat"', () => {
    const { getByText } = render(<SulatLogo size={60} />);
    expect(getByText('sulat')).toBeTruthy();
  });

  test('applies italic font style to the wordmark', () => {
    const { getByText } = render(<SulatLogo size={60} />);
    const wordmark = getByText('sulat');
    const styles = Array.isArray(wordmark.props.style)
      ? Object.assign({}, ...wordmark.props.style.flat())
      : wordmark.props.style;
    expect(styles.fontStyle).toBe('italic');
  });

  test('applies the spec-exact wordmark color #E8B86A', () => {
    const { getByText } = render(<SulatLogo size={60} />);
    const wordmark = getByText('sulat');
    const styles = Array.isArray(wordmark.props.style)
      ? Object.assign({}, ...wordmark.props.style.flat())
      : wordmark.props.style;
    expect(styles.color).toBe('#E8B86A');
  });

  test('dot diameter is 13% of the given font size (rounded)', () => {
    const { getByTestId } = render(<SulatLogo size={60} />);
    const dot = getByTestId('sulat-logo-dot');
    const styles = Array.isArray(dot.props.style)
      ? Object.assign({}, ...dot.props.style.flat())
      : dot.props.style;
    // 60 * 0.13 = 7.8 → 8
    expect(styles.width).toBe(8);
    expect(styles.height).toBe(8);
  });

  test('dot uses the spec-exact amber-soft color #F2D08C', () => {
    const { getByTestId } = render(<SulatLogo size={60} />);
    const dot = getByTestId('sulat-logo-dot');
    const styles = Array.isArray(dot.props.style)
      ? Object.assign({}, ...dot.props.style.flat())
      : dot.props.style;
    expect(styles.backgroundColor).toBe('#F2D08C');
  });

  test('breathing prop adds animationName "sulatBreathe" on the wrapper', () => {
    const { getByTestId } = render(<SulatLogo size={60} breathing />);
    const wrap = getByTestId('sulat-logo-wrap');
    const styles = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.flat())
      : wrap.props.style;
    expect(styles.animationName).toBe('sulatBreathe');
  });

  test('without breathing, no animationName is set', () => {
    const { getByTestId } = render(<SulatLogo size={60} />);
    const wrap = getByTestId('sulat-logo-wrap');
    const styles = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.flat())
      : wrap.props.style;
    expect(styles.animationName).toBeFalsy();
  });
});
