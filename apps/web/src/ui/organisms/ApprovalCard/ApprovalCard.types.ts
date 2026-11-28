export type ApprovalRow = { label: string; value: string };

export type ApprovalCardProps = {
  title: string;
  rows: ApprovalRow[];
  status: "awaiting" | "confirmed";
  onConfirm: () => void;
  onReject: () => void;
};
