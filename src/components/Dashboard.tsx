import { useTransition } from 'react';
import { useTradingStore } from '../store/tradingStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { Orderbook } from './Orderbook';
import { PositionPanel } from './PositionPanel';
import type { Coin, ConnectionStatus } from '../types/trading';

const COINS: Coin[] = ['BTC', 'ETH', 'SOL'];

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting:   'Connecting…',
  connected:    'Live',
  disconnected: 'Reconnecting…',
  error:        'Error',
};

export function Dashboard() {
  const { selectedCoin, connectionStatus, setSelectedCoin } = useTradingStore();

  // Coin switching is non-urgent — wrap in startTransition so the current
  // orderbook stays visible while the new stream initialises
  const [isPending, startTransition] = useTransition();

  useWebSocket(selectedCoin);

  function handleCoinChange(coin: Coin): void {
    startTransition(() => setSelectedCoin(coin));
  }

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__brand">
          <span className="dashboard__logo" aria-hidden>◆</span>
          <span className="dashboard__name">Hyperliquid Terminal</span>
        </div>

        {/* Coin selector */}
        <nav className="coin-selector" aria-label="Select market">
          {COINS.map((coin) => (
            <button
              key={coin}
              className={`coin-selector__btn ${coin === selectedCoin ? 'coin-selector__btn--active' : ''}`}
              onClick={() => handleCoinChange(coin)}
              disabled={isPending}
            >
              {coin}
            </button>
          ))}
        </nav>

        {/* Connection badge */}
        <div className={`connection-badge connection-badge--${connectionStatus}`} role="status">
          <span className="connection-badge__dot" />
          <span className="connection-badge__label">{STATUS_LABEL[connectionStatus]}</span>
        </div>
      </header>

      <main className="dashboard__main">
        <section className="dashboard__orderbook" aria-label="Order book">
          <Orderbook />
        </section>
        <section className="dashboard__positions" aria-label="Open positions">
          <PositionPanel />
        </section>
      </main>
    </div>
  );
}
