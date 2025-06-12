import type React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline text-foreground">{title}</h1>
        {actions && <div className="ml-4">{actions}</div>}
      </div>
      {description && (
        <p className="mt-1 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
