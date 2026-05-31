"use client";

import type { ValidationResult } from "@/types/common";

export function ValidationPanel({ validation }: { validation?: ValidationResult }): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Validation</h2>
      {!validation ? <p className="mt-3 text-sm text-slate-400">Awaiting validation.</p> : (
        <div className="mt-3 text-sm">
          <p className={validation.valid ? "text-emerald-300" : "text-red-300"}>{validation.valid ? "Valid" : "Invalid"}</p>
          <ul className="mt-2 space-y-1">
            {validation.errors.map((error, index) => <li key={`${error.path}-${index}`} className="text-slate-300">{error.code}: {error.message} <span className="text-slate-500">({error.path})</span></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
