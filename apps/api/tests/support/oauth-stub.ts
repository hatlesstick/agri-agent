import { Passport } from "passport";
import type { Request } from "express";
import type { FlowStateStore } from "@/modules/identity/auth/FlowStateStore";
import type { OAuthRuntime } from "@/modules/identity/auth/passport-strategies";

export const ORIGIN = "https://agri-agent-m.vercel.app";

function providerStub(store: FlowStateStore) {
  return {
    name: "github",
    authenticate(this: Record<string, (...args: unknown[]) => void>, req: Request) {
      if (req.path.endsWith("/start")) {
        store.store(req, "verifier-stub", undefined, {}, (error, state) => (error ? this.error(error) : this.redirect(`https://github.com/login/oauth/authorize?state=${state}`)));
        return;
      }
      store.verify(req, req.query.state as string | undefined, {}, (error, ok) => {
        if (error) return this.error(error);
        if (!ok) return this.fail(403);
        if (req.query.code === "bad") return this.error(new Error("exchange failed"));
        const providerUserId = req.query.code === "ok-43" ? "43" : "42";
        this.success({ providerUserId, displayName: "Ann", avatarUrl: "https://a.example/42" });
      });
    },
  };
}

export function runtimeWithStub(store: FlowStateStore): OAuthRuntime {
  const passport = new Passport();
  passport.use("github", providerStub(store) as never);
  return { passport, providers: ["github"] };
}

export function cookieValue(setCookie: string[] | string | undefined, name: string): string | undefined {
  return [setCookie ?? []].flat().find((value) => value.startsWith(`${name}=`))?.split(";")[0];
}
