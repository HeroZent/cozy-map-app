/**
 * @jest-environment jsdom
 *
 * SulatLantern uses dangerouslySetInnerHTML to inject SVG markup, which only
 * renders meaningfully under jsdom. The component is web-only by design.
 */
import { render } from '@testing-library/react-native';
import { SulatLantern } from '../SulatLantern';

describe('SulatLantern', () => {
  test('renders an outer wrapper with the requested width', () => {
    const { getByTestId } = render(<SulatLantern width={14} />);
    const wrap = getByTestId('sulat-lantern');
    const styles = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.flat())
      : wrap.props.style;
    expect(styles.width).toBe(14);
    // 38/28 ≈ 1.357, height = round(width * 38/28)
    expect(styles.height).toBe(Math.round(14 * 38 / 28));
  });

  test('renders an inline SVG with viewBox 0 0 28 38', () => {
    const { getByTestId } = render(<SulatLantern width={14} />);
    const wrap = getByTestId('sulat-lantern');
    const html = (wrap.props as any).dangerouslySetInnerHTML?.__html ?? '';
    expect(html).toContain('viewBox="0 0 28 38"');
  });

  test('SVG markup contains the lantern body ellipse', () => {
    const { getByTestId } = render(<SulatLantern width={14} />);
    const wrap = getByTestId('sulat-lantern');
    const html = (wrap.props as any).dangerouslySetInnerHTML?.__html ?? '';
    expect(html).toContain('<ellipse');
    expect(html).toMatch(/cy="19"/);
  });
});
