'use client';

import { EditorContent, useEditor, type JSONContent, type UseEditorOptions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// Module-level so every render passes the same references: `useEditor` compares options by identity
// and calls `editor.setOptions()` whenever they differ, which would otherwise happen on each keystroke
// once a parent re-renders from `onChange`.

/**
 * TipTap v3's StarterKit already bundles inline code, code blocks, bullet lists and horizontal rules,
 * so they aren't added separately (TipTap warns about duplicate extensions).
 */
const extensions = [StarterKit.configure({ heading: { levels: [1, 2, 3] } })];

const editorProps: UseEditorOptions['editorProps'] = {
  attributes: {
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-label': 'Note content',
    class: 'prose prose-zinc max-w-none min-h-64 px-4 py-3 focus:outline-none dark:prose-invert',
  },
};

type NoteEditorProps = {
  /** The editor's starting document. Only read on mount: later prop changes don't reset what the user typed. */
  initialContent: JSONContent;
  /** Called with the whole document after each edit. Not called for the initial content. */
  onChange?: (content: JSONContent) => void;
};

/** The TipTap rich-text editor for a note's content. */
export function NoteEditor({ initialContent, onChange }: NoteEditorProps) {
  const editor = useEditor({
    extensions,
    content: initialContent,
    // Render on the client only, so the server HTML and the first client render match.
    immediatelyRender: false,
    editorProps,
    // `useEditor` always invokes the latest `onUpdate`, so a new `onChange` each render is never stale.
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
  });

  return (
    <div className='rounded-xl border border-zinc-200 bg-white shadow-sm focus-within:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-within:border-zinc-600'>
      <EditorContent editor={editor} />
    </div>
  );
}
