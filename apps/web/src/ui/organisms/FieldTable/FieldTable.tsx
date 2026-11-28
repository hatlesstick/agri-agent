import type React from "react";
import { useT } from "@/ui/hooks/useT";
import { Skeleton } from "@/ui/atoms/Skeleton";
import type { FieldTableProps } from "./FieldTable.types";

export const FieldTable: React.FC<FieldTableProps> = ({ fields, loading = false, failed = false }) => {
  const t = useT();
  if (failed) return <p className="text-stop">{t("fields.error")}</p>;
  if (loading) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        {[0, 1, 2].map((slot) => (
          <Skeleton key={slot} className="h-5 w-full" />
        ))}
      </div>
    );
  }
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
          <tr key={field.id} className="border-b border-rule">
            <td className="break-words py-2">{field.name}</td>
            <td className="break-words py-2">{field.crop ?? "—"}</td>
            <td className="py-2 text-right tabular-nums">{field.areaHa ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
