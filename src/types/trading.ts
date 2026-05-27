// ─── Discriminated union: every order state carries only its own fields ─────────
export type OrderStatus =
  | { status: 'pending';   submittedAt: number }
  | { status: 'filled';    filledAt: number; fillPrice: number }
  | { status: 'cancelled'; cancelledAt: number; reason: string }
  | { status: 'partial';   filledQty: number; remainingQty: number };

// ─── Template literal type for trading pairs ─────────────────────────────────
export type Coin = 'BTC' | 'ETH' | 'SOL';
export type TradingPair = `${Coin}-PERP`;

// ─── Core orderbook types ─────────────────────────────────────────────────────
export interface PriceLevel {
  price:     number;
  size:      number;
  total:     number;   // cumulative size from best price outward
  depth:     number;   // percentage of maxTotal — used for depth bar width
  numOrders: number;
}

export interface OrderbookSnapshot {
  bids:      PriceLevel[];
  asks:      PriceLevel[];
  lastPrice: number;
  prevPrice: number;
  spread:    number;
  spreadPct: number;
  coin:      Coin;
  timestamp: number;
}

export type PriceDirection = 'up' | 'down' | 'neutral';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// ─── Position (perpetuals) ────────────────────────────────────────────────────
export interface Position {
  coin:              Coin;
  side:              'long' | 'short';
  size:              number;
  entryPrice:        number;
  markPrice:         number;
  pnl:               number;
  pnlPct:            number;
  liquidationPrice:  number;
  leverage:          number;
}

// ─── Hyperliquid WebSocket wire format ────────────────────────────────────────
export interface HyperliquidLevel {
  px: string;  // price as string (arbitrary precision)
  sz: string;  // size as string
  n:  number;  // number of orders at this level
}

export interface HyperliquidL2Data {
  coin:   string;
  levels: [HyperliquidLevel[], HyperliquidLevel[]]; // [bids, asks]
  time:   number;
}

// ─── Generic WS response envelope ────────────────────────────────────────────
export interface WSResponse<T> {
  channel: string;
  data:    T;
}
