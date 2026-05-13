/// <reference types="astro/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

import type React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements extends React.JSX.IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
