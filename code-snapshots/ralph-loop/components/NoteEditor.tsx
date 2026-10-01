'use client';

import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

type NoteEditorProps = {
  /** The editor's starting document. Only read on mount: later prop changes don't reset what the user typed. */
  initialContent: JSONContent;
};

/** The TipTap rich-text editor for a note's content. */
export function NoteEditor({ initialContent }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: initialContent,
    // Render on the client only, so the server HTML and the first client render match.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Note content',
        class:
          'prose prose-zinc max-w-none min-h-64 px-4 py-3 focus:outline-none dark:prose-invert',
      },
    },
  });

  return (
    <div className='rounded-xl border border-zinc-200 bg-white shadow-sm focus-within:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-within:border-zinc-600'>
      <EditorContent editor={editor} />
    </div>
  );
}
