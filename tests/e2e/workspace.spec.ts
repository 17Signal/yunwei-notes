import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";

let cookies: Awaited<ReturnType<BrowserContext["cookies"]>>;
let categoryId: string;
let firstId: string;
let pageErrors: string[];
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=",
  "base64",
);

async function createNote(
  api: APIRequestContext,
  title: string,
  content = "初始内容",
  extra = {},
) {
  const response = await api.post("/api/notes", {
    data: { categoryId, title, content, ...extra },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}

test.beforeAll(async ({ playwright }) => {
  const api = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const login = await api.post("/api/auth/login", {
    data: { password: "browser-test-password" },
  });
  expect(login.status(), await login.text()).toBe(200);
  cookies = (await api.storageState()).cookies;
  await api.dispose();
});

test.beforeEach(async ({ context, page }) => {
  pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await context.addCookies(cookies);
  const response = await page.request.post("/api/categories", {
    data: { name: `浏览器测试 ${crypto.randomUUID().slice(0, 8)}` },
  });
  expect(response.status()).toBe(201);
  categoryId = (await response.json()).data.id;
  firstId = (
    await createNote(page.request, "第一条笔记", "中文搜索应该支持部分匹配")
  ).id;
  await createNote(page.request, "第二条笔记", "第二条内容");
});

test.afterEach(async ({ page }) => {
  const result = await page.request.get(
    `/api/notes?categoryId=${categoryId}&pageSize=100`,
  );
  if (result.ok()) {
    for (const note of (await result.json()).data)
      await page.request.delete(`/api/notes/${note.id}`);
    await page.request.delete(`/api/categories/${categoryId}`);
  }
  expect(pageErrors).toEqual([]);
});

test("API authentication, validation, Chinese search and stale-write protection", async ({
  page,
  playwright,
}) => {
  const anonymous = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  expect((await anonymous.get("/api/notes")).status()).toBe(401);
  await anonymous.dispose();
  expect(
    (
      await page.request.post("/api/notes", {
        data: "{",
        headers: { "Content-Type": "application/json" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/categories", {
        data: { name: "blocked" },
        headers: { Origin: "https://evil.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (await page.request.delete(`/api/categories/${categoryId}`)).status(),
  ).toBe(409);
  const search = await page.request.get(
    `/api/notes?categoryId=${categoryId}&q=${encodeURIComponent("部分匹配")}`,
  );
  expect(
    (await search.json()).data.map((note: { id: string }) => note.id),
  ).toEqual([firstId]);
  const original = (
    await (await page.request.get(`/api/notes/${firstId}`)).json()
  ).data;
  expect(
    (
      await page.request.patch(`/api/notes/${firstId}`, {
        data: { title: "较新标题", expectedVersion: original.version },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.patch(`/api/notes/${firstId}`, {
        data: { content: "过期内容", expectedVersion: original.version },
      })
    ).status(),
  ).toBe(409);
  const percent = await createNote(page.request, "完成 100%", "包含百分号");
  const literal = await page.request.get(
    `/api/notes?categoryId=${categoryId}&q=%25`,
  );
  expect(
    (await literal.json()).data.map((note: { id: string }) => note.id),
  ).toEqual([percent.id]);
});

test("draft survives note switches, list refresh, star changes and delayed saves", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /第一条笔记 中文/ }).click();
  await page.getByLabel("笔记标题").fill("保留我的标题");
  await page.getByLabel("MARKDOWN", { exact: true }).fill("未保存的内容");
  await page.getByRole("button", { name: /第二条笔记 第二/ }).click();
  await page.getByRole("button", { name: /第一条笔记 中文/ }).click();
  await expect(page.getByLabel("笔记标题")).toHaveValue("保留我的标题");
  await expect(page.getByLabel("MARKDOWN", { exact: true })).toHaveValue(
    "未保存的内容",
  );
  await page.getByRole("button", { name: "刷新列表", exact: true }).click();
  await page.getByRole("button", { name: "收藏笔记", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "取消收藏", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("MARKDOWN", { exact: true })).toHaveValue(
    "未保存的内容",
  );
  await page.route(`**/api/notes/${firstId}`, async (route) => {
    if (route.request().method() === "PATCH")
      await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  const saving = page.waitForRequest(
    (request) =>
      request.method() === "PATCH" && request.url().endsWith(firstId),
  );
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await saving;
  await page.getByLabel("MARKDOWN", { exact: true }).fill("保存过程中继续输入");
  await expect(
    page.getByRole("button", { name: "保存", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("MARKDOWN", { exact: true })).toHaveValue(
    "保存过程中继续输入",
  );
  await page.keyboard.press("Control+s");
  await expect(
    page.getByRole("button", { name: "保存", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  const result = await page.request.get(`/api/notes/${firstId}`);
  expect((await result.json()).data.content).toBe("保存过程中继续输入");
});

test("upload preserves draft, escapes Markdown filename and protects the file", async ({
  page,
  playwright,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("笔记标题")).toBeVisible();
  await page.getByLabel("MARKDOWN", { exact: true }).fill("图片前的草稿");
  await page
    .getByLabel("选择图片")
    .setInputFiles({ name: "图][片.png", mimeType: "image/png", buffer: png });
  await expect(page.getByLabel("MARKDOWN", { exact: true })).toHaveValue(
    /图片前的草稿[\s\S]*!\[图  片.png\]\(\/api\/attachments\//,
  );
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  const content = await page
    .getByLabel("MARKDOWN", { exact: true })
    .inputValue();
  const fileUrl = content.match(/\((\/api\/attachments\/[^)]+)\)/)![1];
  const file = await page.request.get(fileUrl);
  expect(file.status()).toBe(200);
  expect(file.headers()["cache-control"]).toContain("no-store");
  const anonymous = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  expect((await anonymous.get(fileUrl)).status()).toBe(401);
  await anonymous.dispose();
  await page.getByLabel("选择图片").setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a png"),
  });
  await expect(page.getByText("文件内容与图片格式不符。")).toBeVisible();
  await expect(page.getByLabel("MARKDOWN", { exact: true })).toHaveValue(
    content,
  );
});

test("new note clears a search and deleting the last page moves back", async ({
  page,
}) => {
  for (let index = 0; index < 19; index++)
    await createNote(page.request, `分页笔记 ${index}`);
  await page.goto("/");
  await page.getByLabel("搜索笔记", { exact: true }).fill("不存在的关键词");
  await expect(page.getByText("没有找到相关笔记")).toBeVisible();
  await page.getByRole("button", { name: "新建笔记", exact: true }).click();
  await expect(page.getByLabel("笔记标题")).toHaveValue("未命名笔记");
  await expect(page.getByLabel("搜索笔记", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
  for (let count = 0; count < 2; count++) {
    await page
      .getByRole("button", { name: /^删除笔记 / })
      .first()
      .click();
    await page.getByRole("button", { name: "确认删除", exact: true }).click();
    await expect(page.getByRole("alertdialog")).not.toBeVisible();
  }
  await expect(page.getByText("1 / 1", { exact: true })).toBeVisible();
});

test("mobile drawer closes on selection and long Markdown stays inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "浏览笔记", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /第一条笔记 中文/ }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByLabel("笔记标题")).toHaveValue("第一条笔记");
  await page
    .getByLabel("MARKDOWN", { exact: true })
    .fill(
      "## 移动端记录\n\n" +
        "很长的内容".repeat(60) +
        "\n\n```\n" +
        "x".repeat(200) +
        "\n```\n\n| 项目 | 状态 |\n|---|---|\n| 页面 | 正常 |\n",
    );
  await page.getByRole("button", { name: "预览", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("mobile.png"),
    fullPage: true,
  });
});

test("category forms, Markdown download, preview and desktop layout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "新建分类", exact: true }).click();
  await page.getByLabel("分类名称", { exact: true }).fill("临时分类");
  await page.getByLabel("分类名称", { exact: true }).press("Enter");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "删除分类 临时分类", exact: true })
    .click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page.getByRole("alertdialog")).not.toBeVisible();
  await page.getByLabel("笔记标题").fill("把想法，慢慢变成知识");
  await page
    .getByLabel("MARKDOWN", { exact: true })
    .fill(
      "## 一点一滴，都是积累\n\n不必等到想清楚才开始记录。把当下的想法留下来，未来的自己会找到新的连接。\n\n### 今天的小计划\n\n- [x] 整理一周的阅读笔记\n- [x] 收集值得尝试的灵感\n- [ ] 留一点时间，自由书写\n\n> 记录，是与未来的自己对话。\n\n### 常用片段\n\n```bash\ngit status\ngit log --oneline -5\n```\n\n| 习惯 | 频率 |\n| --- | --- |\n| 自由记录 | 每天 |\n| 回顾整理 | 每周 |\n",
    );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出 Markdown", exact: true })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "把想法，慢慢变成知识.md",
  );
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: test.info().outputPath("desktop.png") });
});

test("login form shows errors and enters the workspace", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/login");
  await page.getByLabel("访问密码", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "进入我的笔记", exact: true }).click();
  await expect(page.locator("#login-error")).toContainText("密码不正确");
  await page
    .getByLabel("访问密码", { exact: true })
    .fill("browser-test-password");
  await page.getByRole("button", { name: "进入我的笔记", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await context.close();
});

test("upload finishes against the latest draft after switching notes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("笔记标题")).toHaveValue("第二条笔记");
  await page.getByLabel("MARKDOWN", { exact: true }).fill("上传前的草稿");
  let releaseUpload!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });
  await page.route("**/api/attachments", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    const started = page.waitForRequest((request) =>
      request.url().endsWith("/api/attachments"),
    );
    await page
      .getByLabel("选择图片")
      .setInputFiles({
        name: "迟到的图片.png",
        mimeType: "image/png",
        buffer: png,
      });
    await started;
    await page.getByRole("button", { name: /第一条笔记 中文/ }).click();
    await expect(page.getByLabel("笔记标题")).toHaveValue("第一条笔记");
    await page.getByRole("button", { name: /第二条笔记 第二/ }).click();
    await expect(page.getByLabel("笔记标题")).toHaveValue("第二条笔记");
    await page.getByLabel("MARKDOWN", { exact: true }).fill("上传期间的新编辑");
    releaseUpload();
    await expect(page.getByLabel("MARKDOWN", { exact: true })).toHaveValue(
      /上传期间的新编辑[\s\S]*迟到的图片/,
    );
  } finally {
    releaseUpload();
  }
});
