// app/terms.tsx
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

export default function TermsOfService() {
  const theme = useTheme();
  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.bg ?? '#0a0e22' }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.wordmark, { color: theme.accent }]}>sulat.</Text>
      <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Terms of Service</Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>Effective date: April 28, 2026</Text>

      <Section title="About sulat">
        <Body>
          {"sulat is a cozy, anonymous map-based journaling app where people leave short notes at locations that matter to them. By using sulat you agree to these terms."}
        </Body>
      </Section>

      <Section title="Who can use sulat">
        <Body>
          {"You must be at least 13 years old to use sulat. By using the app you represent that you meet this requirement."}
        </Body>
      </Section>

      <Section title="What you can post">
        <Body>
          {"sulat is a space for personal reflection — regrets, hopes, memories, unsent letters, struggles, and forgiveness. You agree not to post content that:\n\n• Is hateful, discriminatory, or promotes violence against any person or group.\n\n• Contains graphic sexual content.\n\n• Harasses, threatens, or targets a specific real person.\n\n• Is spam, advertising, or off-topic commercial content.\n\n• Violates any applicable law.\n\nContent that violates these rules may be removed and repeated violations may result in your device being banned from the app."}
        </Body>
      </Section>

      <Section title="Crisis content">
        <Body>
          {"If you post content suggesting you may be in crisis, sulat may display a message with crisis support resources. This is not a substitute for professional mental health care. If you or someone you know is in immediate danger, please contact emergency services (911 in the Philippines)."}
        </Body>
      </Section>

      <Section title="Content ownership">
        <Body>
          {"You own the content you post. By posting on sulat, you grant us a non-exclusive, royalty-free license to display, store, and distribute your content within the app. We do not sell your content to third parties."}
        </Body>
      </Section>

      <Section title="Moderation">
        <Body>
          {"sulat uses automated AI moderation (Anthropic Haiku) to review posts before they appear on the map. We also rely on community flagging. We reserve the right to remove content that violates these terms without notice."}
        </Body>
      </Section>

      <Section title="Anonymity and identity">
        <Body>
          {"sulat is anonymous by default. Your posts are not linked to your real name or identity. However, your device fingerprint is stored to allow you to manage your own content. Do not post personally identifying information about yourself or others."}
        </Body>
      </Section>

      <Section title="Availability">
        <Body>
          {"sulat is provided as-is. We may change, pause, or discontinue the service at any time without notice. We are not liable for any loss of content or access."}
        </Body>
      </Section>

      <Section title="Limitation of liability">
        <Body>
          {"To the fullest extent permitted by law, sulat and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the app, including but not limited to loss of data or emotional distress."}
        </Body>
      </Section>

      <Section title="Governing law">
        <Body>
          {"These terms are governed by the laws of the Republic of the Philippines, without regard to conflict-of-law principles."}
        </Body>
      </Section>

      <Section title="Changes to these terms">
        <Body>
          {"We may update these terms as the app evolves. The effective date at the top of this page will reflect any changes. Continued use of sulat after changes constitutes acceptance of the updated terms."}
        </Body>
      </Section>

      <Section title="Contact">
        <Body>{"For questions about these terms: hello@sulat.app"}</Body>
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
