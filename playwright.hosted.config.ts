import { defineConfig, devices } from '@playwright/test'

/**
 * Runs `tests/hosted/` against a real subpath build served by `vite preview`,
 * which is the closest local approximation of GitHub Pages.
 *
 * Separate from `playwright.config.ts` on purpose: that one drives the dev
 * server at `/`, and the whole point here is the deploy base. Keeping them
 * apart means `npm run test:visual` is unaffected.
 */

const port = 4173
const base = '/webxr-playground/'

export default defineConfig({
  testDir: './tests/hosted',
  fullyParallel: false,
  timeout: 90_000,
  reporter: [['list']],
  webServer: {
    // Build then serve. `--base` is passed here rather than set in
    // vite.config.ts for the same reason the deploy workflow passes it.
    command: `npm run build -- --base=${base} && npx vite preview --base=${base} --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}${base}`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  use: {
    baseURL: `http://127.0.0.1:${port}${base}`,
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
})
