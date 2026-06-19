/**
 * Небольшой помощник для mock-ресурсов с правом записи.
 *
 * Все «редактируемые из админки» ресурсы (программы, новости, события, форум)
 * хранят данные в localStorage. Здесь — общая логика чтения/записи и генерации
 * человекочитаемых id-слагов, чтобы не дублировать её в каждом ресурсе.
 */

/** Транслитерация заголовка в безопасный id-слаг. */
export function slugify(value: string, fallback = 'item'): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ' ': '-',
  }
  const base = value
    .toLowerCase()
    .split('')
    .map((ch) => (ch in map ? map[ch] : /[a-z0-9-]/.test(ch) ? ch : ''))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || fallback
}

/** Возвращает id, не пересекающийся с уже занятыми (добавляет -2, -3 …). */
export function uniqueId(desired: string, taken: Set<string>): string {
  let id = desired
  if (taken.has(id)) {
    let n = 2
    while (taken.has(`${id}-${n}`)) n += 1
    id = `${id}-${n}`
  }
  return id
}

/** Хранилище коллекции в localStorage с откатом к сид-данным. */
export function makeStore<T>(key: string, seed: T[]) {
  return {
    read(): T[] {
      try {
        const raw = localStorage.getItem(key)
        if (raw === null) return seed
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? (parsed as T[]) : seed
      } catch {
        return seed
      }
    },
    write(list: T[]): void {
      localStorage.setItem(key, JSON.stringify(list))
    },
    reset(): T[] {
      localStorage.setItem(key, JSON.stringify(seed))
      return seed
    },
  }
}
