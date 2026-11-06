import type { ClientDirective } from 'astro';
import { ISLAND_READY } from '../lib/island';

/**
 * client:interaction: hydrate an island the first time someone reaches for it
 * (pointer over, touch, or keyboard focus), instead of on page load.
 *
 * The page ships no framework JS until it's needed. Forms inside the island never
 * submit natively; a submit that arrives before the component is ready is held and
 * replayed once the component dispatches `island:ready` from its mount effect.
 * (Hydration in React 19 is concurrent, so "hydrate() resolved" is not the same as
 * "the component is listening".)
 */
const EVENTS = ['pointerover', 'pointerdown', 'touchstart', 'focusin'] as const;

const interaction: ClientDirective = (load, _options, el) => {
  let started = false;
  let ready = false;
  let pendingSubmit: HTMLFormElement | null = null;

  const start = async () => {
    if (started) return;
    started = true;
    EVENTS.forEach((type) => el.removeEventListener(type, start));
    const hydrate = await load();
    await hydrate();
  };

  el.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      if (ready) return;
      event.stopImmediatePropagation();
      pendingSubmit = event.target as HTMLFormElement;
      start();
    },
    true,
  );

  el.addEventListener(
    ISLAND_READY,
    () => {
      ready = true;
      pendingSubmit?.requestSubmit();
      pendingSubmit = null;
    },
    { once: true },
  );

  EVENTS.forEach((type) => el.addEventListener(type, start, { once: true, passive: true }));
};

export default interaction;
