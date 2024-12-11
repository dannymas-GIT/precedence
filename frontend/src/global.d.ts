/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="@testing-library/jest-dom" />

declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
} 