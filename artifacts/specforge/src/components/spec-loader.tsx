export function SpecLoader({ label = "Preparing your draft…" }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-56 place-content-center justify-items-center gap-3 p-6 text-center">
      <div aria-hidden="true" className="spec-loader rounded-sm border border-primary/35 bg-card">
        <span /><span /><span />
      </div>
      <span className="font-mono text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
