import { useEffect, useRef } from 'react';

// WAAPI-based background flash. Generic so it works on any HTML element type.
export function usePriceFlash<T extends HTMLElement = HTMLElement>(
  price: number,
): React.RefObject<T> {
  const ref       = useRef<T>(null);
  const prevRef   = useRef(price);

  useEffect(() => {
    const el = ref.current;
    // Skip if el not mounted yet, or price unchanged
    if (!el || price === prevRef.current) return;

    const isUp    = price > prevRef.current;
    prevRef.current = price;

    // Cancel any in-flight animation so flashes don't stack
    el.getAnimations().forEach((a) => a.cancel());

    // WAAPI is faster than CSS transitions for JS-driven animations because
    // it runs on the compositor thread when only transform/opacity are animated.
    // Background is on the main thread but acceptable for a subtle flash.
    el.animate(
      [
        {
          backgroundColor: isUp
            ? 'rgba(0, 201, 110, 0.22)'   // bid green flash
            : 'rgba(240, 48, 80, 0.22)',  // ask red flash
        },
        { backgroundColor: 'transparent' },
      ],
      { duration: 550, easing: 'ease-out', fill: 'none' },
    );
  }, [price]);

  return ref;
}
