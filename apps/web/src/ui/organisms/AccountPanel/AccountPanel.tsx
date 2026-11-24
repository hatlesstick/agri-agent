"use client";

import type React from "react";
import { useAccount } from "@/ui/hooks/useAccount";
import { useT } from "@/ui/hooks/useT";
import { AccountMenu } from "@/ui/molecules/AccountMenu";
import { LocaleSwitch } from "@/ui/organisms/LocaleSwitch";
import { ThemeSwitch } from "@/ui/organisms/ThemeSwitch";

export const AccountPanel: React.FC = () => {
  const account = useAccount();
  const t = useT();
  return (
    <AccountMenu
      me={account.me}
      providers={account.providers}
      returnTo={account.returnTo}
      authError={account.authError}
      menuOpen={account.menuOpen}
      onToggle={account.toggleMenu}
      onSignOut={() => void account.signOut()}
      settings={
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{t("theme.label")}</span>
            <ThemeSwitch />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{t("locale.label")}</span>
            <LocaleSwitch />
          </div>
        </div>
      }
    />
  );
};
