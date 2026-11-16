type PostgresError = { code?: string; constraint?: string; cause?: unknown };

export function isUniqueViolation(error: unknown, constraint: string): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 3; depth += 1) {
    const candidate = current as PostgresError;
    if (candidate.code === "23505") return candidate.constraint === undefined || candidate.constraint === constraint;
    current = candidate.cause;
  }
  return false;
}
