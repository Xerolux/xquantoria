import { test, expect } from '@playwright/test';

test.describe('Posts Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/email/i).fill('admin@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /login/i }).click();
        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
    });

    test('should display posts list', async ({ page }) => {
        await page.goto('/admin/posts');
        
        await expect(page.getByRole('heading', { name: /posts/i })).toBeVisible();
        await expect(page.getByRole('table')).toBeVisible();
    });

    test('should filter posts by status', async ({ page }) => {
        await page.goto('/admin/posts');
        
        await page.getByRole('combobox', { name: /status/i }).click();
        await page.getByRole('option', { name: /published/i }).click();
        
        await expect(page).toHaveURL(/.*status=published.*/);
    });

    test('should search posts', async ({ page }) => {
        await page.goto('/admin/posts');
        
        await page.getByPlaceholder(/search/i).fill('test');
        await page.keyboard.press('Enter');
        
        await expect(page).toHaveURL(/.*search=test.*/);
    });

    test('should open create post modal', async ({ page }) => {
        await page.goto('/admin/posts');
        
        await page.getByRole('button', { name: /create|new/i }).click();
        
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByLabel(/title/i)).toBeVisible();
    });

    test('should create a new post', async ({ page }) => {
        await page.goto('/admin/posts');
        
        await page.getByRole('button', { name: /create|new/i }).click();
        
        const modal = page.getByRole('dialog');
        await modal.getByLabel(/title/i).fill('Test Post from E2E');
        await modal.getByLabel(/excerpt/i).fill('This is a test excerpt');
        await modal.getByRole('button', { name: /save|create/i }).click();
        
        await expect(page.getByText(/success|created/i)).toBeVisible();
    });

    test('should delete a post', async ({ page }) => {
        await page.goto('/admin/posts');
        
        const firstRow = page.getByRole('row').nth(1);
        await firstRow.getByRole('button', { name: /delete/i }).click();
        
        await page.getByRole('button', { name: /confirm/i }).click();
        
        await expect(page.getByText(/deleted/i)).toBeVisible();
    });

    test('should paginate posts', async ({ page }) => {
        await page.goto('/admin/posts');
        
        const nextButton = page.getByRole('button', { name: /next/i });
        if (await nextButton.isEnabled()) {
            await nextButton.click();
            await expect(page).toHaveURL(/.*page=2.*/);
        }
    });
});

test.describe('Post Editor', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/email/i).fill('admin@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /login/i }).click();
        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
    });

    test('should display rich text editor', async ({ page }) => {
        await page.goto('/admin/posts/new');
        
        await expect(page.locator('.tox-tinymce')).toBeVisible({ timeout: 10000 });
    });

    test('should auto-save draft', async ({ page }) => {
        await page.goto('/admin/posts/new');
        
        await page.getByLabel(/title/i).fill('Auto-save Test');
        
        await page.waitForTimeout(35000);
        
        await expect(page.getByText(/auto.?saved|draft saved/i)).toBeVisible({ timeout: 5000 });
    });
});
