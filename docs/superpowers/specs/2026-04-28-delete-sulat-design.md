# Delete Sulat Design

## Goal

Let authors permanently delete their own sulat from the profile view. Tap an X button on a sulat row, see a styled in-app confirmation warning, confirm to hard-delete. RLS enforces ownership — no edge function needed.

## Architecture

**Four units:**
1. **`useMyStories.deleteStory()`** — data layer; direct Supabase client delete + optimistic state filter
2. **`MySulatRow`** — adds optional `onDelete` prop and renders an X button
3. **`DeleteConfirmSheet`** — new full-screen overlay component with warning copy, Cancel, and Delete buttons
4. **`ProfileModal`** — orchestrates state (`pendingDeleteId`, `deleting`) and connects the three units above

Cascade handles replies and reactions automatically (FK `on delete cascade` already in place). No new migrations needed.

---

## Section 1 — Data Layer

### `useMyStories` (`src/profile/useMyStories.ts`)

Add `deleteStory(id: string): Promise<void>` to the existing hook return value.

**Implementation:**

```typescript
const deleteStory = async (id: string): Promise<void> => {
  const { error } = await supabase.from('stories').delete().eq('id', id);
  if (error) throw error;
  setStories((prev) => prev.filter((s) => s.id !== id));
};
```

Return shape becomes:

```typescript
interface UseMyStoriesResult {
  stories: MyStory[];
  loading: boolean;
  error: Error | null;
  deleteStory: (id: string) => Promise<void>;
}
```

The delete call relies on RLS policy `stories_delete_self` (`auth.uid() = author_id`) — already in place. If Supabase returns an error (network, unexpected RLS denial), the function throws; the state is NOT filtered. The caller (`ProfileModal`) catches and handles gracefully.

---

## Section 2 — Components

### `DeleteConfirmSheet` (`src/profile/DeleteConfirmSheet.tsx`)

A new component. Full-screen semi-transparent backdrop with a centered themed card.

**Props:**

```typescript
interface DeleteConfirmSheetProps {
  visible: boolean;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Layout:**
- Outer: `position: absolute, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'`
- Card: `backgroundColor: theme.surface, borderRadius: 16, padding: 24, width: '80%', maxWidth: 320`
- Title: `"Delete sulat"` — `fontWeight: '600'`, `color: theme.textPrimary`
- Body: `"This sulat can't be recovered after deletion."` — `color: theme.textMuted`, `marginTop: 8, marginBottom: 24`
- Button row: `flexDirection: 'row', justifyContent: 'flex-end', gap: 12`
  - Cancel button: text `"Cancel"`, `color: theme.textMuted`, disabled when `deleting`
  - Delete button: text `"Delete"`, `color: '#c0392b'`, `fontWeight: '600'`, disabled when `deleting`; shows `"Deleting…"` when `deleting` is true

When `!visible`, render `null`.

### `MySulatRow` (`src/profile/MySulatRow.tsx`)

Add an optional `onDelete?: () => void` prop. When provided, render an X button as an absolute-positioned overlay on the card.

**Updated props:**

```typescript
interface MySulatRowProps {
  story: MyStory;
  isUnread: boolean;
  onNavigate: () => void;
  onDelete?: () => void;
}
```

**X button:**
```tsx
{onDelete && (
  <Pressable
    onPress={onDelete}
    style={{ position: 'absolute', top: 8, right: 8, padding: 8 }}
    hitSlop={4}
    accessibilityLabel="Delete sulat"
    testID="delete-sulat-button"
  >
    <Text style={{ fontSize: 11, color: theme.textMuted }}>✕</Text>
  </Pressable>
)}
```

The `padding: 8` gives an adequate tap target. The glyph is `✕` (U+2715) at `fontSize: 11`. No new layout containers are added — existing card structure is unchanged.

### `ProfileModal` (`src/profile/ProfileModal.tsx`)

Add two new state variables:

```typescript
const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
const [deleting, setDeleting] = useState(false);
```

Destructure `deleteStory` from `useMyStories()`.

Pass `onDelete` to each `MySulatRow`:

```tsx
<MySulatRow
  key={story.id}
  story={story}
  isUnread={...}
  onNavigate={...}
  onDelete={() => setPendingDeleteId(story.id)}
/>
```

Render `<DeleteConfirmSheet>` after the `ScrollView` (inside the modal's root view):

```tsx
<DeleteConfirmSheet
  visible={pendingDeleteId !== null}
  deleting={deleting}
  onCancel={() => setPendingDeleteId(null)}
  onConfirm={handleConfirmDelete}
/>
```

**`handleConfirmDelete`:**

```typescript
const handleConfirmDelete = async () => {
  if (!pendingDeleteId) return;
  setDeleting(true);
  try {
    await deleteStory(pendingDeleteId);
    setPendingDeleteId(null);
  } catch (err) {
    console.error('[ProfileModal] delete failed:', err);
    setPendingDeleteId(null); // dismiss sheet; story stays in list
  } finally {
    setDeleting(false);
  }
};
```

On error: confirmation sheet dismisses, story remains in the list. No error toast — fail open.

---

## Section 3 — Error Handling & Testing

### Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Supabase delete succeeds | Story removed from state, sheet dismissed |
| Supabase delete fails (network / RLS) | Logs error, sheet dismissed, story stays in list |
| User taps Cancel | `pendingDeleteId` cleared, no delete attempted |
| Double-tap X while sheet open | Already visible — no second sheet (sheet is controlled by a single `pendingDeleteId`) |
| Delete during `deleting: true` | Buttons disabled, taps ignored |

### Tests

**`src/profile/__tests__/useMyStories.test.tsx`** — extend existing file:
- `deleteStory` calls `.delete().eq('id', id)` on the stories table
- On success, the deleted story is removed from `stories` state
- On Supabase error, the story remains in `stories` state and the error is rethrown

**`src/profile/__tests__/DeleteConfirmSheet.test.tsx`** — new file:
- Renders nothing when `visible={false}`
- Renders title, warning copy, Cancel and Delete buttons when `visible={true}`
- Calls `onCancel` when Cancel is pressed
- Calls `onConfirm` when Delete is pressed
- Shows `"Deleting…"` and disables both buttons when `deleting={true}`

**`src/profile/__tests__/MySulatRow.test.tsx`** — extend existing file:
- X button is absent when `onDelete` is not provided
- X button is present when `onDelete` is provided
- Pressing X button calls `onDelete`

**`src/profile/__tests__/ProfileModal.test.tsx`** — extend existing file:
- Pressing X on a sulat row shows `DeleteConfirmSheet` with the correct sulat
- Pressing Cancel dismisses the sheet without calling `deleteStory`
- Pressing Delete calls `deleteStory` and dismisses the sheet on success
- On `deleteStory` error, sheet dismisses and story remains in list

---

## What This Spec Does NOT Cover

- Soft delete / archive (future, if needed)
- Undo / restore after deletion
- Deleting replies or reactions directly (cascade handles this)
- Bulk delete
- Admin-side deletion (separate moderation flow)
