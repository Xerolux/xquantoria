import { test, expect } from '@playwright/test';

test.describe('Media Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/email/i).fill('admin@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /login/i }).click();
        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
    });

    test('should display media library', async ({ page }) => {
        await page.goto('/admin/media');
        
        await expect(page.getByRole('heading', { name: /media/i })).toBeVisible();
    });

    test('should switch between grid and list view', async ({ page }) => {
        await page.goto('/admin/media');
        
        const gridViewButton = page.getByRole('button', { name: /grid/i });
        const listViewButton = page.getByRole('button', { name: /list/i });
        
        await gridViewButton.click();
        await expect(page.locator('.ant-card')).toBeVisible();
        
        await listViewButton.click();
        await expect(page.getByRole('table')).toBeVisible();
    });

    test('should filter media by type', async ({ page }) => {
        await page.goto('/admin/media');
        
        await page.getByRole('tab', { name: /images/i }).click();
        
        await expect(page).toHaveURL(/.*type=image.*/);
    });

    test('should upload a file', async ({ page }) => {
        await page.goto('/admin/media');
        
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test-image.png',
            mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
        });
        
        await expect(page.getByText(/uploading/i)).toBeVisible();
        await expect(page.getByText(/success|uploaded/i)).toBeVisible({ timeout: 30000 });
    });

    test('should delete media', async ({ page }) => {
        await page.goto('/admin/media');
        
        const firstMedia = page.locator('.ant-card').first();
        await firstMedia.hover();
        await firstMedia.getByRole('button', { name: /delete/i }).click();
        
        await page.getByRole('button', { name: /confirm/i }).click();
        
        await expect(page.getByText(/deleted/i)).toBeVisible();
    });
});

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/email/i).fill('admin@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /login/i }).click();
        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
    });

    test('should display dashboard widgets', async ({ page }) => {
        await page.goto('/admin/dashboard');
        
        await expect(page.getByText(/total posts/i)).toBeVisible();
        await expect(page.getByText(/total users/i)).toBeVisible();
    });

    test('should show recent activity', async ({ page }) => {
        await page.goto('/admin/dashboard');
        
        await expect(page.getByText(/recent/i)).toBeVisible();
    });

    test('should navigate to posts from dashboard', async ({ page }) => {
        await page.goto('/admin/dashboard');
        
        await page.getByText(/view all posts/i).click();
        
        await expect(page).toHaveURL(/.*posts.*/);
    });
});

test.describe('Settings', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/email/i).fill('admin@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /login/i }).click();
        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
    });

    test('should display settings tabs', async ({ page }) => {
        await page.goto('/admin/settings');
        
        await expect(page.getByRole('tab', { name: /general/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /seo/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /security/i })).toBeVisible();
    });

    test('should update general settings', async ({ page }) => {
        await page.goto('/admin/settings');
        
        await page.getByLabel(/site name/i).fill('Updated Site Name');
        await page.getByRole('button', { name: /save/i }).click();
        
        await expect(page.getByText(/saved|updated/i)).toBeVisible();
    });
});

test.describe('User Profile', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/email/i).fill('admin@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /login/i }).click();
        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
    });

    test('should display profile page', async ({ page }) => {
        await page.goto('/admin/profile');
        
        await expect(page.getByText(/profile/i)).toBeVisible();
        await expect(page.getByLabel(/name/i)).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
    });

    test('should update profile information', async ({ page }) => {
        await page.goto('/admin/profile');
        
        await page.getByLabel(/name/i).fill('Updated Name');
        await page.getByRole('button', { name: /save/i }).click();
        
        await expect(page.getByText(/saved|updated/i)).toBeVisible();
    });

    test('should show 2FA setup option', async ({ page }) => {
        await page.goto('/admin/profile');
        
        await expect(page.getByText(/two.?factor|2fa/i)).toBeVisible();
    });
});

test.describe('RBAC Permissions', () => {
    test('editor cannot access admin settings', async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/email/i).fill('editor@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /login/i }).click();
        
        await page.goto('/admin/users');
        
        await expect(page.getByText(/forbidden|not authorized/i)).toBeVisible();
    });

    test('author can only edit own posts', async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/email/i).fill('author@example.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /login/i }).click();
        
        await page.goto('/admin/posts');
        
        await expect(page.getByText(/my posts|own posts/i)).toBeVisible();
    });
});
