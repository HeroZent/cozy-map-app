// app/privacy.tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={[styles.body, { color: theme.textMuted }]}>{children}</Text>;
}

export default function PrivacyPolicy() {
  const theme = useTheme();
  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.bg ?? '#0a0e22' }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.wordmark, { color: theme.accent }]}>sulat.</Text>
      <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Privacy Policy</Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>Effective date: April 28, 2026</Text>

      <Section title="What sulat is">
        <Body>
          {"sulat is a cozy, anonymous journaling app where people pin short notes to locations on a world map. You do not need an account, email address, or phone number to use sulat."}
        </Body>
      </Section>

      <Section title="What we collect">
        <Body>
          {"• Device fingerprint — a non-reversible identifier generated from your browser or device. It lets you see and manage your own sulats across sessions on the same device without an account.\n\n• Content you post — story text, location (snapped to ~500 m grid for privacy), mood, replies, and reactions.\n\n• Moderation metadata — when your post is reviewed by our AI moderation pipeline, we store the moderation verdict (pass / reject / crisis) alongside your post for safety auditing. We never store the raw API response from third-party services.\n\n• Flags — if other users flag your content, we record the reason and the flagging user's identifier.\n\n• Push notification tokens — only if you opt into notifications. Stored in our database; never shared."}
        </Body>
      </Section>

      <Section title="What we do NOT collect">
        <Body>
          {"• Your name, email address, or phone number (unless you voluntarily provide them during an optional account upgrade).\n\n• Precise GPS coordinates — your location is rounded to approximately 500 metres before storage.\n\n• Any data beyond what is necessary to run the app."}
        </Body>
      </Section>

      <Section title="How we use your data">
        <Body>
          {"• To display your sulats on the map and let others read them.\n\n• To run content moderation (via Anthropic's Haiku model) to keep the space safe.\n\n• To send push notifications about replies and reactions on your sulats, if you opt in.\n\n• To detect and act on community flags."}
        </Body>
      </Section>

      <Section title="Third-party services">
        <Body>
          {"• Supabase — our database and authentication provider (Ireland, EU). Data is stored in Supabase-managed Postgres.\n\n• Anthropic — AI content moderation. Only the text of your post is sent; no identifying information is included. Anthropic's zero-data-retention policy applies.\n\n• Expo Push Notifications — used to deliver push notifications if you enable them.\n\n• Vercel — web hosting (United States)."}
        </Body>
      </Section>

      <Section title="Data retention">
        <Body>
          {"Your sulats remain on the map indefinitely. After six months, a sulat transitions to 'Memory' status — it stays visible but replies are closed.\n\nYou may delete any of your sulats at any time from your profile. Deletion is permanent and immediate."}
        </Body>
      </Section>

      <Section title="Your rights">
        <Body>
          {"You can delete all your sulats, replies, and reactions from the Profile screen at any time. Under the Philippine Data Privacy Act of 2012 and applicable laws, you have the right to access, correct, and erase your personal data. To exercise these rights or ask questions, contact us at the address below."}
        </Body>
      </Section>

      <Section title="Children">
        <Body>
          {"sulat is not directed at children under 13. We do not knowingly collect data from children. If you believe a child has submitted content, please contact us and we will remove it promptly."}
        </Body>
      </Section>

      <Section title="Changes to this policy">
        <Body>
          {"We may update this policy as the app evolves. The effective date at the top of this page will reflect any changes. Continued use of sulat after changes constitutes acceptance of the updated policy."}
        </Body>
      </Section>

      <Section title="Contact">
        <Body>{"For privacy questions: hello@sulat.app"}</Body>
      </Section>

      <Text style={[styles.footer, { color: 'rgba(245,230,200,0.2)' }]}>Made with warmth 🕯️</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 22 },
  content: { paddingBottom: 60, paddingHorizontal: 24, paddingTop: 48 },
  footer: { fontSize: 12, marginTop: 32, textAlign: 'center' },
  meta: { fontSize: 12, marginBottom: 32, marginTop: 4 },
  pageTitle: { fontSize: 26, fontWeight: '700', marginTop: 4 },
  root: { flex: 1 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  wordmark: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
});
