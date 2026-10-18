import { Fragment, type ReactNode } from 'react';

// Renders the small markdown subset the tutor uses (paragraphs, bullet/numbered lists, **bold**, `code`) without innerHTML.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={key}>{part.slice(1, -1)}</code>;
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function RichInline({ text }: { readonly text: string }) {
  return <>{renderInline(text, 'i')}</>;
}

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

export function RichText({ text }: { readonly text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((line) => line.trim().length > 0);
        if (lines.length > 0 && lines.every((line) => BULLET.test(line))) {
          return (
            <ul key={bi}>
              {lines.map((line, li) => (
                <li key={li}>{renderInline(line.replace(BULLET, ''), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        if (lines.length > 0 && lines.every((line) => NUMBERED.test(line))) {
          return (
            <ol key={bi}>
              {lines.map((line, li) => (
                <li key={li}>{renderInline(line.replace(NUMBERED, ''), `${bi}-${li}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={bi}>
            {lines.map((line, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(line.replace(/^#{1,6}\s+/, ''), `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
