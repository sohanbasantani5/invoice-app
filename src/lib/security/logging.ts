export function safeErrorInfo(error: unknown): { name: string; code?: string } {
  if (error instanceof Error) {
    const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
    return { name: error.name || "Error", ...(code ? { code } : {}) };
  }
  return { name: "UnknownError" };
}

