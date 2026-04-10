const DOCKER_STARTUP_COMMANDS = [
  {
    command: "pnpm",
    args: ["prisma:migrate:deploy"],
    name: "migrate",
  },
  {
    command: "pnpm",
    args: ["start", "--hostname", "0.0.0.0", "--port", "3000"],
    name: "start",
  },
];

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getDockerStartupCommands() {
  return DOCKER_STARTUP_COMMANDS.map((step) => ({
    ...step,
    args: [...step.args],
  }));
}

export async function waitForDatabase({
  connect,
  maxAttempts = 30,
  retryDelayMs = 2000,
  onRetry,
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const connection = await connect();
      await connection.end();
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        break;
      }

      onRetry?.({
        attempt,
        maxAttempts,
        error: lastError,
      });

      await wait(retryDelayMs);
    }
  }

  throw new Error(
    `Database did not become ready after ${maxAttempts} attempts. Last error: ${lastError?.message ?? "unknown error"}`
  );
}
