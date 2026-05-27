import { useEffect, useRef } from 'react';
import { useTradingStore } from '../store/tradingStore';

export function PriceTicker() {
  const { orderbook, priceDirection } = useTradingStore();
  const { lastPrice } = orderbook;
  const elRef       = useRef<HTMLSpanElement>(null);
  const prevRef     = useRef(lastPrice);

  useEffect(() => {
    const el = elRef.current;
    if (!el || lastPrice === prevRef.current) return;
    prevRef.current = lastPrice;

    el.getAnimations().forEach((a) => a.cancel());

    // Price ticker uses transform + color — these run on the compositor thread
    el.animate(
      [
        {
          color:     priceDirection === 'up' ? 'var(--color-up)' : 'var(--color-down)',
          transform: priceDirection === 'up' ? 'translateY(-3px)' : 'translateY(3px)',
        },
        { color: 'var(--color-text-primary)', transform: 'translateY(0)' },
      ],
      { duration: 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'none' },
    );
  }, [lastPrice, priceDirection]);

  const formatted = lastPrice > 0
    ? lastPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : '—';

  return (
    <div className="price-ticker">
      <span
        ref={elRef}
        className={`price-ticker__value price-ticker__value--${priceDirection}`}
        aria-live="polite"
        aria-label={`Current price ${formatted} USD`}
      >
        ${formatted}
      </span>
      <span className={`price-ticker__arrow price-ticker__arrow--${priceDirection}`}>
        {priceDirection === 'up' ? '▲' : priceDirection === 'down' ? '▼' : ''}
      </span>
    </div>
  );
}
