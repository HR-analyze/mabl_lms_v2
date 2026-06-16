import { Link } from 'react-router-dom'
import type { AppNotification } from '@/types'
import { Bell, Book, Calendar, Chat, Clipboard, Document } from './ui/Icon'
import { notificationKindLabel } from '@/lib/labels'
import { formatDateTime, cn } from '@/lib/utils'

const iconByKind = {
  course: Book,
  event: Calendar,
  forum: Chat,
  system: Document,
  survey: Clipboard,
}

interface NotificationItemProps {
  notification: AppNotification
  onRead?: (id: string) => void
}

/** Строка уведомления для центра уведомлений и дашборда. */
export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const Icon = iconByKind[notification.kind] ?? Bell
  const body = (
    <div className="flex gap-4 py-4">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-card border',
          notification.read ? 'border-ink-10 text-ink-40' : 'border-oceanc-20 bg-oceanc-10 text-ocean',
        )}
      >
        <Icon width={18} height={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-ocean" />}
          <p className="truncate font-medium text-neft">{notification.title}</p>
          <span className="ml-auto shrink-0 text-[0.7rem] uppercase tracking-wide text-ink-40">
            {notificationKindLabel[notification.kind]}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-60">{notification.text}</p>
        <p className="mt-1.5 text-[0.72rem] text-ink-40">{formatDateTime(notification.date)}</p>
      </div>
    </div>
  )

  const className = 'block border-b border-ink-10 px-1 transition-colors hover:bg-ink-5'

  if (notification.href) {
    return (
      <Link to={notification.href} className={className} onClick={() => onRead?.(notification.id)}>
        {body}
      </Link>
    )
  }
  return (
    <div className={className} onClick={() => onRead?.(notification.id)}>
      {body}
    </div>
  )
}
