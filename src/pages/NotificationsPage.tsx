import { NotificationItem } from '@/components/NotificationItem'
import { Button } from '@/components/ui/Button'
import { Bell } from '@/components/ui/Icon'
import { useNotifications } from '@/context/NotificationsContext'

export default function NotificationsPage() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications()

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Центр уведомлений</p>
          <h1 className="font-serif text-3xl text-neft">Уведомления</h1>
          <p className="mt-2 text-ink-60">
            {unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Все уведомления прочитаны'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            Прочитать всё
          </Button>
        )}
      </div>

      <div className="mt-8 rounded-card border border-ink-10 bg-wisdom px-5">
        {items.length > 0 ? (
          items.map((n) => (
            <NotificationItem key={n.id} notification={n} onRead={markRead} />
          ))
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <Bell width={28} height={28} className="text-ink-40" />
            <p className="mt-4 text-ink-60">Уведомлений пока нет</p>
          </div>
        )}
      </div>
    </div>
  )
}
