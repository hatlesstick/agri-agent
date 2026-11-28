export type ApprovalRow = { label: string; value: string };

export type ApprovalCardProps = {
  title: string;
  rows: ApprovalRow[];
  status: "awaiting" | "confirmed";
  confirmable?: boolean;
  onConfirm: () => void;
  onReject: () => void;
};
