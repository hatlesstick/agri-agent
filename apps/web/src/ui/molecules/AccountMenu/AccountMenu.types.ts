import type { MeResponse } from "@agri/shared/contracts";
import type { SignInProvider } from "@/ui/helpers/account";

export type AccountMenuProps = {
  me: MeResponse | null;
  providers: SignInProvider[];
  returnTo: string;
  authError: string | undefined;
  menuOpen: boolean;
  onToggle: () => void;
  onSignOut: () => void;
};
