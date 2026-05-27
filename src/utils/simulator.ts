import type { Coin, OrderbookSnapshot, PriceLevel } from '../types/trading';

// satisfies validates shape without widening the type
const BASE_PRICES = {
  BTC: 67_000,
  ETH: 3_200,
  SOL: 145,
} satisfies Record<Coin, number>;

const TICK_SIZES = {
  BTC: 0.1,
  ETH: 0.01,
  SOL: 0.001,
} satisfies Record<Coin, number>;

export class OrderbookSimulator {
  private midPrice:   number;
  private prevPrice:  number;
  private velocity  = 0;
  private timer:    ReturnType<typeof setInterval> | null = null;
  private readonly subscribers = new Set<(snap: OrderbookSnapshot) => void>();

  constructor(private readonly coin: Coin) {
    this.midPrice  = BASE_PRICES[coin];
    this.prevPrice = this.midPrice;
  }

  subscribe(cb: (snap: OrderbookSnapshot) => void): () => void {
    this.subscribers.add(cb);
    if (this.subscribers.size === 1) this.start();
    return () => {
      this.subscribers.delete(cb);
      if (this.subscribers.size === 0) this.stop();
    };
  }

  private start(): void {
    this.timer = setInterval(() => this.tick(), 400);
  }

  private stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const base = BASE_PRICES[this.coin];
    // Random walk with mean reversion so price stays realistic
    this.velocity += (Math.random() - 0.5) * base * 0.0003;
    this.velocity *= 0.82;                                     // friction
    this.velocity += (base - this.midPrice) * 0.004;          // mean reversion
    this.prevPrice  = this.midPrice;
    this.midPrice  += this.velocity;

    const snap = this.buildSnapshot();
    for (const cb of this.subscribers) cb(snap);
  }

  private buildSnapshot(): OrderbookSnapshot {
    const tick   = TICK_SIZES[this.coin];
    const spread = tick * (2 + Math.random() * 4);
    const bestBid = Math.round((this.midPrice - spread / 2) / tick) * tick;
    const bestAsk = bestBid + spread;
    const bids    = this.buildLevels(bestBid, -tick, 20);
    const asks    = this.buildLevels(bestAsk,  tick, 20);
    const last    = (bestBid + bestAsk) / 2;

    return {
      bids, asks,
      lastPrice:  last,
      prevPrice:  this.prevPrice,
      spread,
      spreadPct:  (spread / bestAsk) * 100,
      coin:       this.coin,
      timestamp:  Date.now(),
    };
  }

  private buildLevels(startPrice: number, step: number, count: number): PriceLevel[] {
    let cumulative = 0;
    const raw: Omit<PriceLevel, 'depth'>[] = [];

    for (let i = 0; i < count; i++) {
      const price = startPrice + step * i;
      // Liquidity thins out further from the best price
      const size  = parseFloat(((0.05 + Math.random() * 1.5) / (1 + i * 0.15)).toFixed(4));
      cumulative += size;
      raw.push({ price, size, total: cumulative, numOrders: Math.ceil(Math.random() * 8) });
    }

    const maxTotal = cumulative;
    return raw.map(l => ({ ...l, depth: maxTotal > 0 ? (l.total / maxTotal) * 100 : 0 }));
  }
}

// Singleton per coin so components share the same stream
const cache = new Map<Coin, OrderbookSimulator>();

export function getSimulator(coin: Coin): OrderbookSimulator {
  let sim = cache.get(coin);
  if (!sim) {
    sim = new OrderbookSimulator(coin);
    cache.set(coin, sim);
  }
  return sim;
}
