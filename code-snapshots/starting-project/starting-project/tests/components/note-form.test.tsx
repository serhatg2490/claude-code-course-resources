// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoteForm } from '@/components/note-form';
import type { NoteFormState } from '@/lib/note-schemas';

// TipTap needs real layout APIs; a button that emits a fixed doc is enough here.
vi.mock('@/components/rich-text-editor', () => ({
  RichTextEditor: ({ onChange }: { onChange: (content: unknown) => void }) => (
    <button
      type='button'
      onClick={() => onChange({ type: 'doc', content: [{ type: 'paragraph' }] })}
    >
      Edit content
    </button>
  ),
}));

type Action = (state: NoteFormState, formData: FormData) => Promise<NoteFormState>;

function renderForm(props: Partial<React.ComponentProps<typeof NoteForm>> = {}) {
  const action = vi.fn<Action>(async () => ({}));
  render(<NoteForm action={action} submitLabel='Save' pendingLabel='Saving…' {...props} />);
  return action;
}

function contentInput(): HTMLInputElement {
  return document.querySelector('input[name="contentJson"]')!;
}

function shareCheckbox(): HTMLInputElement {
  return screen.getByRole('checkbox') as HTMLInputElement;
}

// jsdom doesn't implement modal dialogs; toggling `open` is all these tests rely on.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
  };
});

describe('NoteForm', () => {
  it('starts with the initial values and an empty doc', () => {
    renderForm({ initialTitle: 'Groceries' });
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Groceries');
    expect(contentInput().value).toBe(JSON.stringify({ type: 'doc', content: [] }));
  });

  it('serializes editor changes into the hidden content field', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Edit content' }));
    expect(JSON.parse(contentInput().value)).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  });

  it('asks for confirmation before enabling sharing', () => {
    renderForm();
    fireEvent.click(shareCheckbox());
    expect(screen.getByRole('dialog', { name: 'Share this note publicly?' })).toBeTruthy();
    expect(shareCheckbox().checked).toBe(false);
  });

  it('keeps sharing off when the confirmation is cancelled', async () => {
    const action = renderForm();
    fireEvent.click(shareCheckbox());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(shareCheckbox().checked).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await vi.waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls[0][1].get('isPublic')).toBeNull();
  });

  it('enables sharing once confirmed and explains a link will be created', async () => {
    const action = renderForm();
    fireEvent.click(shareCheckbox());
    fireEvent.click(screen.getByRole('button', { name: 'Share publicly' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(shareCheckbox().checked).toBe(true);
    expect(screen.getByText('A public link will be created when you save.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await vi.waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls[0][1].get('isPublic')).toBe('on');
  });

  it('shows the existing share link for a shared note', () => {
    renderForm({ initialIsPublic: true, publicSlug: 'slug42' });
    expect(screen.getByRole('link', { name: '/p/slug42' })).toBeTruthy();
  });

  it('warns that unsharing disables the current link, without confirmation', () => {
    renderForm({ initialIsPublic: true, publicSlug: 'slug42' });
    fireEvent.click(shareCheckbox());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(shareCheckbox().checked).toBe(false);
    expect(screen.getByText('Saving will disable the current public link.')).toBeTruthy();
  });

  it('submits the form data and shows errors returned by the action', async () => {
    const action = renderForm({ initialTitle: 'Hello' });
    action.mockResolvedValue({
      formError: 'Could not save.',
      fieldErrors: { title: 'Title too long.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Could not save.');
    expect(screen.getByText('Title too long.')).toBeTruthy();
    expect(screen.getByLabelText('Title').getAttribute('aria-invalid')).toBe('true');

    const formData = action.mock.calls[0][1];
    expect(formData.get('title')).toBe('Hello');
    expect(formData.get('isPublic')).toBeNull();
  });
});
