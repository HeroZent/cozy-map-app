import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { ReplyBubble } from '@/replies/ReplyBubble';
import type { Reply } from '@/replies/useReplies';

const BASE_REPLY: Reply = {
  id: 'abc',
  body: 'hello world',
  created_at: new Date().toISOString(),
  author_id: 'user-1',
  display_handle: null,
};

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

test('shows "anon" when display_handle is null', () => {
  const { getByText } = wrap(<ReplyBubble reply={BASE_REPLY} />);
  expect(getByText('anon')).toBeTruthy();
});

test('shows display_handle when set', () => {
  const reply = { ...BASE_REPLY, display_handle: 'mango_palengke' };
  const { getByText } = wrap(<ReplyBubble reply={reply} />);
  expect(getByText('mango_palengke')).toBeTruthy();
});

test('renders body text', () => {
  const { getByText } = wrap(<ReplyBubble reply={BASE_REPLY} />);
  expect(getByText('hello world')).toBeTruthy();
});

test('shows "today" for a reply created now', () => {
  const { getByText } = wrap(<ReplyBubble reply={BASE_REPLY} />);
  expect(getByText('today')).toBeTruthy();
});
