import { memo } from 'react';
import { usePriceFlash } from '../hooks/usePriceFlash';
import type { PriceLevel } from '../types/trading';

interface Props {
  level:    PriceLevel;
  side:     'bid' | 'ask';
  maxTotal: number;
}

function priceDecimals(price: number): number {
  if (price >= 1_000) return 1;
  if (price >= 10)    return 2;
  return 4;
}

// memo prevents re-renders when the parent re-renders but this row's price/size didn't change
export const OrderRow = memo(function OrderRow({ level, side, maxTotal }: Props) {
  const { price, size, total } = level;
  const depth    = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  // Each row tracks its own price history for per-level flash direction
  const flashRef = usePriceFlash<HTMLDivElement>(price);

  const fmtPrice = price.toLocaleString('en-US', {
    minimumFractionDigits:  priceDecimals(price),
    maximumFractionDigits:  priceDecimals(price),
  });

  return (
    <div
      ref={flashRef}
      className={`order-row order-row--${side}`}
      // CSS custom property drives the depth bar width via ::before pseudo-element
      style={{ '--depth': `${depth.toFixed(1)}%` } as React.CSSProperties}
    >
      <span className="order-row__size">{size.toFixed(4)}</span>
      <span className={`order-row__price order-row__price--${side}`}>{fmtPrice}</span>
      <span className="order-row__total">{total.toFixed(4)}</span>
    </div>
  );
});
