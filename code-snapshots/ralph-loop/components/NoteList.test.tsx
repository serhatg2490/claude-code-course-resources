import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Note } from '@/lib/notes';
import { NoteList, type NoteSummary } from './NoteList';

const now = new Date('2026-10-01T12:00:00Z');

function summary(overrides: Partial<NoteSummary> = {}): NoteSummary {
  return {
    id: '7f8c1d2e-0000-4000-8000-000000000001',
    title: 'Groceries',
    updatedAt: '2026-10-01 11:00:00',
    isPublic: false,
    ...overrides,
  };
}

function render(notes: NoteSummary[]): string {
  return renderToStaticMarkup(<NoteList notes={notes} now={now} />);
}

describe('NoteList', () => {
  test('shows the empty state when there are no notes', () => {
    const html = render([]);

    expect(html).toContain('No notes yet');
    expect(html).toContain('Create one to start writing');
    expect(html).not.toContain('<ul');
    expect(html).not.toContain('<a ');
  });

  test('renders one card per note, linking to its editor, in the given order', () => {
    const html = render([
      summary({ id: 'note-b', title: 'Second' }),
      summary({ id: 'note-a', title: 'First' }),
    ]);

    const hrefs = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs).toEqual(['/notes/note-b', '/notes/note-a']);
    expect(html.indexOf('Second')).toBeLessThan(html.indexOf('First'));
    expect(html).not.toContain('No notes yet');
  });

  test('shows when the note was last updated, with the exact UTC time in dateTime', () => {
    const html = render([summary({ updatedAt: '2026-09-28 12:00:00' })]);

    expect(html).toContain('Updated <time dateTime="2026-09-28T12:00:00.000Z">3 days ago</time>');
  });

  test('labels shared and private notes', () => {
    expect(render([summary({ isPublic: true })])).toContain('>Shared</span>');
    expect(render([summary({ isPublic: false })])).toContain('>Private</span>');
  });

  test('escapes note titles', () => {
    const html = render([summary({ title: '<img src=x onerror=alert(1)>' })]);

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
  });

  test('accepts full notes, so the dashboard can pass repository results directly', () => {
    const note: Note = {
      ...summary({ title: 'Full note' }),
      userId: 'user-1',
      contentJson:
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"secret body"}]}]}',
      publicSlug: null,
      createdAt: '2026-10-01 10:00:00',
    };

    const html = render([note]);

    expect(html).toContain('Full note');
    expect(html).not.toContain('secret body');
  });
});
