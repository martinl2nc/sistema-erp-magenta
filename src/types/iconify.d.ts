import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type IconifyIconProps = DetailedHTMLProps<
  HTMLAttributes<HTMLElement> & {
    icon?: string;
    width?: string | number;
    height?: string | number;
    'stroke-width'?: string | number;
    class?: string;
    rotate?: string | number;
    flip?: string;
    inline?: boolean;
  },
  HTMLElement
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': IconifyIconProps;
    }
  }
}
