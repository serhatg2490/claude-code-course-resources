import type { Note } from '@/lib/notes';

export const TEST_USER = { id: 'user-1', email: 'ada@example.com', name: 'ada' };

export const DOC_JSON = JSON.stringify({ type: 'doc', content: [] });

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    userId: TEST_USER.id,
    title: 'Note',
    contentJson: DOC_JSON,
    isPublic: false,
    publicSlug: null,
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    ...overrides,
  };
}

export function noteFormData(fields: { title?: string; contentJson?: string; isPublic?: boolean }) {
  const data = new FormData();
  if (fields.title !== undefined) data.set('title', fields.title);
  if (fields.contentJson !== undefined) data.set('contentJson', fields.contentJson);
  if (fields.isPublic) data.set('isPublic', 'on');
  return data;
}
