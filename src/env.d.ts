/// <reference types="astro/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

import type React from "react";
import type { JSX as ReactJSX } from "react";

declare global {
  namespace App {
    interface Locals {
      /** Admin panel toast for this page (see src/middleware.ts). */
      toast?: string;
    }
  }

  namespace JSX {
    type ElementType = ReactJSX.ElementType;
    type Element = ReactJSX.Element;
    type ElementClass = ReactJSX.ElementClass;
    type ElementAttributesProperty = ReactJSX.ElementAttributesProperty;
    type ElementChildrenAttribute = ReactJSX.ElementChildrenAttribute;
    type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<C, P>;

    interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends ReactJSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends React.JSX.IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
