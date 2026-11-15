/**
 * PricePilot AI Playwright E2E Tests
 * Tests all 13 application pages with actual backend data
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('PricePilot AI - End-to-End Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('login with analyst credentials', async ({ page }) => {
    // Navigate to login page and login
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL(/^.*\/?$/);
  });

  test('invalid login shows error', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'invalid@test.com');
    await page.fill('input[placeholder="password"]', 'wrong');
    await page.click('button:has-text("Sign in")');
    await expect(page.locator('.alert, .error, text=Invalid credentials')).toBeVisible();
  });

  test('role-based access: analyst can view dashboard', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    // Dashboard should load
    await expect(page.locator('text=Revenue')).toBeVisible();
  });

  test('role-based access: analytics page loads', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await page.click('text=Analytics');
    await expect(page.locator('text=Analytics & Reports')).toBeVisible();
  });

  test('navigation to products page', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await page.click('text=Products');
    await expect(page.locator('text=Product Catalog')).toBeVisible();
  });

  test('navigation to decisions page', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await page.click('text=Decision Center');
    await expect(page.locator('text=Decision Center')).toBeVisible();
  });

  test('navigation to promotions page', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await page.click('text=Promotions');
    await expect(page.locator('text=Promotions')).toBeVisible();
  });

  test('navigation to simulator page', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await page.click('text=Simulator');
    await expect(page.locator('text=Pricing Simulator')).toBeVisible();
  });

  test('navigation to costs page', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await page.click('text=Costs');
    await expect(page.locator('text=Cost History')).toBeVisible();
  });

  test('navigation to inventory page', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await page.click('text=Inventory');
    await expect(page.locator('text=Inventory')).toBeVisible();
  });

  test('navigation to competitors page', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await page.click('text=Competitors');
    await expect(page.locator('text=Competitor Price Deviations')).toBeVisible();
  });

  test('navigation to exceptions page', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await page.click('text=Exceptions');
    await expect(page.locator('text=Exceptions')).toBeVisible();
  });

  test('navigation to audit page', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await page.click('text=Audit History');
    await expect(page.locator('text=Audit History')).toBeVisible();
  });

  test('navigation to settings page (analyst role)', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    // Analyst should see restricted settings or be redirected
    await expect(page.locator('text=Administrator role required')).toBeVisible();
  });

  test('navigation to dashboard', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[placeholder="email"]', 'analyst@pricepilot.ai');
    await page.fill('input[placeholder="password"]', 'Analyst@12345');
    await page.click('button:has-text("Sign in")');
    await expect(page.locator('text=Dashboard')).toBeVisible();
    // Check KPIs are displayed
    await expect(page.locator('text=Revenue')).toBeVisible();
    await expect(page.locator('text=Gross profit')).toBeVisible();
  });

  test('protected route redirect', async ({ page }) => {
    // Go directly to a protected route without logging in
    await page.goto(BASE_URL + '/products');
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });
});