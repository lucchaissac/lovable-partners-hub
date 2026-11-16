import type { HTMLAttributes, ReactNode } from 'react';
import { PageHeader, type PageHeaderTone } from './PageHeader';
import { cn } from '../lib/cn';
import './page-frame.css';

export type PageFrameProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  sidebar?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  center?: ReactNode;
  navigation?: ReactNode;
  toolbar?: ReactNode;
  tone?: PageHeaderTone;
};

/** App page composition. Routing, navigation state and data stay with the host. */
export function PageFrame({ sidebar, title, actions, center, navigation, toolbar, tone, children, className, ...props }: PageFrameProps) {
  return <div className={cn('ui-page-frame', className)} {...props}>
    {sidebar && <div className="ui-page-frame-sidebar">{sidebar}</div>}
    <main className="ui-page-frame-main">
      <PageHeader title={title} center={center} actions={actions} tone={tone} />
      {navigation}
      {toolbar}
      <div className="ui-page-frame-content">{children}</div>
    </main>
  </div>;
}
