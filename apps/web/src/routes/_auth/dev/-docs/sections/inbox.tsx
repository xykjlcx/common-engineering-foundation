import { useState } from 'react';
import { Bell, Info } from 'lucide-react';
import { InboxDetailHeading, InboxList, InboxNavigation } from '@/components/pro/Inbox';
import { Button } from '@/components/ui/button';

export default function InboxMatrix() {
  const [active, setActive] = useState('one');
  return (
    <section data-testid="inboxMatrix" className="grid gap-5 p-5">
      <div className="flex h-80 overflow-hidden rounded-8 border border-(--pro-panel-border)">
        <div className="w-48 border-r border-(--page-pane-divider)">
          <InboxNavigation
            title="Inbox"
            items={[
              { id: 'all', label: 'All', count: 12 },
              { id: 'system', label: 'System', count: 5 },
              { id: 'archived', label: 'Archived' },
            ]}
            activeId="all"
            onSelect={() => {}}
            footer={
              <Button variant="secondary" size="sm">
                Preferences
              </Button>
            }
          />
        </div>
        <div className="w-80 border-r border-(--page-pane-divider)">
          <InboxList
            label="Messages"
            items={[
              {
                id: 'one',
                title: 'System maintenance',
                description: 'Save work before the upgrade.',
                time: '10:20',
                unread: true,
                icon: <Bell />,
                tone: 'warning',
              },
              {
                id: 'two',
                title: 'Import completed',
                description: '36 accounts imported successfully.',
                time: '09:58',
                unread: false,
                icon: <Info />,
                tone: 'info',
              },
            ]}
            activeId={active}
            onSelect={(id) => setActive(id)}
            loading={false}
            error={false}
            emptyLabel="No messages"
            errorLabel="Failed to load"
            retryLabel="Retry"
            onRetry={() => {}}
          />
        </div>
        <div className="min-w-0 flex-1">
          <InboxDetailHeading
            title="System maintenance"
            meta="Today 10:20 · Admin"
            actions={
              <Button variant="secondary" size="xs">
                Archive
              </Button>
            }
          >
            <p>Save work before the upgrade.</p>
          </InboxDetailHeading>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <InboxList
          label="Loading"
          items={[]}
          onSelect={() => {}}
          loading
          error={false}
          emptyLabel="Empty"
          errorLabel="Failed"
          retryLabel="Retry"
          onRetry={() => {}}
        />
        <InboxList
          label="Empty"
          items={[]}
          onSelect={() => {}}
          loading={false}
          error={false}
          emptyLabel="No messages"
          errorLabel="Failed"
          retryLabel="Retry"
          onRetry={() => {}}
        />
        <InboxList
          label="Error"
          items={[]}
          onSelect={() => {}}
          loading={false}
          error
          emptyLabel="Empty"
          errorLabel="Failed to load"
          retryLabel="Retry"
          onRetry={() => {}}
        />
      </div>
    </section>
  );
}
