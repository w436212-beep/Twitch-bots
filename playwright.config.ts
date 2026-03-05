import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
    },
  ],
});
