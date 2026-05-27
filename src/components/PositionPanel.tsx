import { useMemo } from 'react';
import { useTradingStore } from '../store/tradingStore';
import type { Position } from '../types/trading';

function computePnl(pos: Position, markPrice: number): Pick<Position, 'markPrice' | 'pnl' | 'pnlPct'> {
  const pnl    = pos.side === 'long'
    ? (markPrice - pos.entryPrice) * pos.size
    : (pos.entryPrice - markPrice) * pos.size;
  const pnlPct = (pnl / (pos.entryPrice * pos.size)) * 100;
  return { markPrice, pnl, pnlPct };
}

export function PositionPanel() {
  const { positions, orderbook } = useTradingStore();

  // Inject live mark price for whichever coin is in the orderbook
  const livePositions = useMemo(
    () =>
      positions.map((pos) => {
        const markPrice = pos.coin === orderbook.coin ? orderbook.lastPrice : pos.markPrice;
        return { ...pos, ...computePnl(pos, markPrice > 0 ? markPrice : pos.entryPrice) };
      }),
    [positions, orderbook],
  );

  return (
    <div className="position-panel">
      <h2 className="position-panel__title">Open Positions</h2>

      {livePositions.length === 0 ? (
        <p className="position-panel__empty">No open positions</p>
      ) : (
        <ul className="position-panel__list">
          {livePositions.map((pos) => (
            <li key={pos.coin} className="position-card">
              <div className="position-card__header">
                <span className="position-card__pair">{pos.coin}-PERP</span>
                <span className={`position-card__side position-card__side--${pos.side}`}>
                  {pos.side.toUpperCase()} {pos.leverage}×
                </span>
              </div>

              <div className="position-card__body">
                <Row label="Size"   value={`${pos.size} ${pos.coin}`} />
                <Row label="Entry"  value={`$${pos.entryPrice.toLocaleString()}`} />
                <Row
                  label="Mark"
                  value={`$${pos.markPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                />
                <Row
                  label="Liq."
                  value={`$${pos.liquidationPrice.toLocaleString()}`}
                  className="position-card__liq"
                />
              </div>

              <div className={`position-card__pnl position-card__pnl--${pos.pnl >= 0 ? 'profit' : 'loss'}`}>
                {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                {' '}
                <span className="position-card__pnl-pct">
                  ({pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct.toFixed(2)}%)
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="position-card__row">
      <span className="position-card__row-label">{label}</span>
      <span className={`position-card__row-value ${className ?? ''}`}>{value}</span>
    </div>
  );
}
