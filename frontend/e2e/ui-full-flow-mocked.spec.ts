import { expect, test } from '@playwright/test';

test.describe('Mocked UI flow', () => {
  test('user can create a project, generate outline, navigate to detail and preview', async ({ page }) => {
    const projectId = 'mock-project-123';
    const mockProject = {
      project_id: projectId,
      idea_prompt: '创建一份关于人工智能基础的简短PPT',
      creation_type: 'idea',
      render_mode: 'image',
      scheme_id: 'edu_dark',
      status: 'DRAFT',
      pages: [] as Array<Record<string, unknown>>,
    };

    await page.route('**/api/projects', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              project_id: projectId,
              status: 'DRAFT',
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.route(`**/api/projects/${projectId}`, async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: mockProject,
          }),
        });
        return;
      }

      if (method === 'PUT') {
        const body = route.request().postDataJSON() as Record<string, unknown> | null;
        Object.assign(mockProject, body || {});
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockProject }),
        });
        return;
      }

      await route.continue();
    });

    await page.route(`**/api/projects/${projectId}/generate/outline`, async (route) => {
      mockProject.status = 'OUTLINE_GENERATED';
      mockProject.pages = [
        {
          page_id: 'page-1',
          order_index: 0,
          status: 'OUTLINE_GENERATED',
          outline_content: { title: '什么是 AI', points: ['定义', '核心能力'] },
          description_content: { text: 'AI 是模拟人类智能的技术。' },
        },
        {
          page_id: 'page-2',
          order_index: 1,
          status: 'OUTLINE_GENERATED',
          outline_content: { title: 'AI 的应用', points: ['办公', '教育'] },
          description_content: { text: 'AI 已经用于办公、教育等场景。' },
        },
        {
          page_id: 'page-3',
          order_index: 2,
          status: 'OUTLINE_GENERATED',
          outline_content: { title: 'AI 的未来', points: ['机会', '风险'] },
          description_content: { text: 'AI 的未来同时伴随机会与风险。' },
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            outline: {
              pages: mockProject.pages.map((page) => (page as Record<string, unknown>).outline_content),
            },
            pages: mockProject.pages,
          },
        }),
      });
    });

    await page.route(`**/api/projects/${projectId}/pages/order`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockProject }),
      });
    });

    await page.route(`**/api/projects/${projectId}/pages/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto('/');

    await page.locator('button:has-text("一句话生成")').click().catch(() => {});
    await page.locator('textarea, input[type="text"]').first().fill('创建一份关于人工智能基础的简短PPT');
    await page.getByRole('button', { name: '下一步' }).click();

    await expect(page).toHaveURL(new RegExp(`/project/${projectId}/outline`));
    await expect(page.getByRole('button', { name: /自动生成大纲|重新生成大纲/ })).toBeVisible();

    await page.getByRole('button', { name: /自动生成大纲|重新生成大纲/ }).click();

    await expect(page.getByText('第 1 页')).toBeVisible();
    await expect(page.getByText('什么是 AI')).toBeVisible();

    await page.getByRole('button', { name: '下一步' }).click();
    await expect(page).toHaveURL(new RegExp(`/project/${projectId}/detail`));
    await expect(page.getByRole('button', { name: '批量生成描述' })).toBeVisible();
    await expect(page.getByText('第 1 页').first()).toBeVisible();

    await page.getByRole('button', { name: '生成PPT' }).click();
    await expect(page).toHaveURL(new RegExp(`/project/${projectId}/preview`));
  });
});
