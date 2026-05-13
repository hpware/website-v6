"use client";

import { Highlight, themes } from "prism-react-renderer";

export default function CodeRender({
  code,
  type,
}: {
  code: string;
  type?: string;
}) {
  return (
    <div className="my-4 max-h-full max-w-full overflow-hidden rounded-lg">
      <div className="flex items-center justify-between bg-sky-200 px-4 py-2 dark:bg-gray-800">
        <span className="font-mono text-sm text-gray-800 dark:text-gray-200">
          {type || "text"}
        </span>
      </div>
      <Highlight
        theme={themes.nightOwl}
        code={code}
        language={type || "text"}
      >
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre className="overflow-auto bg-gray-900 p-4" style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="mr-4 select-none text-gray-500">{i + 1}</span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
