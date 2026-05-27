import { useEffect, useRef } from 'react';
import { useTradingStore } from '../store/tradingStore';
import type { Coin, HyperliquidL2Data, HyperliquidLevel, OrderbookSnapshot, PriceLevel, WSResponse } from '../types/trading';
import { getSimulator } from '../utils/simulator';

const HL_WS_URL        = 'wss://api.hyperliquid.xyz/ws';
const MAX_LEVELS       = 20;
const CONNECT_TIMEOUT  = 5_000;  // fall back to sim if no open within 5 s
const RECONNECT_DELAY  = 3_000;

function parseLevels(raw: HyperliquidLevel[]): PriceLevel[] {
  let cumulative = 0;
  const sliced   = raw.slice(0, MAX_LEVELS);
  const maxTotal = sliced.reduce((acc, l) => acc + parseFloat(l.sz), 0);

  return sliced.map(({ px, sz, n }) => {
    const size   = parseFloat(sz);
    cumulative  += size;
    return {
      price:     parseFloat(px),
      size,
      total:     cumulative,
      depth:     maxTotal > 0 ? (cumulative / maxTotal) * 100 : 0,
      numOrders: n,
    };
  });
}

export function useWebSocket(coin: Coin): void {
  const wsRef           = useRef<WebSocket | null>(null);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simUnsubRef     = useRef<(() => void) | null>(null);
  const lastPriceRef    = useRef(0);

  const { setOrderbook, setConnectionStatus } = useTradingStore();

  useEffect(() => {
    let destroyed = false;

    // ── Simulation fallback ────────────────────────────────────────────────
    function startSim(): void {
      if (simUnsubRef.current || destroyed) return;
      setConnectionStatus('connected');
      simUnsubRef.current = getSimulator(coin).subscribe((snap) => {
        if (!destroyed) {
          lastPriceRef.current = snap.lastPrice;
          setOrderbook(snap);
        }
      });
    }

    // ── Real WebSocket ────────────────────────────────────────────────────
    setConnectionStatus('connecting');
    const ws      = new WebSocket(HL_WS_URL);
    wsRef.current = ws;
    let didConnect = false;

    // If the socket doesn't open fast enough, fall back to simulation
    const connectTimeout = setTimeout(() => {
      if (!didConnect) {
        ws.close();
        startSim();
      }
    }, CONNECT_TIMEOUT);

    ws.onopen = () => {
      didConnect = true;
      clearTimeout(connectTimeout);
      if (destroyed) { ws.close(); return; }
      setConnectionStatus('connected');
      ws.send(JSON.stringify({
        method: 'subscribe',
        subscription: { type: 'l2Book', coin },
      }));
    };

    ws.onmessage = (evt: MessageEvent<string>) => {
      if (destroyed) return;
      try {
        const msg = JSON.parse(evt.data) as WSResponse<HyperliquidL2Data>;
        if (msg.channel !== 'l2Book') return;

        const [rawBids, rawAsks] = msg.data.levels;
        const bids     = parseLevels(rawBids);
        const asks     = parseLevels(rawAsks);
        const bestBid  = bids[0]?.price  ?? 0;
        const bestAsk  = asks[0]?.price  ?? 0;
        const last     = (bestBid + bestAsk) / 2;
        const spread   = bestAsk - bestBid;

        const snap: OrderbookSnapshot = {
          bids, asks,
          lastPrice:  last,
          prevPrice:  lastPriceRef.current,
          spread,
          spreadPct:  bestAsk > 0 ? (spread / bestAsk) * 100 : 0,
          coin,
          timestamp:  msg.data.time,
        };
        lastPriceRef.current = last;
        setOrderbook(snap);
      } catch { /* malformed frame — ignore */ }
    };

    ws.onerror = () => {
      clearTimeout(connectTimeout);
      if (!didConnect) startSim();
    };

    ws.onclose = () => {
      clearTimeout(connectTimeout);
      if (destroyed) return;
      if (didConnect) {
        // Legitimate disconnect — attempt reconnect
        setConnectionStatus('disconnected');
        reconnectRef.current = setTimeout(() => {
          simUnsubRef.current?.();
          simUnsubRef.current = null;
        }, RECONNECT_DELAY);
      } else {
        startSim();
      }
    };

    return () => {
      destroyed = true;
      clearTimeout(connectTimeout);
      if (reconnectRef.current !== null) clearTimeout(reconnectRef.current);
      ws.close();
      wsRef.current = null;
      simUnsubRef.current?.();
      simUnsubRef.current = null;
    };
  }, [coin, setConnectionStatus, setOrderbook]);
}
