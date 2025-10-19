// src/components/reports/ReportMatrix.tsx
import React, { useMemo } from 'react';
import type { ReportRow } from '../../repositories/reports.repository';

type Props = { data: ReportRow[] };

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  PENDING_AI_VALIDATION: 'bg-yellow-100 text-yellow-800',
  AI_VALIDATED: 'bg-purple-100 text-purple-800',
  AI_APPROVED: 'bg-indigo-100 text-indigo-800',
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  AI_VALIDATION_FAILED: 'bg-rose-100 text-rose-800',
};

export default function ReportMatrix({ data }: Props) {
  const columns = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => Object.keys(r.form_statuses ?? {}).forEach((k) => set.add(k)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  if (!data || data.length === 0) return <p className="text-sm text-gray-600">No hay datos para mostrar.</p>;

  return (
    <div className="overflow-auto rounded-xl border border-gray-200">
      <table className="min-w-[720px] w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white border-b border-gray-200 p-3 text-left">Valor</th>
            {columns.map((col) => (
              <th key={col} className="border-b border-l border-gray-200 p-3 text-left">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.row_value}>
              <td className="sticky left-0 z-10 bg-white border-t border-gray-100 p-3 font-medium">
                {row.row_value || <span className="text-gray-400">—</span>}
              </td>
              {columns.map((col) => {
                const status = row.form_statuses?.[col] ?? '';
                const cls = status ? (STATUS_BADGE[status] ?? 'bg-gray-50 text-gray-700') : 'text-gray-400';
                return (
                  <td key={col} className="border-t border-l border-gray-100 p-2">
                    {status ? (
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>
                        {status}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
