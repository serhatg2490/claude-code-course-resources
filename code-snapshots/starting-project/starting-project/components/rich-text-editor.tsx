'use client';

import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

type RichTextEditorProps = {
  /** Id of the visible label element that names the editor. */
  labelledBy: string;
  describedBy?: string;
  invalid?: boolean;
  initialContent?: JSONContent;
  onChange: (content: JSONContent) => void;
};

type ToolbarButton = {
  label: string;
  /** Omitted for one-shot actions, which aren't toggle buttons. */
  isActive?: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const TOOLBAR: ToolbarButton[][] = [
  [
    {
      label: 'Bold',
      isActive: (e) => e.isActive('bold'),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      isActive: (e) => e.isActive('italic'),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
  ],
  [
    {
      label: 'Paragraph',
      isActive: (e) => e.isActive('paragraph'),
      run: (e) => e.chain().focus().setParagraph().run(),
    },
    ...([1, 2, 3] as const).map((level) => ({
      label: `H${level}`,
      isActive: (e: Editor) => e.isActive('heading', { level }),
      run: (e: Editor) => e.chain().focus().toggleHeading({ level }).run(),
    })),
  ],
  [
    {
      label: 'Bullet list',
      isActive: (e) => e.isActive('bulletList'),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Inline code',
      isActive: (e) => e.isActive('code'),
      run: (e) => e.chain().focus().toggleCode().run(),
    },
    {
      label: 'Code block',
      isActive: (e) => e.isActive('codeBlock'),
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
  ],
  [{ label: 'Horizontal rule', run: (e) => e.chain().focus().setHorizontalRule().run() }],
];

const ALL_BUTTONS = TOOLBAR.flat();

export function RichTextEditor({
  labelledBy,
  describedBy,
  invalid,
  initialContent,
  onChange,
}: RichTextEditorProps): React.JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // v3 StarterKit adds these by default; they're not part of our feature set.
        link: false,
        underline: false,
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelledBy,
        ...(describedBy && { 'aria-describedby': describedBy }),
        ...(invalid && { 'aria-invalid': 'true' }),
        class: 'rich-text min-h-60 px-4 py-3 focus-visible:outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  const activeStates = useEditorState({
    editor,
    selector: ({ editor }) =>
      ALL_BUTTONS.map((button) =>
        editor && button.isActive ? button.isActive(editor) : undefined,
      ),
  });

  return (
    <div
      className={`overflow-hidden rounded-md border focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-current ${
        invalid ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
      }`}
    >
      <div
        role='toolbar'
        aria-label='Formatting'
        className='flex flex-wrap gap-1 border-b border-neutral-200 bg-neutral-50 p-1.5 dark:border-neutral-800 dark:bg-neutral-900'
      >
        {TOOLBAR.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className='flex gap-1 not-first:border-l not-first:border-neutral-200 not-first:pl-1 dark:not-first:border-neutral-800'
          >
            {group.map((button) => {
              const pressed = button.isActive
                ? (activeStates?.[ALL_BUTTONS.indexOf(button)] ?? false)
                : undefined;
              return (
                <button
                  key={button.label}
                  type='button'
                  aria-pressed={pressed}
                  disabled={!editor}
                  onClick={() => editor && button.run(editor)}
                  className='rounded px-2 py-1 text-sm font-medium transition-colors hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-current aria-pressed:bg-foreground aria-pressed:text-background disabled:opacity-50 dark:hover:bg-neutral-800'
                >
                  {button.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
