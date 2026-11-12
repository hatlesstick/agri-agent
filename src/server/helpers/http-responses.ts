export function jsonError(error: string, status: number, headers?: Record<string, string>): Response {
  return Response.json({ error }, { status, headers });
}
