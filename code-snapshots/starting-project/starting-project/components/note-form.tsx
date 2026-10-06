'use client';

import type { JSONContent } from '@tiptap/react';
import { useActionState, useRef, useState } from 'react';

import { RichTextEditor } from '@/components/rich-text-editor';
import { ShareLink } from '@/components/share-link';
import {
  DEFAULT_NOTE_TITLE,
  EMPTY_DOC_JSON,
  TITLE_MAX_LENGTH,
  type NoteFormState,
} from '@/lib/note-schemas';

type NoteFormProps = {
  action: (state: NoteFormState, formData: FormData) => Promise<NoteFormState>;
  initialTitle?: string;
  initialContent?: JSONContent;
  initialIsPublic?: boolean;
  /** Current public slug, if the note is already shared. */
  publicSlug?: string | null;
  submitLabel: string;
  pendingLabel: string;
};

const initialState: NoteFormState = {};

export function NoteForm({
  action,
  initialTitle = '',
  initialContent,
  initialIsPublic = false,
  publicSlug = null,
  submitLabel,
  pendingLabel,
}: NoteFormProps): React.JSX.Element {
  const [state, formAction, isPending] = useActionState(action, initialState);
  // Controlled so React's automatic post-action form reset can't wipe it on error.
  const [title, setTitle] = useState(initialTitle);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const shareDialogRef = useRef<HTMLDialogElement>(null);
  const [contentJson, setContentJson] = useState(() =>
    initialContent ? JSON.stringify(initialContent) : EMPTY_DOC_JSON,
  );

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }

  function handlePublicChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Enabling sharing waits for confirmation; the controlled checkbox stays unchecked until then.
    if (event.target.checked) {
      shareDialogRef.current?.showModal();
    } else {
      setIsPublic(false);
    }
  }

  function handleConfirmShare() {
    setIsPublic(true);
    shareDialogRef.current?.close();
  }

  function handleContentChange(content: JSONContent) {
    setContentJson(JSON.stringify(content));
  }

  const titleError = state.fieldErrors?.title;
  const contentError = state.fieldErrors?.contentJson;

  return (
    <form action={formAction} className='flex flex-col gap-5'>
      {state.formError && (
        <p
          role='alert'
          className='rounded-md border border-red-500 px-3 py-2 text-sm text-red-600 dark:text-red-400'
        >
          {state.formError}
        </p>
      )}

      <div className='flex flex-col gap-1.5'>
        <label htmlFor='title' className='text-sm font-medium'>
          Title
        </label>
        <input
          id='title'
          name='title'
          type='text'
          value={title}
          onChange={handleTitleChange}
          placeholder={DEFAULT_NOTE_TITLE}
          maxLength={TITLE_MAX_LENGTH}
          autoComplete='off'
          disabled={isPending}
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? 'title-error' : undefined}
          className='w-full rounded-md border border-neutral-300 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-60 aria-invalid:border-red-500 dark:border-neutral-700'
        />
        {titleError && (
          <p id='title-error' className='text-sm text-red-600 dark:text-red-400'>
            {titleError}
          </p>
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <span id='content-label' className='text-sm font-medium'>
          Content
        </span>
        <RichTextEditor
          labelledBy='content-label'
          describedBy={contentError ? 'content-error' : undefined}
          invalid={Boolean(contentError)}
          initialContent={initialContent}
          onChange={handleContentChange}
        />
        <input type='hidden' name='contentJson' value={contentJson} />
        {contentError && (
          <p id='content-error' className='text-sm text-red-600 dark:text-red-400'>
            {contentError}
          </p>
        )}
      </div>

      <fieldset className='flex flex-col gap-2 rounded-md border border-neutral-200 px-4 py-3 dark:border-neutral-800'>
        <legend className='px-1 text-sm font-medium'>Sharing</legend>
        <label className='flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            name='isPublic'
            checked={isPublic}
            onChange={handlePublicChange}
            disabled={isPending}
            aria-describedby='share-hint'
            className='size-4 accent-primary'
          />
          Share publicly — anyone with the link can view this note
        </label>
        <div id='share-hint' className='text-sm text-neutral-500'>
          {isPublic && publicSlug && <ShareLink slug={publicSlug} />}
          {isPublic && !publicSlug && 'A public link will be created when you save.'}
          {!isPublic && publicSlug && 'Saving will disable the current public link.'}
        </div>

        <dialog
          ref={shareDialogRef}
          aria-labelledby='share-dialog-heading'
          className='m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-neutral-200 bg-background p-6 text-foreground shadow-xl backdrop:bg-black/50 dark:border-neutral-800'
        >
          <h2 id='share-dialog-heading' className='text-lg font-semibold'>
            Share this note publicly?
          </h2>
          <p className='mt-2 text-sm text-neutral-500'>
            Anyone with the link will be able to view this note. You can turn sharing off at any
            time.
          </p>
          <div className='mt-6 flex justify-end gap-2'>
            <button
              type='button'
              autoFocus
              onClick={() => shareDialogRef.current?.close()}
              className='rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link dark:border-neutral-700 dark:hover:bg-neutral-900'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={handleConfirmShare}
              className='rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link'
            >
              Share publicly
            </button>
          </div>
        </dialog>
      </fieldset>

      <div className='flex justify-end'>
        <button
          type='submit'
          disabled={isPending}
          className='rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-60'
        >
          {isPending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
