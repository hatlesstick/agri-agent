export type EvalRow = { suite: string; case: string; model: string; passed: number; runs: number; infraErrors?: number; failures: string };

const rows: EvalRow[] = [];

export function recordEval(row: EvalRow): void {
  rows.push(row);
}

export function printEvalReport(suite: string): void {
  const suiteRows = rows.filter((row) => row.suite === suite);
  const passed = suiteRows.reduce((total, row) => total + row.passed, 0);
  const runs = suiteRows.reduce((total, row) => total + row.runs, 0);
  console.log(`\n${suite}: ${passed}/${runs} runs passed`);
  console.table(
    suiteRows.map((row) => ({
      case: row.case,
      model: row.model,
      "pass rate": `${row.passed}/${row.runs}`,
      "infra errors": row.infraErrors ?? 0,
      failures: row.failures,
    })),
  );
}
