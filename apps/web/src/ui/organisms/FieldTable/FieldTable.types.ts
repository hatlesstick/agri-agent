export type FieldRow = { id: string; name: string; crop: string | null; areaHa: number | null };

export type FieldTableProps = { fields: FieldRow[]; loading?: boolean; failed?: boolean };
