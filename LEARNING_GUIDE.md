# Frontend Engineer — Complete Learning Guide
## Beginner → Expert: TypeScript · React · CSS · WAAPI · WebSocket · Zustand

> Every concept here maps directly to a file in `orderbook-ui`.
> When you see a file path like `src/types/trading.ts:12`, open that file.

---

## Table of Contents

1. [TypeScript](#1-typescript)
2. [React 18](#2-react-18)
3. [CSS — Modern & Advanced](#3-css)
4. [WAAPI — Web Animations API](#4-waapi)
5. [WebSocket](#5-websocket)
6. [Zustand](#6-zustand)
7. [Vite](#7-vite)
8. [Architecture — How Everything Connects](#8-architecture)
9. [Interview Cheat Sheet](#9-interview-cheat-sheet)

---

## 1. TypeScript

### 1.1 Beginner — What and Why

TypeScript is JavaScript with a static type system. You write `.ts` / `.tsx` files; the compiler checks them for mistakes before the code ever runs. The browser never sees TypeScript — it is compiled away to plain JavaScript.

**The core problem TypeScript solves:**

```javascript
// JavaScript — no safety
function formatPrice(price) {
  return price.toFixed(2); // crashes at runtime if price is undefined
}
formatPrice(undefined); // "TypeError: Cannot read properties of undefined"
```

```typescript
// TypeScript — compile-time safety
function formatPrice(price: number): string {
  return price.toFixed(2); // TypeScript guarantees price is always a number
}
formatPrice(undefined); // Error: Argument of type 'undefined' is not assignable to 'number'
```

**Basic types:**

```typescript
// Primitives
let price:  number  = 67_000;
let coin:   string  = 'BTC';
let active: boolean = true;
let missing: null   = null;
let pending: undefined = undefined;

// Arrays
let bids:  number[] = [67_000, 66_999, 66_998];
let coins: Array<string> = ['BTC', 'ETH', 'SOL']; // alternate syntax

// Tuples — fixed-length array with known types at each position
let entry: [number, number] = [67_000, 1.5]; // [price, size]

// Object shape — interface
interface PriceLevel {
  price:     number;
  size:      number;
  numOrders: number;
}

const level: PriceLevel = { price: 67_000, size: 1.5, numOrders: 3 };

// Optional property — may or may not be present
interface Config {
  debug?:   boolean; // optional
  timeout:  number;  // required
}

// Readonly — can't be modified after creation
interface ImmutableLevel {
  readonly price: number;
  readonly size:  number;
}
```

**Type inference — TypeScript usually figures it out without annotations:**

```typescript
const price  = 67_000;    // inferred: number
const coin   = 'BTC';     // inferred: string literal "BTC"
const levels = [1, 2, 3]; // inferred: number[]

// TypeScript infers the return type from the function body
function add(a: number, b: number) {
  return a + b; // return type inferred as number
}
```

---

### 1.2 Intermediate

**Union types — a value can be one of several types:**

```typescript
type Status = 'pending' | 'filled' | 'cancelled';
let s: Status = 'pending'; // only these three strings are valid

type NumberOrString = number | string;
function format(val: NumberOrString): string {
  return String(val);
}
```

**Type narrowing — TypeScript gets smarter inside conditionals:**

```typescript
function process(value: string | number): string {
  if (typeof value === 'string') {
    // TypeScript KNOWS: value is string in this block
    return value.toUpperCase();
  }
  // TypeScript KNOWS: value is number here
  return value.toFixed(2);
}
```

**Interfaces vs type aliases:**

```typescript
// interface — for object shapes; can be extended and merged
interface Animal {
  name: string;
}
interface Dog extends Animal {
  breed: string;
}

// type alias — for unions, intersections, primitives, tuples
type ID        = string | number;
type Pair<T>   = [T, T];
type Coin      = 'BTC' | 'ETH' | 'SOL';
```

**Generics — write code that works for any type:**

```typescript
// Without generics: only works for numbers
function first(arr: number[]): number | undefined {
  return arr[0];
}

// With generics: works for any array — TypeScript tracks what T is
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

first([1, 2, 3]);        // return type: number | undefined
first(['a', 'b', 'c']); // return type: string | undefined
first([]);               // return type: undefined (empty array)

// Generic constraint — T must have a price field
function highestPrice<T extends { price: number }>(items: T[]): T | undefined {
  return items.reduce((max, item) =>
    item.price > (max?.price ?? -Infinity) ? item : max,
    undefined as T | undefined
  );
}
```

**Used in `src/types/trading.ts`:**

```typescript
// WSResponse<T> — the same envelope wraps any payload type
interface WSResponse<T> {
  channel: string;
  data:    T;       // T is the payload — different per channel
}

// Usage:
const msg = JSON.parse(rawText) as WSResponse<HyperliquidL2Data>;
// TypeScript knows: msg.data has the shape of HyperliquidL2Data
```

---

### 1.3 Advanced

**Discriminated unions — the most powerful pattern for domain modeling:**

The key: every variant has a unique *literal* field (the discriminant). TypeScript uses it to narrow the type inside `switch`/`if`.

```typescript
// From src/types/trading.ts
type OrderStatus =
  | { status: 'pending';   submittedAt: number }
  | { status: 'filled';    filledAt: number; fillPrice: number }
  | { status: 'cancelled'; cancelledAt: number; reason: string }
  | { status: 'partial';   filledQty: number; remainingQty: number };

function describe(order: OrderStatus): string {
  switch (order.status) {
    case 'filled':
      // TypeScript KNOWS fillPrice exists here — can't access it on other variants
      return `Filled at $${order.fillPrice}`;
    case 'cancelled':
      return `Cancelled: ${order.reason}`;
    case 'partial':
      return `${order.filledQty} / ${order.filledQty + order.remainingQty} filled`;
    case 'pending':
      return 'Waiting…';
    // No default needed — TypeScript knows all cases are covered (exhaustive check)
  }
}
```

**Template literal types — types from string patterns:**

```typescript
type Coin        = 'BTC' | 'ETH' | 'SOL';
type TradingPair = `${Coin}-PERP`; // "BTC-PERP" | "ETH-PERP" | "SOL-PERP"

const pair: TradingPair = 'BTC-PERP';  // valid
const bad:  TradingPair = 'XRP-PERP';  // Error at compile time
```

**`satisfies` operator — validate shape without widening:**

```typescript
type Coin = 'BTC' | 'ETH' | 'SOL';

// Without satisfies — TypeScript widens to Record<string, number>
// You lose autocomplete on the specific keys
const prices = { BTC: 67_000, ETH: 3_200, SOL: 145 };
// prices type: { BTC: number; ETH: number; SOL: number }
// prices.BTC: number ✓

// With satisfies — TypeScript validates it IS Record<Coin, number>
// but still infers the specific literal type
const prices = {
  BTC: 67_000,
  ETH: 3_200,
  SOL: 145,
} satisfies Record<Coin, number>;
// ✓ validates it matches Record<Coin, number>
// ✓ still knows prices.BTC is number (not number | undefined)
// ✗ would error if you added 'XRP: 0' — not in Coin

// Used in src/utils/simulator.ts:
const BASE_PRICES = { BTC: 67_000, ETH: 3_200, SOL: 145 } satisfies Record<Coin, number>;
// BASE_PRICES['BTC'] is number — guaranteed, no undefined
```

**`noUncheckedIndexedAccess` — prevents the most common crash:**

In `tsconfig.json` we set `"noUncheckedIndexedAccess": true`. This makes array indexing return `T | undefined` instead of just `T`.

```typescript
// Without flag:
const bids: PriceLevel[] = [];
const best = bids[0].price; // TypeScript is happy but CRASHES at runtime if bids is empty

// With flag:
const best = bids[0]?.price ?? 0; // forced to handle the undefined case
// Pattern throughout src/hooks/useWebSocket.ts:
const bestBid = bids[0]?.price ?? 0;
const bestAsk = asks[0]?.price ?? 0;
```

**Utility types — built-in type transformations:**

```typescript
interface Position {
  coin:       Coin;
  side:       'long' | 'short';
  size:       number;
  entryPrice: number;
  markPrice:  number;
  pnl:        number;
}

type PartialPos  = Partial<Position>;          // all fields optional
type ReadonlyPos = Readonly<Position>;         // all fields readonly
type SubsetPos   = Pick<Position, 'coin' | 'side'>; // only these fields
type WithoutPnl  = Omit<Position, 'pnl'>;     // exclude pnl
type PnlUpdate   = Pick<Position, 'markPrice' | 'pnl' | 'pnlPct'>;

// NonNullable — removes null and undefined from a type
type SafePrice = NonNullable<number | null | undefined>; // just number

// ReturnType — extract what a function returns
type StoreState = ReturnType<typeof useTradingStore.getState>;
```

**Conditional types — types that branch based on other types:**

```typescript
// If T is a string, return 'text', otherwise 'number'
type InputType<T> = T extends string ? 'text' : 'number';

// Infer — extract a type from another type
type UnpackArray<T> = T extends Array<infer Item> ? Item : T;
type NumberItem = UnpackArray<number[]>; // number
type StringItem = UnpackArray<string[]>; // string
type Plain      = UnpackArray<boolean>;  // boolean (not an array)
```

**Mapped types — transform every field:**

```typescript
// Make every field nullable
type Nullable<T> = { [K in keyof T]: T[K] | null };

// Make every field a getter function
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
// { getPrice: () => number; getSize: () => number; ... }
```

---

## 2. React 18

### 2.1 Beginner

**React's core idea:** UI = f(state). You describe what the UI should look like as a pure function of your data. React figures out the minimal DOM changes needed when data changes.

**Component — a function returning JSX:**

```tsx
// JSX looks like HTML but is JavaScript
// Every HTML attribute becomes camelCase: class → className, for → htmlFor
function PriceCard({ coin, price }: { coin: string; price: number }) {
  return (
    <div className="card">
      <h2>{coin}</h2>
      <p>${price.toLocaleString()}</p>
    </div>
  );
}

// Usage: <PriceCard coin="BTC" price={67000} />
```

**`useState` — track changing values:**

```tsx
import { useState } from 'react';

function Counter() {
  // Returns [currentValue, setterFunction]
  // Initial value: 0
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      {/* Functional update — preferred when new value depends on old */}
      <button onClick={() => setCount(prev => prev + 1)}>+</button>
    </div>
  );
}
```

**`useEffect` — side effects (timers, subscriptions, fetch):**

```tsx
import { useEffect, useState } from 'react';

function LivePrice({ coin }: { coin: string }) {
  const [price, setPrice] = useState(0);

  useEffect(() => {
    // Runs AFTER the component renders
    const id = setInterval(() => {
      setPrice(prev => prev + Math.random() * 10 - 5);
    }, 1_000);

    // Cleanup: runs when component unmounts, OR before effect re-runs
    return () => clearInterval(id);

  }, [coin]); // Dependency array: re-run effect when `coin` changes

  return <p>{coin}: ${price.toFixed(2)}</p>;
}
```

**Dependency array rules:**
- `[]` — run once after mount, cleanup on unmount
- `[dep1, dep2]` — run when dep1 or dep2 changes
- omitted — run after every render (rarely correct)

---

### 2.2 Intermediate

**`useRef` — a mutable box that survives re-renders without causing them:**

```tsx
import { useRef, useEffect } from 'react';

// Use 1: DOM reference
function AutoFocus() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus(); // safe optional chaining
  }, []);

  return <input ref={inputRef} placeholder="Auto-focused" />;
}

// Use 2: Persisting a value without re-rendering
function WebSocketExample() {
  const wsRef       = useRef<WebSocket | null>(null);
  const lastPrice   = useRef(0);

  // wsRef.current holds the socket across renders
  // Changing it does NOT trigger a re-render (unlike useState)

  useEffect(() => {
    const ws = new WebSocket('wss://...');
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      lastPrice.current = JSON.parse(evt.data).price;
      // No re-render triggered — just storing for later use
    };
    return () => ws.close();
  }, []);
}
```

Two `useRef` uses in `src/hooks/useWebSocket.ts`:
- `wsRef` — holds the WebSocket instance so cleanup can close it
- `lastPriceRef` — tracks previous price for direction comparison without re-rendering

**Custom hooks — extract reusable stateful logic into a function:**

```typescript
// Convention: function name starts with "use"
// Can use any other hooks inside

function usePriceFlash<T extends HTMLElement>(price: number): React.RefObject<T> {
  const ref     = useRef<T>(null);
  const prevRef = useRef(price);

  useEffect(() => {
    const el = ref.current;
    if (!el || price === prevRef.current) return;
    prevRef.current = price;
    el.animate([{ backgroundColor: 'green' }, { backgroundColor: 'transparent' }], 500);
  }, [price]);

  return ref;
}

// Used in any component:
function OrderRow({ price }: { price: number }) {
  const flashRef = usePriceFlash<HTMLDivElement>(price);
  return <div ref={flashRef}>${price}</div>;
}
```

**Conditional rendering patterns:**

```tsx
// Short-circuit: render only if truthy
{isConnected && <span>Live</span>}

// Ternary: render one of two options
{isConnected ? <span>Live</span> : <span>Offline</span>}

// Early return for loading state
function Orderbook({ data }: { data: Level[] | null }) {
  if (!data) return <p>Loading…</p>;
  return <div>{data.map(level => <Row key={level.price} level={level} />)}</div>;
}
```

**Lists and keys:**

```tsx
// key tells React which element is which when the list changes
// Stable, unique keys = correct animations and state preservation
{displayBids.map((level, i) => (
  <OrderRow
    key={i}       // we key by index because index 0 ALWAYS = best bid
    level={level}
    side="bid"
  />
))}
```

---

### 2.3 Advanced

**`memo` — skip re-renders when props haven't changed:**

```tsx
import { memo } from 'react';

// Without memo: re-renders on every parent render (every 400ms from WebSocket)
// With memo: React shallow-compares props; skips if equal

export const OrderRow = memo(function OrderRow({ level, side, maxTotal }: Props) {
  // This function body only runs when level, side, or maxTotal actually changes
  return <div>...</div>;
});
```

When `memo` helps:
1. The component renders frequently (our rows: ~2.5/sec)
2. Most re-renders are with the same props (only the changed price level differs)
3. Rendering is non-trivial (WAAPI setup, DOM manipulation)

**`useMemo` — memoize expensive computations:**

```typescript
// Without useMemo: new array created every 400ms
const displayBids = bids.slice(0, 16);

// With useMemo: same array reference if bids reference is unchanged
const displayBids = useMemo(() => bids.slice(0, 16), [bids]);
```

Why reference stability matters: if `displayBids` is a new reference every render, `memo(OrderRow)` breaks — the `level` prop object is a different reference (even if the values are identical), so all 16 rows re-render unnecessarily.

**`useReducer` — for complex state with many transitions:**

```typescript
// State machine pattern — used when multiple actions can update state
type Action =
  | { type: 'SET_COIN';    coin: Coin }
  | { type: 'TOGGLE_DEPTH' }
  | { type: 'SET_LEVELS';  levels: number };

interface UIState {
  selectedCoin: Coin;
  showDepth:    boolean;
  numLevels:    number;
}

function reducer(state: UIState, action: Action): UIState {
  switch (action.type) {
    case 'SET_COIN':    return { ...state, selectedCoin: action.coin };
    case 'TOGGLE_DEPTH': return { ...state, showDepth: !state.showDepth };
    case 'SET_LEVELS':  return { ...state, numLevels: action.levels };
  }
}

// const [state, dispatch] = useReducer(reducer, initialState);
// dispatch({ type: 'SET_COIN', coin: 'ETH' });
```

`useReducer` over `useState` when:
- Multiple related state values need to change together
- Next state depends on previous state in complex ways
- You want a clear audit trail of what changed and why

**`useTransition` — mark state updates as non-urgent:**

```typescript
// In src/components/Dashboard.tsx
const [isPending, startTransition] = useTransition();

function handleCoinChange(coin: Coin): void {
  // Coin switch triggers WS reconnect + full orderbook reset
  // Mark as non-urgent: React can defer it if a more urgent update arrives
  startTransition(() => setSelectedCoin(coin));
}
```

React 18's concurrent model lets it interrupt low-priority updates. Without `startTransition`, switching coins might momentarily blank the orderbook. With it, the current orderbook stays rendered while the new stream initialises.

---

### 2.4 Expert

**React reconciliation — how React decides what to update:**

React compares the new virtual DOM against the previous one (diffing). The algorithm:
1. If element type changed — unmount old, mount new
2. If `key` changed — treat as a different element
3. If props changed — update the existing DOM element

```
Previous render:          New render:
<div key="0" price={67000}>  →  <div key="0" price={67001}>
                                  ↑ Same key, same type → UPDATE (not remount)
                                  ↑ usePriceFlash's useEffect fires (price changed)
                                  ↑ WAAPI animation starts
```

**Why we key orderbook rows by index, not by price:**

```tsx
// Option A: key by price
{bids.map(level => <OrderRow key={level.price} ... />)}
// Problem: When prices shift, React UNMOUNTS the old component and MOUNTS a new one
// The ref is lost — WAAPI has no element to animate

// Option B: key by index (our choice)
{bids.map((level, i) => <OrderRow key={i} ... />)}
// Index 0 always = best bid component. Its ref stays.
// When bid[0].price changes, the SAME component gets new props
// → useEffect fires → WAAPI animates on the EXISTING element
```

**StrictMode double-invocation:**

In development, React 18 StrictMode calls every effect twice (mount → cleanup → mount again) to expose bugs.

```typescript
useEffect(() => {
  let destroyed = false;

  const ws = new WebSocket(url);
  ws.onmessage = (evt) => {
    if (!destroyed) setState(parse(evt.data)); // safe — won't fire after cleanup
  };

  return () => {
    destroyed = true; // set FIRST — synchronously
    ws.close();       // then close — onclose handler fires, but destroyed is true
  };
}, []);
```

Without `destroyed`, the second mount would create a second WebSocket while the first is still closing.

**Render performance mental model:**

```
State change (e.g., new orderbook from WebSocket)
  │
  ├─ Zustand notifies subscribers
  │
  ├─ Orderbook component scheduled to re-render
  │
  └─ React calls Orderbook() function
       │
       ├─ useMemo([bids]) → same reference? → skip recomputation
       │
       └─ returns JSX with 16 OrderRow children
            │
            ├─ key=0: props changed (price: 67000 → 67001)
            │   └─ memo ALLOWS re-render → useEffect fires → WAAPI
            │
            ├─ key=1: props same → memo BLOCKS re-render
            │
            └─ key=2..15: props same → memo BLOCKS re-render
```

Net result: only the rows with changed prices re-render. Typically 2–4 rows per tick.

---

## 3. CSS

### 3.1 Beginner

**The box model:**

```
Every element is a rectangle:

┌─────────────────────────────┐  ← margin (outside, transparent)
│  ┌───────────────────────┐  │  ← border
│  │  ┌─────────────────┐  │  │  ← padding (inside, inherits background)
│  │  │    CONTENT      │  │  │
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘

box-sizing: border-box  → width/height includes padding + border (the sane default)
box-sizing: content-box → width/height is content only (browser default, confusing)
```

Our reset (`global.css`): `*, *::before, *::after { box-sizing: border-box; }`

**Core selectors:**

```css
.class          { }   /* elements with class="class" */
#id             { }   /* element with id="id" */
div             { }   /* all <div> elements */
.parent .child  { }   /* .child anywhere inside .parent */
.parent > .child{ }   /* .child as DIRECT child of .parent only */
button:hover    { }   /* button while mouse is over it */
input:focus     { }   /* input while keyboard-focused */
:first-child    { }   /* element that is first child of its parent */
:last-child     { }   /* element that is last child */
:nth-child(2)   { }   /* second child */
::before        { }   /* generated pseudo-element before content */
::after         { }   /* generated pseudo-element after content */
```

**Flexbox — one-dimensional layout:**

```css
/* Parent: controls arrangement of children */
.container {
  display:         flex;
  flex-direction:  row;              /* row | column | row-reverse | column-reverse */
  justify-content: space-between;    /* main axis:  start|end|center|space-between|space-around */
  align-items:     center;           /* cross axis: stretch|start|end|center|baseline */
  gap:             16px;             /* space between items */
  flex-wrap:       wrap;             /* allow items to wrap to next line */
}

/* Child: controls self */
.item {
  flex:       1;         /* grow to fill available space (shorthand for grow/shrink/basis) */
  flex-grow:  1;         /* how much to grow relative to siblings */
  flex-shrink: 0;        /* prevent shrinking below min-content */
  flex-basis:  200px;    /* initial size before growing/shrinking */
  align-self:  flex-end; /* override parent's align-items for just this child */
}
```

**CSS Grid — two-dimensional layout:**

```css
.grid {
  display:               grid;
  grid-template-columns: 340px 1fr;  /* fixed left, flexible right */
  grid-template-rows:    auto 1fr;   /* header auto-height, body fills rest */
  gap:                   16px;
}

/* 1fr = one fraction of remaining space after fixed sizes are subtracted */
/* 340px 1fr 1fr = fixed left, two equal flexible columns */
/* repeat(3, 1fr) = three equal columns */
```

---

### 3.2 Intermediate

**CSS Custom Properties (variables):**

```css
/* Define on :root — available everywhere */
:root {
  --color-bid:  #00c96e;
  --color-ask:  #f03050;
  --sp-4:       1rem;
  --font-mono:  'JetBrains Mono', monospace;
}

/* Use with var() */
.price--bid { color: var(--color-bid); }
.card       { padding: var(--sp-4); }

/* Fallback value if the variable is undefined */
.depth-bar  { width: var(--depth, 0%); }

/* Override in a scope — affects all descendants */
.light-theme {
  --color-bid: #007a42;  /* darker green for light backgrounds */
}
```

**Why custom properties beat preprocessor variables (Sass, Less):**
- Sass variables are compiled away at build time — static, dead, gone
- CSS custom properties are **live** at runtime — you can change them from JavaScript:

```javascript
// Immediately updates every element using var(--color-bid)
document.documentElement.style.setProperty('--color-bid', '#new-color');
```

This powers our depth bars: JavaScript writes `--depth` per row, CSS reads it in the `::before` pseudo-element.

**The depth bar technique (`global.css`):**

```css
/* The row itself — no extra child element for the depth bar */
.order-row {
  position: relative; /* establishes positioning context for ::before */
}

/* CSS generates this element — zero extra HTML */
.order-row::before {
  content:  '';           /* required — even empty string */
  position: absolute;
  top:      0;
  height:   100%;
  width:    var(--depth, 0%);   /* ← set by JavaScript per row */
  transition: width 300ms ease; /* CSS handles the smooth animation */
  pointer-events: none;          /* doesn't block mouse events */
}

/* Different side for bids vs asks */
.order-row--bid::before { left:  0; background: rgba(0, 201, 110, 0.11); }
.order-row--ask::before { right: 0; background: rgba(240, 48,  80, 0.11); }
```

In React:
```tsx
<div
  className="order-row order-row--bid"
  style={{ '--depth': `${depth}%` } as React.CSSProperties}
>
```

**Transitions:**

```css
.button {
  background:  blue;
  transform:   scale(1);
  transition:  background 200ms ease,
               transform   150ms ease-out;
}
.button:hover {
  background:  navy;
  transform:   scale(1.02);
}
```

**Positioning:**

```css
.parent { position: relative; }  /* establishes positioning context */

.child  { position: absolute;    /* relative to nearest positioned ancestor */
          top:   0;
          right: 0; }

.fixed  { position: fixed;       /* relative to viewport — stays on screen */
          bottom: 20px;
          right:  20px; }

.sticky { position: sticky;      /* scrolls normally until it hits edge, then sticks */
          top: 0; }
```

---

### 3.3 Advanced

**`contain` — performance isolation:**

```css
.order-row {
  contain: layout style;
}
```

Tells the browser: changes inside this element **cannot affect layout or styles outside it**.

Without `contain`: when WAAPI flashes `backgroundColor` on row 3, the browser might recheck the layout of all 31 other rows (even though `backgroundColor` doesn't affect layout). This is called "containment boundary" — without it, the browser is pessimistic.

With `contain: layout style`: the browser knows changes inside row 3 are isolated. It skips the layout/style recalculation for all siblings. Significant performance win for rapid updates.

Values:
| Value | What it contains |
|-------|-----------------|
| `contain: layout` | Changes inside can't affect outside layout |
| `contain: style` | CSS counters don't escape the element |
| `contain: paint` | Children are clipped to the border box |
| `contain: size` | Element's size doesn't depend on children |
| `contain: strict` | All of the above |

**`will-change` — GPU promotion hint:**

```css
.price-ticker__value {
  will-change: transform, color;
}
```

Promotes this element to its own compositor layer **before** animation starts. Without it:
1. Animation starts
2. Browser promotes element to GPU layer (expensive one-time cost)
3. Visible jank on first frame

With `will-change`:
1. Browser promotes during paint (before user sees anything)
2. Animation starts immediately smooth

**Warning:** Overusing `will-change` wastes GPU memory. Apply only to elements you *know* will animate. Remove it after animation if applied dynamically.

**`flex-direction: column-reverse` — the orderbook key stability trick:**

```css
.orderbook__asks {
  display:        flex;
  flex-direction: column-reverse;
}
```

This is subtle but critical. Asks are stored **best-first** in the array (index 0 = lowest ask, closest to mid price). For the UI, asks should appear with the best at the bottom (nearest to the price ticker).

Option 1 — Reverse the array in JSX:
```tsx
{[...asks].reverse().map((level, i) => <OrderRow key={???} />)}
// Problem: key=0 is now the WORST ask. When prices change, key=0 always animates
// even if the best ask didn't change. Flash direction is unreliable.
```

Option 2 — `column-reverse` CSS (our approach):
```tsx
{asks.map((level, i) => <OrderRow key={i} />)}
// DOM order: asks[0] (best) is FIRST in the DOM
// Visual order: CSS reverses it — asks[0] appears at bottom
// React key=0 ALWAYS = best ask component, regardless of DOM position
// When best ask price changes → key=0 component gets new price → WAAPI fires ✓
```

**`:has()` — relational pseudo-class:**

```css
/* Without :has() — need to put a class on the card from React */
.position-card--long  { border-left-color: green; }
.position-card--short { border-left-color: red;   }

/* With :has() — card styles itself based on its descendants */
.position-card:has(.position-card__side--long)  { border-left-color: var(--color-bid); }
.position-card:has(.position-card__side--short) { border-left-color: var(--color-ask); }
```

No React prop needed on the card — CSS observes the badge inside and styles the container accordingly. Eliminates prop drilling just for styling.

**CSS Grid columns for consistent alignment:**

```css
/* Header and rows share the same column definition */
.orderbook__header,
.order-row {
  display:               grid;
  grid-template-columns: 1fr 1fr 1fr;
}
/* All three columns are automatically aligned — no JS measurement needed */
```

**`content-visibility: auto`** (not in project, but critical to know):

```css
.trade-row {
  content-visibility:      auto;
  contain-intrinsic-size:  0 48px; /* estimated height while off-screen */
}
```

The browser **skips rendering entirely** for off-screen rows. For a 10,000-row trade history, this can reduce render time from 500ms to 50ms. The browser reserves the estimated height so scrolling feels natural.

---

## 4. WAAPI

### 4.1 Beginner — What and Why

The Web Animations API is the JavaScript interface to the browser's animation engine — the same engine that powers CSS transitions and `@keyframes`. WAAPI gives you programmatic control: start, pause, reverse, cancel, sequence animations from JavaScript without class juggling.

**The simplest animation:**

```javascript
const el = document.querySelector('.box');

el.animate(
  // Keyframes — array of states the animation moves between
  [
    { backgroundColor: '#00c96e' },  // frame 0% (start)
    { backgroundColor: 'transparent' } // frame 100% (end)
  ],
  // Timing options
  {
    duration: 500,        // milliseconds
    easing:   'ease-out', // acceleration curve
    fill:     'none',     // what happens after animation ends
  }
);
```

**Keyframes can be objects (each is a % point) or a flat array:**

```javascript
// Explicit offset — control exact timing
el.animate(
  [
    { opacity: 0,   offset: 0    },
    { opacity: 1,   offset: 0.3  }, // 30% through: fully visible
    { opacity: 0.8, offset: 1    }, // end: slightly transparent
  ],
  { duration: 800 }
);

// Equal-spaced (offset auto-calculated)
el.animate(
  [
    { transform: 'translateX(0px)' },
    { transform: 'translateX(50px)' },
    { transform: 'translateX(0px)' },
  ],
  { duration: 600 }
);
```

**Common easing curves:**

```
linear       ——————————   constant speed
ease         ⌒——————————  fast start, slow end
ease-in      ———————————⌒ slow start, fast end
ease-out     ⌒——————⌒     fast start, slow end (most natural for UI)
ease-in-out  ⌒————————⌒   slow at both ends
cubic-bezier(0.22, 1, 0.36, 1)  — spring-like, overshoots slightly
```

---

### 4.2 Intermediate

**The Animation object — control playback:**

```javascript
// animate() returns an Animation object
const anim = el.animate(keyframes, timing);

anim.pause();           // freeze at current position
anim.play();            // resume or start
anim.cancel();          // stop immediately — element returns to pre-animation style
anim.finish();          // jump to end frame
anim.reverse();         // play backwards

anim.currentTime = 250; // jump to 250ms position
anim.playbackRate = 2;  // play at 2× speed

// Promise — resolves when animation completes naturally
await anim.finished;
console.log('Animation complete');

// Event — fires when animation ends
anim.onfinish = () => console.log('done');
```

**`fill` — before and after:**

```javascript
el.animate(
  [{ opacity: 0 }, { opacity: 1 }],
  {
    duration:  300,
    fill:      'none',      // element reverts to natural style (our choice)
    // fill: 'forwards'    — element holds final frame after animation
    // fill: 'backwards'   — element holds first frame during delay
    // fill: 'both'        — holds first frame before, last frame after
    delay:     100,
  }
);
```

We always use `fill: 'none'` in `usePriceFlash`. After the 550ms background flash, the row returns to `transparent`. If we used `fill: 'forwards'`, the first flash would permanently colour the row green/red.

**`getAnimations()` — see and cancel in-flight animations:**

```javascript
// In usePriceFlash.ts:
el.getAnimations().forEach(a => a.cancel()); // cancel stale animations
el.animate(newKeyframes, timing);            // start fresh

// Why? If prices update every 400ms and animation duration is 550ms:
// Update 1 → animation starts, 0ms elapsed
// Update 2 (400ms later) → animation still running (150ms left)
// Without cancel: two animations fight for backgroundColor → strobe effect
// With cancel: old animation stops, new one starts clean
```

---

### 4.3 Advanced

**`commitStyles()` — freeze computed style into inline style:**

```javascript
const anim = el.animate(
  [{ transform: 'translateX(0)' }, { transform: 'translateX(200px)' }],
  { duration: 500, fill: 'forwards' }
);

anim.finished.then(() => {
  // Write the final computed transform into el.style.transform
  anim.commitStyles();
  // Now cancel safely — the element stays at 200px
  anim.cancel();
  // Without commitStyles, cancel() would snap back to 0px
});
```

**ScrollTimeline — scroll-driven animations (no JS polling):**

```javascript
const scrollTimeline = new ScrollTimeline({
  source: scrollContainer,  // element driving the animation
  axis:   'block',          // 'block' (vertical) | 'inline' (horizontal)
});

el.animate(
  [{ opacity: 0 }, { opacity: 1 }],
  {
    timeline: scrollTimeline, // driven by scroll, not time
    fill:     'both',
  }
);
// As user scrolls from 0% to 100% of the container:
// element fades from opacity 0 to 1 — zero JavaScript event listeners
```

**Which CSS properties run where:**

| Property | Thread | Notes |
|----------|--------|-------|
| `transform` | **Compositor** (GPU) | Best — no layout, no paint |
| `opacity` | **Compositor** (GPU) | Best |
| `filter` | Compositor | Good |
| `clip-path` | Compositor | Good |
| `background-color` | Main thread | OK — paint only, no layout |
| `color` | Main thread | OK |
| `width`, `height` | Main + Layout | Expensive — causes reflow |
| `top`, `left` | Main + Layout | Expensive — use transform instead |

Our animations:
- `PriceTicker` animates `transform` + `color` — transform runs on GPU
- `usePriceFlash` animates `backgroundColor` — main thread paint only, acceptable for isolated rows with `contain: layout style`

**`GroupEffect` / `SequenceEffect` — orchestrate multiple animations:**

```javascript
// These run in parallel (GroupEffect)
const parallel = new GroupEffect([
  new KeyframeEffect(el1, [{ opacity: 0 }, { opacity: 1 }], 300),
  new KeyframeEffect(el2, [{ transform: 'scale(0.8)' }, { transform: 'scale(1)' }], 300),
]);

// These run one after another (SequenceEffect)
const sequence = new SequenceEffect([
  new KeyframeEffect(el, [{ backgroundColor: '#00c96e' }, { backgroundColor: 'transparent' }], 400),
  new KeyframeEffect(el, [{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }], 200),
]);

new Animation(sequence, document.timeline).play();
```

**Interview answer: "Why WAAPI over CSS transitions?"**

```
CSS transitions:
  ✓ Simple to write
  ✗ Triggered by class add/remove — DOM mutation overhead
  ✗ Removing the class mid-animation is unpredictable
  ✗ Can't be cancelled/paused from JS without hacky setTimeout
  ✗ Can't be driven by scroll or other timelines
  ✗ No Promise API for sequencing

WAAPI:
  ✓ Direct from JavaScript — no class juggling
  ✓ Fully cancellable, pausable, reversible at any time
  ✓ Same engine as CSS — same performance characteristics
  ✓ Promise API (anim.finished) for sequencing
  ✓ Pluggable timelines (scroll, custom)
  ✓ getAnimations() for inspecting and composing
```

---

## 5. WebSocket

### 5.1 Beginner

**HTTP vs WebSocket:**

```
HTTP (request-response):
  Client: "GET /price"
  Server: "67000"
  Connection closes.
  Client: "GET /price" (again, 1 second later)
  Server: "67001"
  ...repeated forever — wasteful, adds latency

WebSocket (persistent connection):
  Client: "open connection to ws://..."
  Server: "67000"   ← server pushes, client did not ask
  Server: "67001"   ← 400ms later, server pushes again
  Server: "66999"   ← 400ms later, server pushes again
  (single connection, data flows whenever ready)
```

For a trading UI with updates 2–5 times per second, HTTP polling is impractical. WebSocket is mandatory.

**Basic API:**

```javascript
// wss:// = WebSocket Secure (like https for WebSocket)
const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');

ws.onopen    = () => console.log('Connected');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data); // data is always a string
  console.log('Received:', data);
};
ws.onerror   = (err) => console.error('Error:', err);
ws.onclose   = (event) => {
  console.log('Closed. Code:', event.code, 'Reason:', event.reason);
};

// Send data to the server
ws.send(JSON.stringify({ type: 'subscribe', channel: 'orderbook' }));

// Close the connection
ws.close();
```

**Connection states:**

```javascript
ws.readyState === 0  // CONNECTING — socket created, not yet open
ws.readyState === 1  // OPEN       — connected and ready
ws.readyState === 2  // CLOSING    — close() called, not yet closed
ws.readyState === 3  // CLOSED     — connection closed
```

---

### 5.2 Intermediate

**The Hyperliquid protocol:**

```javascript
// Step 1: Open connection
const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');

// Step 2: Subscribe to a channel once connected
ws.onopen = () => {
  ws.send(JSON.stringify({
    method: 'subscribe',
    subscription: {
      type: 'l2Book',  // Level 2 order book
      coin: 'BTC',
    }
  }));
};

// Step 3: Handle incoming data
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.channel === 'l2Book') {
    const { coin, levels, time } = msg.data;
    const [bids, asks] = levels;
    // bids[0] = { px: "67000.1", sz: "1.5", n: 3 }
    //           price as string, size as string, numOrders
  }
};
```

**Why strings instead of numbers?**
`67000.1 + 0.2` in JavaScript = `67000.299999999...` (floating-point imprecision).
Exchanges use strings to preserve exact decimal values. You parse to float only when doing math.

**Reconnection — essential pattern:**

```typescript
function connect() {
  const ws = new WebSocket(url);
  let didConnect = false;

  ws.onopen  = () => {
    didConnect = true;
    ws.send(JSON.stringify(subscription));
  };

  ws.onclose = () => {
    if (didConnect) {
      // Legitimate disconnect — retry
      console.log('Reconnecting in 3s…');
      setTimeout(connect, 3_000);
    } else {
      // Never connected — don't retry infinitely
      console.log('Could not connect');
    }
  };
}
```

---

### 5.3 Advanced

**The full pattern in `src/hooks/useWebSocket.ts`:**

```typescript
useEffect(() => {
  let destroyed = false;  // ← prevents state updates after unmount

  const ws = new WebSocket(HL_WS_URL);
  let didConnect = false;

  // ① If socket doesn't open in 5 seconds, fall back to simulation
  const connectTimeout = setTimeout(() => {
    if (!didConnect) {
      ws.close();
      startSimulation();
    }
  }, 5_000);

  ws.onopen = () => {
    didConnect = true;
    clearTimeout(connectTimeout);  // ← cancel fallback timer
    if (destroyed) { ws.close(); return; }  // ← component unmounted during connect
    ws.send(JSON.stringify(subscription));
  };

  ws.onmessage = (evt) => {
    if (destroyed) return;         // ← component unmounted — never update state
    const snap = parse(evt.data);
    setOrderbook(snap);            // safe update
  };

  ws.onclose = () => {
    clearTimeout(connectTimeout);
    if (destroyed) return;
    if (didConnect) {
      setStatus('disconnected');
      setTimeout(connect, 3_000); // ← reconnect
    } else {
      startSimulation();          // ← fallback
    }
  };

  // ② Cleanup runs when:
  //   - component unmounts
  //   - coin changes (effect re-runs with new coin)
  return () => {
    destroyed = true;  // set FIRST — synchronous
    ws.close();        // then close — onclose fires, but destroyed=true blocks it
    clearTimeout(connectTimeout);
    stopSimulation();
  };
}, [coin]);           // ← re-run when coin changes
```

**Exponential backoff — production-grade reconnect:**

```typescript
class WebSocketManager {
  private retryDelay  = 1_000;      // start: 1 second
  private maxDelay    = 30_000;     // cap: 30 seconds

  connect() {
    const ws = new WebSocket(url);

    ws.onopen  = () => {
      this.retryDelay = 1_000;      // reset on success
    };

    ws.onclose = () => {
      setTimeout(() => {
        this.connect();
        this.retryDelay = Math.min(this.retryDelay * 2, this.maxDelay);
      }, this.retryDelay);
      // 1s → 2s → 4s → 8s → 16s → 30s → 30s → ...
    };
  }
}
```

**Message batching — preventing UI thrashing:**

```typescript
// Problem: server sends 20 messages in 10ms
// Without batching: 20 React renders in 10ms

// Solution: batch into one render per animation frame
const queue: Message[] = [];
let flushPending = false;

ws.onmessage = (evt) => {
  queue.push(JSON.parse(evt.data));

  if (!flushPending) {
    flushPending = true;
    requestAnimationFrame(() => {
      // Process all queued messages in one React render
      const batch = queue.splice(0);   // drain queue
      const latest = mergeSnapshots(batch);
      setOrderbook(latest);
      flushPending = false;
    });
  }
};
```

---

## 6. Zustand

### 6.1 Beginner

**What is global state management and why is it needed?**

As your app grows, multiple components need the same data. Passing it via props from parent to child is called "prop drilling" — it gets messy fast.

```tsx
// Prop drilling — orderbook passes through 4 layers
<App orderbook={ob}>
  <Dashboard orderbook={ob}>
    <Panel orderbook={ob}>
      <PriceDisplay orderbook={ob} />   ← finally uses it
```

A state manager is a **single source of truth outside the React tree** that any component can read from directly.

**Zustand — minimal and fast:**

```typescript
import { create } from 'zustand';

// 1. Define the store shape
interface CounterStore {
  count:     number;
  increment: () => void;
  reset:     () => void;
}

// 2. Create the store
const useCounter = create<CounterStore>((set) => ({
  count:     0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset:     () => set({ count: 0 }),
}));

// 3. Use in any component — no Provider, no wrapping
function Counter() {
  const { count, increment } = useCounter();
  return <button onClick={increment}>{count}</button>;
}

function Header() {
  const count = useCounter((state) => state.count); // subscribe to just count
  return <h1>Total clicks: {count}</h1>;
}
```

No `Provider`, no `dispatch`, no action creators. Just a hook.

---

### 6.2 Intermediate

**Selectors — subscribe to a slice:**

```typescript
// Re-renders only when orderbook changes (NOT when positions or connectionStatus change)
const orderbook = useTradingStore((state) => state.orderbook);

// Re-renders when EITHER changes
const { orderbook, positions } = useTradingStore();
// ↑ subscribes to the whole store — any change triggers re-render

// Computed value inside selector
const bestBid = useTradingStore((state) => state.orderbook.bids[0]?.price ?? 0);
```

**Actions with `get` — reading current state in an action:**

```typescript
// From src/store/tradingStore.ts
setOrderbook: (snap) => {
  const prev = get().orderbook;   // synchronous read of current state
  const direction: PriceDirection =
    snap.lastPrice > prev.lastPrice ? 'up'   :
    snap.lastPrice < prev.lastPrice ? 'down' : 'neutral';

  // Single set() call — one React re-render, not two
  set({ orderbook: snap, priceDirection: direction });
},
```

**`set` vs `get`:**
- `set(partial)` — merges partial state, triggers subscribed component re-renders
- `set(fn)` — functional form: `set((state) => ({ count: state.count + 1 }))`
- `get()` — read current state synchronously inside an action

**Immutability — always spread, never mutate:**

```typescript
// ✗ WRONG — mutates in place; Zustand cannot detect this change
set((state) => {
  state.orderbook.lastPrice = 67_000;
  return state;
});

// ✓ CORRECT — new object reference; Zustand detects the change
set((state) => ({
  orderbook: { ...state.orderbook, lastPrice: 67_000 }
}));

// ✓ CORRECT — replacing the whole field
set({ orderbook: newSnapshot });
```

---

### 6.3 Advanced

**Zustand vs React Context:**

```typescript
// Context: ALL consumers re-render when ANY value changes
const TradingContext = createContext<TradingState>(initial);

function Dashboard() {
  // If connectionStatus changes, Dashboard re-renders — even though it only uses orderbook
  const { orderbook } = useContext(TradingContext);
}

// Zustand: ONLY the subscribed field's consumers re-render
function Dashboard() {
  // Only re-renders when orderbook changes — connectionStatus changes are ignored
  const orderbook = useTradingStore((state) => state.orderbook);
}
```

**Zustand vs Redux:**

| | Redux Toolkit | Zustand |
|---|---|---|
| Setup | `configureStore`, `createSlice`, `Provider` | `create()`, done |
| Dispatch | `dispatch(action)` | call action directly: `store.increment()` |
| Boilerplate | Medium (slices/actions) | Minimal |
| Bundle size | ~12KB | ~1KB |
| TypeScript | Good | Excellent |
| DevTools | Excellent | Good |

**Middleware — persist to localStorage:**

```typescript
import { persist } from 'zustand/middleware';

const useSettings = create(
  persist(
    (set) => ({
      theme:       'dark' as 'dark' | 'light',
      numLevels:   16,
      setTheme:    (theme: 'dark' | 'light') => set({ theme }),
      setLevels:   (numLevels: number) => set({ numLevels }),
    }),
    {
      name:    'trading-settings',   // localStorage key
      // Only persist specific fields:
      partialize: (state) => ({ theme: state.theme, numLevels: state.numLevels }),
    }
  )
);
```

**Middleware — devtools (Redux DevTools Extension):**

```typescript
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools(
    (set) => ({ /* ... */ }),
    { name: 'TradingStore' }
  )
);
// Now you can inspect state history in the Redux DevTools browser extension
```

---

## 7. Vite

**What it does:**

Vite is the build tool that powers the development server and production build. Two modes:

1. **Development** — serves your TypeScript/JSX files directly to the browser as native ES modules. No bundling step at all. Cold start: ~300ms regardless of project size.

2. **Production** — bundles everything with Rollup, tree-shakes unused code, splits chunks for optimal caching.

**Why Vite over Create React App (CRA):**

| | CRA (Webpack) | Vite |
|---|---|---|
| Cold start | 10–60 seconds | 200–400ms |
| HMR (hot reload) | 1–5 seconds | <50ms |
| Status | Deprecated 2024 | Active, community standard |
| Config | Opaque (eject needed) | `vite.config.ts` — clean |

**`vite.config.ts`:**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()], // enables:
  // 1. JSX transform (React 17+ automatic import)
  // 2. React Fast Refresh (HMR that preserves component state)
});
```

**Commands:**

```bash
npm run dev      # dev server at http://localhost:5173
npm run build    # TypeScript compile + Rollup bundle → dist/
npm run preview  # serve dist/ locally — test production build
```

**`tsconfig.json` key settings:**

```json
{
  "compilerOptions": {
    "strict": true,                     // enables all strict checks
    "noUncheckedIndexedAccess": true,   // arr[i] returns T | undefined
    "noImplicitReturns": true,          // all code paths must return a value
    "jsx": "react-jsx",                 // React 17+ JSX transform (no import React needed)
    "moduleResolution": "bundler",      // Vite-aware module resolution
    "noEmit": true                      // TypeScript only type-checks; Vite handles transpiling
  }
}
```

---

## 8. Architecture

### 8.1 File Map

```
orderbook-ui/
├── src/
│   ├── types/trading.ts          ← All TypeScript types (discriminated unions, generics)
│   ├── store/tradingStore.ts     ← Zustand store (single source of truth)
│   ├── utils/simulator.ts        ← Orderbook data generator (used when WS fails)
│   ├── hooks/
│   │   ├── useWebSocket.ts       ← WS lifecycle: connect, parse, fallback, reconnect
│   │   └── usePriceFlash.ts      ← WAAPI hook (background flash per price change)
│   ├── components/
│   │   ├── Dashboard.tsx         ← Shell: header + layout + useWebSocket called here
│   │   ├── Orderbook.tsx         ← useMemo slicing + flex-direction trick
│   │   ├── OrderRow.tsx          ← memo + usePriceFlash + CSS depth bar
│   │   ├── PriceTicker.tsx       ← WAAPI on transform+color (compositor thread)
│   │   └── PositionPanel.tsx     ← Live P&L computed from mark price
│   └── styles/
│       ├── tokens.css            ← CSS custom properties (design tokens)
│       └── global.css            ← Layout, components, animations
```

### 8.2 Data Flow

```
400ms tick (WebSocket message OR simulator tick)
  │
  ▼
useWebSocket.ts
  ├── parseLevels() → PriceLevel[] (with depth %)
  └── setOrderbook(snapshot) → Zustand

Zustand store
  ├── computes priceDirection (up/down/neutral from lastPrice vs prevPrice)
  └── notifies subscribers

React re-renders (only subscribed components)
  │
  ├── Orderbook.tsx
  │     ├── useMemo([bids]) → displayBids (stable reference)
  │     ├── useMemo([asks]) → displayAsks (stable reference)
  │     └── renders 16 OrderRow × 2 sides
  │           │
  │           └── memo(OrderRow) — only re-renders if level/maxTotal changed
  │                 ├── updates price text in DOM
  │                 └── useEffect([price]) fires
  │                       └── usePriceFlash:
  │                             ├── getAnimations().forEach(cancel)
  │                             └── el.animate(flashKeyframes, timing) ← WAAPI
  │
  ├── PriceTicker.tsx
  │     └── useEffect([lastPrice]) fires
  │           └── el.animate(moveKeyframes, timing) ← WAAPI (compositor thread)
  │
  └── PositionPanel.tsx
        └── useMemo([positions, orderbook]) → live P&L
```

### 8.3 Why Each Decision Was Made

| Decision | Why |
|----------|-----|
| Key rows by index, not price | Price-keyed rows unmount/remount on shift — breaks WAAPI element reference |
| `flex-direction: column-reverse` | Keeps React key=0 = best ask without reversing the array in JS |
| `memo(OrderRow)` | 32 rows × 2.5 renders/sec = 80 potential renders/sec — memo cuts this to ~4 |
| `useMemo` on sliced arrays | Stable array references prevent memo(OrderRow) from receiving new object references |
| `contain: layout style` | Isolates WAAPI flash invalidation to the single row — no sibling reflow |
| WAAPI over CSS transitions | Programmatic cancel/restart — no class toggle timing issues |
| Zustand over Context | Per-selector re-renders — PositionPanel doesn't re-render on every orderbook tick |
| Simulation fallback | Hyperliquid WS may be unreachable in dev — simulator uses identical data shape |
| `startTransition` for coin switch | Coin switch is non-urgent — old orderbook stays visible during reconnect |
| Discriminated union for OrderStatus | TypeScript exhaustive narrowing — no impossible field access at compile time |
| `satisfies` for BASE_PRICES | Validates Record<Coin, number> without widening — safe index access |

---

## 9. Interview Cheat Sheet

### TypeScript
| Question | Answer |
|----------|--------|
| Discriminated union? | Union where each variant has a unique literal field (discriminant). TypeScript narrows the type inside `switch`/`if` — you can only access fields that exist on that specific variant. |
| `interface` vs `type`? | `interface` for object shapes (can extend/merge); `type` for unions, intersections, aliases. |
| `satisfies` vs `as`? | `satisfies` validates without widening — keeps the specific inferred type. `as` is an unsafe cast — you're overriding TypeScript. |
| `noUncheckedIndexedAccess`? | Makes `arr[i]` return `T \| undefined` instead of `T`. Forces you to handle empty arrays — prevents runtime crashes. |
| Generic constraints? | `<T extends { price: number }>` — T must have at least a `price: number` field. |

### React
| Question | Answer |
|----------|--------|
| When does `memo` help? | When component is pure, parent re-renders frequently, and component is non-trivial to render. |
| `useMemo` vs `useCallback`? | `useMemo` memoizes a computed value; `useCallback` memoizes a function reference (so child `memo` isn't broken by new function identity). |
| `useTransition`? | Marks a state update as non-urgent — React keeps the current UI visible while the update processes. |
| Why key by index in orderbook? | Ensures the component at key=0 always represents the same price rank (best bid/ask). When price changes, the SAME component gets new props → `useEffect` detects change → WAAPI fires on the existing element. |
| `useRef` vs `useState`? | `useRef` changes don't trigger re-renders. Use for values needed across renders but not for display (WS instance, previous price). |
| StrictMode double-effect? | Development only. React mounts → cleans up → mounts again to expose missing cleanups. Guard with a `destroyed` flag. |

### CSS
| Question | Answer |
|----------|--------|
| `contain: layout style`? | Scopes layout/style invalidation to the element. Changes inside cannot affect sibling layout — critical for isolated row animations. |
| `will-change`? | Promotes element to GPU layer before animation starts. Apply only to elements you know will animate — overuse wastes GPU memory. |
| CSS custom properties vs Sass? | CSS custom properties are live — changeable at runtime from JS. Sass variables are compiled away at build time. |
| `flex-direction: column-reverse`? | Visually reverses order of flex children without changing DOM order. Keeps React keys stable for animation correctness. |
| `:has()` selector? | Relational pseudo-class — selects a parent based on its descendants. Eliminates prop drilling just for styling. |
| Depth bar technique? | Set `--depth` CSS variable from JS per row. CSS `::before` reads it for `width`. One variable → animated depth bar, zero extra DOM elements. |

### WAAPI
| Question | Answer |
|----------|--------|
| WAAPI vs CSS transitions? | WAAPI is imperative, cancellable, composable. CSS transitions require class toggling — timing is fragile. Both use the same browser engine. |
| `fill: 'none'`? | Element returns to its natural CSS value after animation. `fill: 'forwards'` would permanently hold the end state. |
| Why cancel before animating? | Multiple rapid updates would stack overlapping animations → strobe effect. `getAnimations().forEach(cancel)` ensures one clean flash per update. |
| Which properties run on GPU? | `transform` and `opacity`. Everything else (including `background-color`) runs on the main thread — but background-color doesn't trigger layout, so it's acceptable. |
| `commitStyles()`? | Writes the current computed animation style into `element.style` so you can cancel the animation without snapping back. |

### WebSocket
| Question | Answer |
|----------|--------|
| WebSocket vs polling? | Persistent connection; server pushes data the instant it changes; no HTTP overhead per message. Polling adds latency equal to the poll interval. |
| Reconnect pattern? | On `onclose`, if `didConnect` was true (legitimate disconnect), `setTimeout(connect, delay)`. If never connected, fall back or stop. |
| `destroyed` flag? | Set synchronously in cleanup. Guards all async callbacks (onmessage, onclose) — prevents React state updates after the component unmounts. |
| Why prices as strings? | Floating-point imprecision. `0.1 + 0.2 = 0.30000000000000004`. Strings preserve exact decimal values. Parse to float only for math. |

### Zustand
| Question | Answer |
|----------|--------|
| Zustand vs Redux? | Zustand: minimal API (create + set + get), ~1KB, no boilerplate. Redux: time-travel debugging, middleware ecosystem, but much more ceremony. |
| Zustand vs Context? | Context re-renders ALL consumers on ANY change. Zustand re-renders ONLY components subscribed to the specific changed field. |
| Selector pattern? | `useTradingStore(state => state.orderbook)` — component only re-renders when `orderbook` changes, not when `connectionStatus` changes. |
| Mutating in place? | Never. Zustand uses reference equality to detect changes. Mutating in place returns the same reference — no re-render triggered. Always spread. |
