const messages: Record<string, string> = {
  UNAUTHORIZED: "登录已过期，请先导出未保存的草稿，再重新登录。",
  INVALID_PASSWORD: "密码不正确，请重试。",
  CATEGORY_NAME_EXISTS: "已经有同名分类，请换一个名称。",
  CATEGORY_HAS_NOTES: "请先移动或删除分类中的笔记。",
  CATEGORY_NOT_FOUND: "分类已不存在，请刷新后重试。",
  NOTE_NOT_FOUND: "笔记已不存在，请刷新列表。",
  VALIDATION_ERROR: "输入格式不正确，请检查名称、标题或内容长度。",
};

export async function requestApi<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      messages[payload?.code] ?? payload?.error ?? "请求失败，请稍后重试。",
    );
  if (!payload) throw new Error("服务器返回了无效响应，请稍后重试。");
  return payload as T;
}

export function jsonRequest(method: string, data: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
