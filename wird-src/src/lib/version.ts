/** Injected by Vite (see vite.config.ts). Falls back when the app runs outside a build. */
declare const __BUILD__: { sha: string; date: string } | undefined;

export const BUILD: { sha: string; date: string } =
  typeof __BUILD__ !== 'undefined' ? __BUILD__ : { sha: 'dev', date: new Date().toISOString().slice(0, 10) };
