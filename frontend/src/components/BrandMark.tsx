import type { ReactElement } from 'react';

/** What the mark needs. */
export interface BrandMarkProps {
  /**
   * Edge of the square it is drawn in, in pixels.
   * @default 28
   */
  size?: number;
}

/**
 * The site's mark: a ring over two kept rows — the molecule is asked for once
 * and the answer is what stays behind.
 *
 * Drawn here rather than taken from `SiteMark`, because the shared glyph set is
 * keyed by `SiteId` and this site is deliberately not one. The geometry is the
 * same as `public/favicon.svg`; change one and change the other.
 * @param props - How large to draw it.
 * @returns The mark.
 */
export function BrandMark(props: BrandMarkProps): ReactElement {
  const { size = 28 } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="presentation"
      style={{ display: 'block', flex: 'none' }}
    >
      <rect width="32" height="32" rx="7" fill="var(--brand)" />
      <polygon
        points="16,3.2 21.54,6.4 21.54,12.8 16,16 10.46,12.8 10.46,6.4"
        fill="var(--brand-alt)"
      />
      <rect
        x="6.4"
        y="19.2"
        width="19.2"
        height="3.4"
        rx="1.7"
        fill="#ffffff"
      />
      <rect
        x="6.4"
        y="24.4"
        width="19.2"
        height="3.4"
        rx="1.7"
        fill="#ffffff"
        opacity="0.55"
      />
    </svg>
  );
}
