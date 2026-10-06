// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NoteList } from '@/components/note-list';
import { makeNote } from '../helpers/notes';

describe('NoteList', () => {
  it('shows an empty state linking to note creation', () => {
    render(<NoteList notes={[]} />);
    expect(screen.getByText('No notes yet')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create your first note' }).getAttribute('href')).toBe(
      '/notes/new',
    );
  });

  it('lists notes with their updated time and shared status', () => {
    render(
      <NoteList
        notes={[
          makeNote({
            id: 'a',
            title: 'Shared note',
            isPublic: true,
            updatedAt: '2026-03-02 14:05:00',
          }),
          makeNote({ id: 'b', title: 'Private note' }),
        ]}
      />,
    );

    const [shared, privateNote] = screen.getAllByRole('link');
    expect(shared.getAttribute('href')).toBe('/notes/a');
    expect(shared.textContent).toContain('Shared note');
    expect(shared.textContent).toContain('Public');
    expect(shared.querySelector('time')?.getAttribute('dateTime')).toBe('2026-03-02T14:05:00.000Z');

    expect(privateNote.getAttribute('href')).toBe('/notes/b');
    expect(privateNote.textContent).not.toContain('Public');
  });
});
