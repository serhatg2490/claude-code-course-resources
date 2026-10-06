// @vitest-environment jsdom
import { render } from '@testing-library/react';
import type { JSONContent } from '@tiptap/react';
import { describe, expect, it } from 'vitest';

import { NoteRenderer } from '@/components/note-renderer';

function renderDoc(...content: JSONContent[]) {
  const { container } = render(<NoteRenderer content={{ type: 'doc', content }} />);
  return container.querySelector('.rich-text')!;
}

const text = (value: string, marks?: JSONContent['marks']): JSONContent => ({
  type: 'text',
  text: value,
  marks,
});

describe('NoteRenderer', () => {
  it('renders paragraphs, horizontal rules and hard breaks', () => {
    const root = renderDoc(
      { type: 'paragraph', content: [text('Line 1'), { type: 'hardBreak' }, text('Line 2')] },
      { type: 'horizontalRule' },
    );
    expect(root.innerHTML).toBe('<p><span>Line 1</span><br><span>Line 2</span></p><hr>');
  });

  it.each([
    [1, 'H1'],
    [3, 'H3'],
    [0, 'H1'],
    [6, 'H3'],
    [undefined, 'H1'],
  ])('renders heading level %s as %s', (level, tag) => {
    const root = renderDoc({ type: 'heading', attrs: { level }, content: [text('Title')] });
    expect(root.firstElementChild?.tagName).toBe(tag);
  });

  it('renders bullet and ordered lists', () => {
    const item = (value: string): JSONContent => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [text(value)] }],
    });
    const root = renderDoc(
      { type: 'bulletList', content: [item('a'), item('b')] },
      { type: 'orderedList', attrs: { start: 3 }, content: [item('c')] },
    );
    expect(root.querySelectorAll('ul > li')).toHaveLength(2);
    expect(root.querySelector('ol')?.getAttribute('start')).toBe('3');
  });

  it('renders code blocks as plain text, without interpreting HTML', () => {
    const root = renderDoc({
      type: 'codeBlock',
      content: [text('const x = 1;\n'), text('<script>alert(1)</script>')],
    });
    expect(root.querySelector('pre > code')?.textContent).toBe(
      'const x = 1;\n<script>alert(1)</script>',
    );
    expect(root.querySelector('script')).toBeNull();
  });

  it('applies text marks', () => {
    const root = renderDoc({
      type: 'paragraph',
      content: [
        text('b', [{ type: 'bold' }]),
        text('i', [{ type: 'italic' }]),
        text('c', [{ type: 'code' }]),
        text('s', [{ type: 'strike' }]),
        text('both', [{ type: 'bold' }, { type: 'italic' }]),
      ],
    });
    expect(root.querySelector('strong')?.textContent).toBe('b');
    expect(root.querySelector('em')?.textContent).toBe('i');
    expect(root.querySelector('code')?.textContent).toBe('c');
    expect(root.querySelector('s')?.textContent).toBe('s');
    expect(root.querySelector('em > strong')?.textContent).toBe('both');
  });

  it('degrades unknown nodes to their children and drops empty ones', () => {
    const root = renderDoc(
      { type: 'callout', content: [{ type: 'paragraph', content: [text('inside')] }] },
      { type: 'mystery' },
    );
    expect(root.innerHTML).toBe('<div><p><span>inside</span></p></div>');
  });
});
