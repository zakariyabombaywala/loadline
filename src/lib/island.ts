/**
 * Event an island dispatches (bubbling) from its mount effect once it is hydrated and
 * listening. The client:interaction directive waits for it before replaying input.
 */
export const ISLAND_READY = 'island:ready';
