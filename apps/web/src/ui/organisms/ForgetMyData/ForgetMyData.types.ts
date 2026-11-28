export type ForgetMyDataProps = {
  pending: boolean;
  failed: boolean;
  result: { fields: number; actions: number; conversations: number } | null;
  onConfirm: () => void;
};
