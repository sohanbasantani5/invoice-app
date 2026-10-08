export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Workspace</p>
        <h1 className="text-display">{title}</h1>
        {description && <p className="mt-1 text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
