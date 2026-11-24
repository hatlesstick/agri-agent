"use client";

import type React from "react";
import { useAccount } from "@/ui/hooks/useAccount";
import { AccountMenu } from "@/ui/molecules/AccountMenu";
import { LocaleSwitch } from "@/ui/organisms/LocaleSwitch";

export const AccountPanel: React.FC = () => {
  const account = useAccount();
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <LocaleSwitch />
      <AccountMenu
        me={account.me}
        providers={account.providers}
        returnTo={account.returnTo}
        authError={account.authError}
        menuOpen={account.menuOpen}
        onToggle={account.toggleMenu}
        onSignOut={() => void account.signOut()}
      />
    </div>
  );
};
