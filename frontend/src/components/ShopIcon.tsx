import type { SVGProps } from 'react';

const paths = {
  arrow: 'M7 17 17 7M7 7h10v10',
  bag: 'M5 7h14l1 14H4L5 7Zm3 1V6a4 4 0 0 1 8 0v2',
  store:
    'M3 10v11h18V10M2 10l2-7h16l2 7M2 10a3 3 0 0 0 5 2 3 3 0 0 0 5 0 3 3 0 0 0 5 0 3 3 0 0 0 5-2M9 21v-7h6v7',
  spark: 'm12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z',
  check: 'm5 12 4 4L19 6',
};

export function ShopIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
