export function sanitizeNextPath(nextPath: string | undefined): string {
  if (
    !nextPath ||
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//") ||
    /[\\\x00-\x20\x7f]/.test(nextPath)
  ) {
    return "/";
  }
  const url = new URL(nextPath, "https://notes.local");
  if (
    url.origin !== "https://notes.local" ||
    url.pathname === "/login" ||
    url.pathname.startsWith("/api/")
  )
    return "/";
  return nextPath;
}
