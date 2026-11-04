/** A first fence line like "ts" or "python" names the language; it is not code. */
const LANGUAGE_LINE = /^[\w+#.-]{1,20}\n/;

/**
 * A discussion post: plain text where ``` fences mark code blocks. React
 * escapes everything, so a post can never inject HTML. Code stays
 * left-to-right and scrolls sideways inside Arabic and Hebrew pages.
 */
export function PostBody({ text }: { text: string }) {
  const parts = text.split('```');
  return (
    <div className="flex flex-col gap-3 text-ink">
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const code = part.replace(LANGUAGE_LINE, '').replace(/^\n|\n$/g, '');
          return (
            <pre
              key={index}
              dir="ltr"
              className="overflow-x-auto rounded-[var(--radius-control)] bg-ink p-3 text-start font-mono text-sm text-ivory"
            >
              <code>{code}</code>
            </pre>
          );
        }
        const prose = part.trim();
        return prose ? (
          <p key={index} className="break-words whitespace-pre-line">
            {prose}
          </p>
        ) : null;
      })}
    </div>
  );
}
