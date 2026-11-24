import type React from "react";
import { Button } from "@/ui/atoms/Button";
import { signInHref, signInLabel } from "@/ui/helpers/account";
import type { AccountMenuProps } from "./AccountMenu.types";

export const AccountMenu: React.FC<AccountMenuProps> = ({ me, providers, returnTo, authError, onSignOut }) => (
  <section aria-label="Account" className="flex flex-wrap items-center gap-3">
    {authError && <p role="alert">{authError}</p>}
    {me?.signedIn ? (
      <>
        {me.avatarUrl && <img src={me.avatarUrl} alt="" width={32} height={32} className="rounded-full" />}
        <span>{me.displayName ?? "Signed in"}</span>
        <Button variant="secondary" onClick={onSignOut}>
          Sign out
        </Button>
      </>
    ) : (
      providers.map((provider) => (
        <a key={provider} href={signInHref(provider, returnTo)} className="inline-flex min-h-11 items-center rounded-lg border px-4">
          {signInLabel(provider)}
        </a>
      ))
    )}
  </section>
);
