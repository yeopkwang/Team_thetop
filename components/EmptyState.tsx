export default function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <p className="text-lead font-bold text-ink">{title}</p>
      {description && <p className="mt-2 max-w-sm text-ui text-ink-2">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
