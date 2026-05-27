import { create } from 'zustand';
import type {
  Coin,
  ConnectionStatus,
  OrderbookSnapshot,
  Position,
  PriceDirection,
} from '../types/trading';

interface TradingState {
  orderbook:        OrderbookSnapshot;
  positions:        Position[];
  connectionStatus: ConnectionStatus;
  priceDirection:   PriceDirection;
  selectedCoin:     Coin;
}

interface TradingActions {
  setOrderbook:        (snap: OrderbookSnapshot) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  setSelectedCoin:     (coin: Coin) => void;
}

const EMPTY_ORDERBOOK: OrderbookSnapshot = {
  bids: [], asks: [], lastPrice: 0, prevPrice: 0,
  spread: 0, spreadPct: 0, coin: 'BTC', timestamp: 0,
};

const MOCK_POSITIONS: Position[] = [
  {
    coin: 'BTC', side: 'long', size: 0.5,
    entryPrice: 64_500, markPrice: 64_500,
    pnl: 0, pnlPct: 0, liquidationPrice: 51_000, leverage: 5,
  },
  {
    coin: 'ETH', side: 'short', size: 2,
    entryPrice: 3_400, markPrice: 3_400,
    pnl: 0, pnlPct: 0, liquidationPrice: 4_500, leverage: 3,
  },
];

export const useTradingStore = create<TradingState & TradingActions>((set, get) => ({
  orderbook:        EMPTY_ORDERBOOK,
  positions:        MOCK_POSITIONS,
  connectionStatus: 'connecting',
  priceDirection:   'neutral',
  selectedCoin:     'BTC',

  setOrderbook: (snap) => {
    const prev = get().orderbook;
    const priceDirection: PriceDirection =
      snap.lastPrice > prev.lastPrice ? 'up'   :
      snap.lastPrice < prev.lastPrice ? 'down' : 'neutral';
    set({ orderbook: snap, priceDirection });
  },

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setSelectedCoin:     (selectedCoin)     => set({ selectedCoin }),
}));
