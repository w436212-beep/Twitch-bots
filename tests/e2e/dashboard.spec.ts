import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Twitch Bot Dashboard UI', () => {
  let app: any;
  let window: any;

  test.beforeAll(async () => {
    // Launch Electron app using Playwright
    app = await electron.launch({ args: ['.'] });
    window = await app.firstWindow();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('Top Stats Bar renders correctly', async () => {
    // Verify specific stats elements exist in the top bar
    await expect(window.locator('text=В сети/Всего')).toBeVisible();
    await expect(window.locator('text=Стоимость AI')).toBeVisible();
    await expect(window.locator('text=Система (RAM)')).toBeVisible();
    await expect(window.locator('text=Аптайм')).toBeVisible();
  });

  test('Accounts Panel renders and interacts correctly', async () => {
    // Left sidebar headers
    await expect(window.locator('h2', { hasText: 'Аккаунты' })).toBeVisible();

    // Tabs
    await expect(window.locator('button:has-text("Все")')).toBeVisible();
    await expect(window.locator('button:has-text("Онлайн")')).toBeVisible();
    await expect(window.locator('button:has-text("Ошибки")')).toBeVisible();

    // Search input
    const searchInput = window.locator('input[placeholder="Поиск по нику..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('testbot');
    await expect(searchInput).toHaveValue('testbot');

    // Add button
    const addButton = window.locator('button', { hasText: 'Добавить аккаунты' });
    await expect(addButton).toBeVisible();

    // Table headers
    await expect(window.locator('th', { hasText: 'Статус' })).toBeVisible();
    await expect(window.locator('th', { hasText: 'Ник' })).toBeVisible();
    await expect(window.locator('th', { hasText: 'Аптайм' })).toBeVisible();
    await expect(window.locator('th', { hasText: 'Сообщ.' })).toBeVisible();
  });

  test('Controls Panel renders and interactions', async () => {
    // Buttons for Start / Stop
    await expect(window.locator('button', { hasText: 'Запустить ботов' })).toBeVisible();
    await expect(window.locator('button', { hasText: 'Остановить ботов' })).toBeVisible();

    // Action Buttons
    await expect(window.locator('button', { hasText: 'AXAXAX' })).toBeVisible();
    await expect(window.locator('button', { hasText: 'Приветствие' })).toBeVisible();

    // Broadcast input
    const broadcastInput = window.locator('input[placeholder="Текст для отправки от всех ботов..."]');
    await expect(broadcastInput).toBeVisible();
    await broadcastInput.fill('Hello stream');
    await expect(broadcastInput).toHaveValue('Hello stream');

    const sendButton = window.locator('button', { hasText: 'Отправить' });
    await expect(sendButton).toBeVisible();
  });

  test('Live Chat & Chart render correctly', async () => {
    // Chart
    await expect(window.locator('h3', { hasText: 'График онлайн ботов' })).toBeVisible();
    await expect(window.locator('canvas')).toBeVisible();

    // Live Chat
    await expect(window.locator('h2', { hasText: 'Живой чат' })).toBeVisible();
    // Assuming the Chat Preview panel has a container for messages
    const chatContainer = window.locator('h2', { hasText: 'Живой чат' }).locator('..');
    await expect(chatContainer).toBeVisible();
  });
});
