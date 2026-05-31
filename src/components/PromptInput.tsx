"use client";

export interface PromptInputProps {
  prompt: string;
  loading: boolean;
  onPromptChange: (prompt: string) => void;
  onSubmit: () => void;
}

export function PromptInput({ prompt, loading, onPromptChange, onSubmit }: PromptInputProps): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Prompt Input</h2>
      <textarea
        className="mt-3 h-32 w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Build a CRM with Slack alerts and Stripe invoicing"
      />
      <button
        className="mt-3 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        disabled={loading || prompt.trim().length === 0}
        onClick={onSubmit}
      >
        {loading ? "Generating" : "Generate AppSpec"}
      </button>
    </section>
  );
}
