import type { Request } from "express";
import type { OAuthProvider } from "@/modules/identity/auth/auth.types";
import { createOAuthState, decodeFlowCookie, encodeFlowCookie, OAUTH_FLOW_COOKIE, oauthFlowCookieOptions, safeReturnPath, sameValue } from "@/modules/identity/auth/oauth-flow";
import { readCookie } from "@/modules/identity/session/session-cookie";

export class FlowStateStore {
  constructor(private readonly provider: OAuthProvider) {}

  store(req: Request, codeVerifier: string, state: string | undefined, meta: unknown, callback: (error: Error | null, state?: string) => void): void {
    if (!req.res) {
      callback(new Error("OAuth flow needs an HTTP response"));
      return;
    }
    const issued = createOAuthState();
    const returnTo = safeReturnPath(typeof req.query.returnTo === "string" ? req.query.returnTo : undefined);
    req.res.cookie(OAUTH_FLOW_COOKIE, encodeFlowCookie({ provider: this.provider, state: issued, codeVerifier, returnTo }), oauthFlowCookieOptions);
    callback(null, issued);
  }

  verify(req: Request, state: string | undefined, meta: unknown, callback: (error: Error | null, ok: string | false, info?: string) => void): void {
    const flow = decodeFlowCookie(readCookie(req.headers.cookie, OAUTH_FLOW_COOKIE));
    if (!flow || flow.provider !== this.provider || !state || !sameValue(flow.state, state)) {
      callback(null, false, "state_mismatch");
      return;
    }
    callback(null, flow.codeVerifier, flow.returnTo);
  }
}
