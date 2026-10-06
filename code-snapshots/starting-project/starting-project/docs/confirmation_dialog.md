# Confirm before enabling public sharing

## Context
Checking "Share publicly" in `NoteForm` currently flips `isPublic` immediately. Making a note world-readable deserves an explicit confirmation step. Unsharing stays instant (it's the safe direction).

## Approach
Mirror the existing native `<dialog>` + `showModal()` pattern from `components/delete-note-button.tsx` (same classes, `aria-labelledby`, `autoFocus` on Cancel, `backdrop:bg-black/50`).

**`components/note-form.tsx`**
- Add `const shareDialogRef = useRef<HTMLDialogElement>(null)`.
- `handlePublicChange`: if `event.target.checked` → `shareDialogRef.current?.showModal()` and do **not** update state (controlled checkbox stays unchecked); else `setIsPublic(false)`.
- `handleConfirmShare`: `setIsPublic(true)` then `close()`. Cancel button just `close()`. Esc/backdrop-cancel need no handling — state was never changed.
- Render the `<dialog>` inside the `<fieldset>`; buttons are `type='button'` (no nested form):
  - Heading: "Share this note publicly?"
  - Body: "Anyone with the link will be able to view this note. You can turn sharing off at any time."
  - Buttons: "Cancel" (autoFocus, neutral style) / "Share publicly" (`bg-primary text-primary-foreground`, matching submit button).
- No new component file — it's ~25 lines, single use, and lives with the state it toggles.

**`tests/components/note-form.test.tsx`**
- jsdom has no `showModal`/`close`: stub them in a `beforeEach` on `HTMLDialogElement.prototype` (toggle the `open` attribute).
- Update "explains that a link is created…" test to click checkbox → confirm in dialog → assert hint text.
- New tests:
  - Checking opens dialog and leaves checkbox unchecked until confirmed.
  - Cancel keeps checkbox unchecked; `isPublic` absent from submitted FormData.
  - Confirm checks the box; submitted FormData has `isPublic === 'on'`.
  - Unchecking an already-public note does not open the dialog (existing "warns that unsharing…" test covers the hint).

## Verification
- `bun run test`, `bun run lint`, `bun run build`.
- Manual: `bun dev` → new/edit note → check "Share publicly" → dialog appears; Cancel/Esc leaves it unchecked; Confirm checks it and shows "A public link will be created when you save."; save and confirm the `/p/<slug>` link works.
