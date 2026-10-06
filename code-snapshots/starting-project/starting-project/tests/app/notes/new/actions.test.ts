import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNoteAction } from '@/app/notes/new/actions';
import { createNote } from '@/lib/notes';
import { RedirectError } from '../../../helpers/next-navigation';
import { DOC_JSON, makeNote, noteFormData, TEST_USER } from '../../../helpers/notes';

// Factories run while the action module loads, so helpers are imported inside them.
vi.mock('next/navigation', async () => ({
  redirect: (await import('../../../helpers/next-navigation')).throwRedirect,
}));
vi.mock('@/lib/auth', async () => {
  const { TEST_USER } = await import('../../../helpers/notes');
  return { requireUser: vi.fn(async () => TEST_USER) };
});
vi.mock('@/lib/notes', () => ({ createNote: vi.fn() }));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('createNoteAction', () => {
  it('creates the note for the current user and redirects to it', async () => {
    vi.mocked(createNote).mockResolvedValue(makeNote({ id: 'new-note' }));

    await expect(
      createNoteAction({}, noteFormData({ title: 'Hello', contentJson: DOC_JSON, isPublic: true })),
    ).rejects.toEqual(new RedirectError('/notes/new-note'));
    expect(createNote).toHaveBeenCalledWith(TEST_USER.id, {
      title: 'Hello',
      contentJson: DOC_JSON,
      isPublic: true,
    });
  });

  it('returns field errors without touching the DB', async () => {
    const state = await createNoteAction({}, noteFormData({ title: 'Hi', contentJson: 'nope' }));
    expect(state.fieldErrors?.contentJson).toBe('Note content is invalid.');
    expect(createNote).not.toHaveBeenCalled();
  });

  it('returns a form error when saving fails', async () => {
    vi.mocked(createNote).mockRejectedValue(new Error('disk full'));
    const state = await createNoteAction({}, noteFormData({ title: 'Hi', contentJson: DOC_JSON }));
    expect(state).toEqual({ formError: 'Could not save your note. Please try again.' });
  });
});
