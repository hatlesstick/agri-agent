import { forgetResponseSchema, type ForgetResponse } from "@agri/shared/contracts";

export class PrivacyRequestError extends Error {
  constructor(readonly status: number) {
    super(`forget request failed: ${status}`);
    this.name = "PrivacyRequestError";
  }
}

export async function forgetMyData(): Promise<ForgetResponse> {
  const response = await fetch("/api/forget", { method: "POST" });
  if (!response.ok) throw new PrivacyRequestError(response.status);
  return forgetResponseSchema.parse(await response.json());
}
