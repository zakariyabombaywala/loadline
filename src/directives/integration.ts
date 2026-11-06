import type { AstroIntegration } from 'astro';

/** Registers the client:interaction hydration directive. */
export default function interactionDirective(): AstroIntegration {
  return {
    name: 'client:interaction',
    hooks: {
      'astro:config:setup': ({ addClientDirective }) => {
        addClientDirective({
          name: 'interaction',
          entrypoint: new URL('./interaction.ts', import.meta.url),
        });
      },
    },
  };
}
