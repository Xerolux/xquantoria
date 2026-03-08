import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display login page', async ({ page }) => {
        await expect(page).toHaveURL(/.*login.*/);
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
        await page.getByRole('button', { name: /login/i }).click();
        
        await expect(page.getByText(/email is required/i)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.getByLabel(/email/i).fill('invalid@example.com');
        await page.getByLabel(/password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /login/i }).click();
        
        await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        await page.getByLabel(/email/i).fill('admin@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /login/i }).click();
        
        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
        await expect(page.getByText(/welcome/i)).toBeVisible();
    });

    test('should redirect to login when accessing protected route', async ({ page }) => {
        await page.goto('/admin/posts');
        
        await expect(page).toHaveURL(/.*login.*/);
    });

    test('should logout successfully', async ({ page }) => {
        await page.getByLabel(/email/i).fill('admin@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /login/i }).click();
        
        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
        
        await page.getByRole('button', { name: /user menu|profile/i }).click();
        await page.getByRole('menuitem', { name: /logout/i }).click();
        
        await expect(page).toHaveURL(/.*login.*/);
    });
});

test.describe('Remember Me functionality', () => {
    test('should persist session when remember me is checked', async ({ page, context }) => {
        await page.goto('/');
        
        await page.getByLabel(/email/i).fill('admin@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByLabel(/remember me/i).check();
        await page.getByRole('button', { name: /login/i }).click();
        
        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
        
        await context.storageState({ path: 'storage-state.json' });
        
        const newPage = await context.newPage();
        await newPage.goto('/admin/dashboard');
        
        await expect(newPage).toHaveURL(/.*dashboard.*/);
    });
});
