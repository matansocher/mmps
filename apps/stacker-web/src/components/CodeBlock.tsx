import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Props = { code: string; language?: string };

export function CodeBlock({ code, language = 'javascript' }: Props) {
  return (
    <div className="rounded-lg overflow-hidden my-3 text-sm">
      <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem' }}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
