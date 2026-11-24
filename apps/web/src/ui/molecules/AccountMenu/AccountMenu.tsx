import type React from "react";
import { CircleUser } from "lucide-react";
import { Button } from "@/ui/atoms/Button";
import { Icon } from "@/ui/atoms/Icon";
import { SIGN_IN_KEY, signInHref, type SignInProvider } from "@/ui/helpers/account";
import { useT } from "@/ui/hooks/useT";
import type { AccountMenuProps } from "./AccountMenu.types";

const PROVIDER_NAME: Record<SignInProvider, string> = { github: "GitHub", google: "Google" };

export const AccountMenu: React.FC<AccountMenuProps> = ({ me, providers, returnTo, authError, menuOpen, onToggle, onSignOut }) => {
  const t = useT();
  const signedIn = me?.signedIn === true;
  const initials = me?.displayName?.trim().charAt(0).toUpperCase() ?? "";
  return (
    <div data-account-menu className="relative flex items-center gap-3">
      {authError && (
        <p role="alert" className="text-sm text-stop">
          {authError}
        </p>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={t("account.menu")}
        onClick={onToggle}
        className="grid size-11 place-items-center overflow-hidden rounded-full border border-rule bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
      >
        {signedIn && me.avatarUrl ? (
          <img src={me.avatarUrl} alt="" width={44} height={44} className="size-full object-cover" />
        ) : signedIn && initials ? (
          <span className="font-display text-base font-bold">{initials}</span>
        ) : (
          <Icon icon={CircleUser} size={22} />
        )}
      </button>
      {menuOpen && (
        <div role="menu" aria-label={t("account.menu")} className="absolute right-0 top-14 z-10 flex w-64 flex-col gap-2 rounded-2xl border border-rule bg-surface p-3">
          {signedIn ? (
            <>
              <p className="font-semibold">{me.displayName ?? t("account.signedInAs")}</p>
              <p className="text-sm text-ink-soft">
                {t("account.signedInWith")}: {me.providers.filter((p) => p === "github" || p === "google").map((p) => PROVIDER_NAME[p as SignInProvider]).join(", ") || "—"}
              </p>
              <Button role="menuitem" variant="secondary" onClick={onSignOut}>
                {t("account.signOut")}
              </Button>
            </>
          ) : (
            providers.map((provider) => (
              <a
                key={provider}
                role="menuitem"
                href={signInHref(provider, returnTo)}
                className="inline-flex min-h-11 items-center rounded-xl border border-ink px-4 font-semibold text-ink hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-sky"
              >
                {t(SIGN_IN_KEY[provider])}
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
};
