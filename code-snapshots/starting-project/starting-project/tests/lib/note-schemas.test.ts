import { describe, expect, it } from 'vitest';

import {
  EMPTY_DOC_JSON,
  parseNoteContent,
  parseNoteForm,
  TITLE_MAX_LENGTH,
  toPublicPath,
} from '@/lib/note-schemas';

const DOC = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe('toPublicPath', () => {
  it('builds the public share path', () => {
    expect(toPublicPath('abc123')).toBe('/p/abc123');
  });
});

describe('parseNoteForm', () => {
  it('parses a valid form and trims the title', () => {
    const result = parseNoteForm(
      formData({ title: '  My note  ', contentJson: DOC, isPublic: 'on' }),
    );
    expect(result).toEqual({ data: { title: 'My note', contentJson: DOC, isPublic: true } });
  });

  it('treats a missing checkbox as private and a missing title as empty', () => {
    const result = parseNoteForm(formData({ contentJson: DOC }));
    expect(result.data).toEqual({ title: '', contentJson: DOC, isPublic: false });
  });

  it('rejects titles over the max length', () => {
    const result = parseNoteForm(
      formData({ title: 'x'.repeat(TITLE_MAX_LENGTH + 1), contentJson: DOC }),
    );
    expect(result.errors?.fieldErrors?.title).toBe(
      `Title must be at most ${TITLE_MAX_LENGTH} characters.`,
    );
  });

  it.each([
    ['malformed JSON', '{not json'],
    ['JSON that is not a doc', JSON.stringify({ type: 'paragraph' })],
    ['JSON null', 'null'],
    ['missing content', undefined],
  ])('rejects %s as content', (_label, contentJson) => {
    const fields: Record<string, string> = { title: 'Title' };
    if (contentJson !== undefined) fields.contentJson = contentJson;
    const result = parseNoteForm(formData(fields));
    expect(result.errors?.fieldErrors).toEqual({
      title: undefined,
      contentJson: 'Note content is invalid.',
    });
  });
});

describe('parseNoteContent', () => {
  it('parses stored JSON', () => {
    expect(parseNoteContent(DOC)).toEqual(JSON.parse(DOC));
  });

  it('falls back to an empty doc when the JSON is corrupt', () => {
    expect(parseNoteContent('{oops')).toEqual(JSON.parse(EMPTY_DOC_JSON));
  });
});
