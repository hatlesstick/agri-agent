export type ApprovalRow = { label: string; value: string };

export type ApprovalCardProps = {
  rows: ApprovalRow[];
  status: "awaiting" | "confirmed";
  onSave: () => void;
  onEdit: () => void;
  onCancel: () => void;
};
