import { useMemo } from 'react';
import { useTradingStore } from '../store/tradingStore';
import { OrderRow } from './OrderRow';
import { PriceTicker } from './PriceTicker';

const DISPLAY_LEVELS = 16;

export function Orderbook() {
  const { orderbook } = useTradingStore();
  const { bids, asks } = orderbook;

  // Slice is cheap but memoised so downstream memo(OrderRow) sees stable identity
  const displayBids = useMemo(() => bids.slice(0, DISPLAY_LEVELS), [bids]);
  const displayAsks = useMemo(() => asks.slice(0, DISPLAY_LEVELS), [asks]);

  const maxBidTotal = useMemo(
    () => displayBids[displayBids.length - 1]?.total ?? 0,
    [displayBids],
  );
  const maxAskTotal = useMemo(
    () => displayAsks[displayAsks.length - 1]?.total ?? 0,
    [displayAsks],
  );

  const { spread, spreadPct } = orderbook;

  return (
    <div className="orderbook">
      <div className="orderbook__header">
        <span>Size ({orderbook.coin})</span>
        <span>Price (USD)</span>
        <span>Total</span>
      </div>

      {/*
        flex-direction: column-reverse on .orderbook__asks means:
          DOM order  → asks[0] (best ask) first
          Visual order → asks[0] at BOTTOM, closest to the mid price

        This way React keys 0..N always correspond to the same price rank,
        so per-component price-change detection (and WAAPI flash) is stable.
      */}
      <div className="orderbook__asks">
        {displayAsks.map((level, i) => (
          <OrderRow key={i} level={level} side="ask" maxTotal={maxAskTotal} />
        ))}
      </div>

      <PriceTicker />

      <div className="orderbook__spread">
        <span className="orderbook__spread-label">Spread</span>
        <span className="orderbook__spread-value">
          {spread > 0 ? spread.toFixed(2) : '—'}
        </span>
        <span className="orderbook__spread-pct">
          {spreadPct > 0 ? `(${spreadPct.toFixed(3)}%)` : ''}
        </span>
      </div>

      <div className="orderbook__bids">
        {displayBids.map((level, i) => (
          <OrderRow key={i} level={level} side="bid" maxTotal={maxBidTotal} />
        ))}
      </div>
    </div>
  );
}
