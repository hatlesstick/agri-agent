import type React from "react";
import { useT } from "@/ui/hooks/useT";
import type { FieldTableProps } from "./FieldTable.types";

export const FieldTable: React.FC<FieldTableProps> = ({ fields }) => {
  const t = useT();
  if (fields.length === 0) {
    return (
      <section className="rounded-[20px] border border-dashed border-rule p-6">
        <h2 className="font-display text-lg font-bold">{t("fields.empty.title")}</h2>
        <p className="mt-2 text-ink-soft">{t("fields.empty.body")}</p>
      </section>
    );
  }
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-rule">
          <th scope="col" className="py-2 font-semibold">{t("fields.col.name")}</th>
          <th scope="col" className="py-2 font-semibold">{t("fields.col.crop")}</th>
          <th scope="col" className="py-2 text-right font-semibold">{t("fields.col.area")}</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <tr key={field.name} className="border-b border-rule">
            <td className="break-words py-2">{field.name}</td>
            <td className="break-words py-2">{field.crop}</td>
            <td className="py-2 text-right tabular-nums">{field.areaHa}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
