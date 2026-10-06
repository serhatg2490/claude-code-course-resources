import type { JSONContent } from '@tiptap/react';
import type { ReactNode } from 'react';

type NoteRendererProps = {
  content: JSONContent;
};

/** Renders a stored TipTap document as plain JSX — no editor instance, no raw HTML. */
export function NoteRenderer({ content }: NoteRendererProps): React.JSX.Element {
  return <div className='rich-text'>{renderNode(content, 'root')}</div>;
}

function renderChildren(node: JSONContent): ReactNode {
  return node.content?.map((child, index) => renderNode(child, index));
}

function renderNode(node: JSONContent, key: React.Key): ReactNode {
  switch (node.type) {
    case 'doc':
      return renderChildren(node);
    case 'paragraph':
      return <p key={key}>{renderChildren(node)}</p>;
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 3);
      const Heading = `h${level}` as 'h1' | 'h2' | 'h3';
      return <Heading key={key}>{renderChildren(node)}</Heading>;
    }
    case 'bulletList':
      return <ul key={key}>{renderChildren(node)}</ul>;
    case 'orderedList':
      return (
        <ol key={key} start={Number(node.attrs?.start) || undefined}>
          {renderChildren(node)}
        </ol>
      );
    case 'listItem':
      return <li key={key}>{renderChildren(node)}</li>;
    case 'blockquote':
      return <blockquote key={key}>{renderChildren(node)}</blockquote>;
    case 'codeBlock':
      return (
        <pre key={key}>
          <code>{node.content?.map((child) => child.text ?? '').join('')}</code>
        </pre>
      );
    case 'horizontalRule':
      return <hr key={key} />;
    case 'hardBreak':
      return <br key={key} />;
    case 'text':
      return renderText(node, key);
    default:
      // Unknown node types degrade to their children rather than failing the page.
      return node.content ? <div key={key}>{renderChildren(node)}</div> : null;
  }
}

function renderText(node: JSONContent, key: React.Key): ReactNode {
  let output: ReactNode = node.text ?? '';
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'bold':
        output = <strong>{output}</strong>;
        break;
      case 'italic':
        output = <em>{output}</em>;
        break;
      case 'code':
        output = <code>{output}</code>;
        break;
      case 'strike':
        output = <s>{output}</s>;
        break;
    }
  }
  return <span key={key}>{output}</span>;
}
