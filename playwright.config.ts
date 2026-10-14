// Pruebas de navegador (npm run e2e). No corren en el build de Netlify.
import { defineConfig } from '@playwright/test';

const PUERTO = 3100;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 2,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: { baseURL: `http://localhost:${PUERTO}`, browserName: 'chromium' },
  webServer: {
    command: 'npm start',
    env: { PORT: String(PUERTO), BROWSER: 'none' },
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
