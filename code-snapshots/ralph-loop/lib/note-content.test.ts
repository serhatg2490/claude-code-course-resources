import { describe, expect, test } from 'bun:test';
import { isTipTapDocJson, parseNoteContent } from './note-content';
import { EMPTY_DOC_JSON } from './notes';

describe('parseNoteContent', () => {
  test('parses the empty document', () => {
    expect(parseNoteContent(EMPTY_DOC_JSON)).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  });

  test('keeps attrs, marks and nested content', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hi' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Bold', marks: [{ type: 'bold' }] }] },
      ],
    };
    expect(parseNoteContent(JSON.stringify(doc))).toEqual(doc);
  });

  test('accepts a doc without content', () => {
    expect(parseNoteContent('{"type":"doc"}')).toEqual({ type: 'doc' });
  });

  test.each([
    ['invalid JSON', '{not json'],
    ['an empty string', ''],
    ['a non-doc root', '{"type":"paragraph"}'],
    ['a JSON array', '[]'],
    ['JSON null', 'null'],
    ['children without a type', '{"type":"doc","content":[{"text":"x"}]}'],
  ])('returns null for %s', (_label, json) => {
    expect(parseNoteContent(json)).toBeNull();
  });
});

describe('isTipTapDocJson', () => {
  test('tells documents from anything else', () => {
    expect(isTipTapDocJson(EMPTY_DOC_JSON)).toBe(true);
    expect(isTipTapDocJson('{"type":"paragraph"}')).toBe(false);
  });
});
