import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteNoteAction, updateNoteAction } from '@/app/notes/[id]/actions';
import { deleteNote, updateNote } from '@/lib/notes';
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
vi.mock('@/lib/notes', () => ({ updateNote: vi.fn(), deleteNote: vi.fn() }));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('updateNoteAction', () => {
  const validForm = () => noteFormData({ title: 'Edited', contentJson: DOC_JSON });

  it("updates the user's note and redirects to it", async () => {
    vi.mocked(updateNote).mockResolvedValue(makeNote());

    await expect(updateNoteAction('note-1', {}, validForm())).rejects.toEqual(
      new RedirectError('/notes/note-1'),
    );
    expect(updateNote).toHaveBeenCalledWith(TEST_USER.id, 'note-1', {
      title: 'Edited',
      contentJson: DOC_JSON,
      isPublic: false,
    });
  });

  it('returns field errors without touching the DB', async () => {
    const state = await updateNoteAction(
      'note-1',
      {},
      noteFormData({ title: 'x'.repeat(201), contentJson: DOC_JSON }),
    );
    expect(state.fieldErrors?.title).toMatch(/at most 200/);
    expect(updateNote).not.toHaveBeenCalled();
  });

  it('reports a missing note', async () => {
    vi.mocked(updateNote).mockResolvedValue(null);
    expect(await updateNoteAction('note-1', {}, validForm())).toEqual({
      formError: 'Note not found.',
    });
  });

  it('returns a form error when saving fails', async () => {
    vi.mocked(updateNote).mockRejectedValue(new Error('locked'));
    expect(await updateNoteAction('note-1', {}, validForm())).toEqual({
      formError: 'Could not save your changes. Please try again.',
    });
  });
});

describe('deleteNoteAction', () => {
  it('deletes the note and redirects to the dashboard', async () => {
    vi.mocked(deleteNote).mockResolvedValue(true);
    await expect(deleteNoteAction('note-1')).rejects.toEqual(new RedirectError('/dashboard'));
    expect(deleteNote).toHaveBeenCalledWith(TEST_USER.id, 'note-1');
  });

  it('reports a missing note', async () => {
    vi.mocked(deleteNote).mockResolvedValue(false);
    expect(await deleteNoteAction('note-1')).toEqual({ error: 'Note not found.' });
  });

  it('returns an error when deleting fails', async () => {
    vi.mocked(deleteNote).mockRejectedValue(new Error('locked'));
    expect(await deleteNoteAction('note-1')).toEqual({
      error: 'Could not delete the note. Please try again.',
    });
  });
});
