import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { JSDOM } from 'jsdom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Editor, type JSONContent } from '@tiptap/react';
import { NoteEditor } from './NoteEditor';

// TipTap needs a real DOM, so these tests mount the editor in jsdom with React's client renderer.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const domGlobals = {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  Node: dom.window.Node,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true,
};
const originalGlobals = new Map(
  Object.keys(domGlobals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
);

beforeAll(() => {
  for (const [key, value] of Object.entries(domGlobals)) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
});

afterAll(() => {
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  }
  dom.window.close();
});

const initialContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
};

let root: Root | null = null;
let mountedEditor: Editor | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  // `useEditor` destroys the editor on a timer after unmount. Wait for it, so the teardown can't run
  // after the DOM globals are gone.
  while (mountedEditor && !mountedEditor.isDestroyed) {
    await Bun.sleep(1);
  }
  root = null;
  mountedEditor = null;
  document.body.innerHTML = '';
});

/** Mounts the editor and returns the TipTap instance behind it (TipTap exposes it on its DOM node). */
async function mountEditor(onChange?: (content: JSONContent) => void): Promise<Editor> {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<NoteEditor initialContent={initialContent} onChange={onChange} />),
  );

  const editorDom = container.querySelector('[aria-label="Note content"]');
  const editor: unknown = editorDom && Reflect.get(editorDom, 'editor');
  if (!(editor instanceof Editor)) {
    throw new Error('The TipTap editor did not mount');
  }
  mountedEditor = editor;
  return editor;
}

describe('NoteEditor', () => {
  test('renders the initial content in an accessible textbox', async () => {
    const editor = await mountEditor();

    const textbox = document.querySelector('[role="textbox"]');
    expect(textbox?.getAttribute('aria-multiline')).toBe('true');
    expect(textbox?.textContent).toBe('Hello');
    expect<JSONContent>(editor.getJSON()).toEqual(initialContent);
  });

  test('does not call onChange for the initial content', async () => {
    const onChange = mock();
    await mountEditor(onChange);

    expect(onChange).not.toHaveBeenCalled();
  });

  test('calls onChange with the whole document after each edit', async () => {
    const onChange = mock();
    const editor = await mountEditor(onChange);

    act(() => {
      editor.chain().focus('end').insertContent(' world').run();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
    });

    act(() => {
      editor.chain().selectAll().toggleBold().run();
    });

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world', marks: [{ type: 'bold' }] }],
        },
      ],
    });
  });

  test('supports the formatting the toolbar will need (headings 1-3, code, lists, rules)', async () => {
    const editor = await mountEditor();

    expect(editor.can().toggleHeading({ level: 3 })).toBe(true);
    expect(editor.extensionManager.extensions.map((extension) => extension.name)).toEqual(
      expect.arrayContaining(['heading', 'code', 'codeBlock', 'bulletList', 'horizontalRule']),
    );
    const heading = editor.extensionManager.extensions.find(
      (extension) => extension.name === 'heading',
    );
    expect(heading?.options).toMatchObject({ levels: [1, 2, 3] });
  });

  test('works without an onChange handler', async () => {
    const editor = await mountEditor();

    act(() => {
      editor.chain().focus('end').insertContent('!').run();
    });

    expect(editor.getText()).toBe('Hello!');
  });
});
