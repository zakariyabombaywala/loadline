declare module 'astro' {
  interface AstroClientDirectives {
    /** Hydrate on first pointer, touch or focus interaction with the island. */
    'client:interaction'?: boolean;
  }
}

export {};
