import { useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: string | undefined
}

/**
 * Загрузка данных из слоя `api` в компонентах: единообразные состояния
 * loading / error / data. `deps` управляет перезапросом.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    loading: true,
    error: undefined,
  })

  useEffect(() => {
    let active = true
    setState((prev) => ({ ...prev, loading: true, error: undefined }))
    loader()
      .then((data) => {
        if (active) setState({ data, loading: false, error: undefined })
      })
      .catch((err: unknown) => {
        if (active)
          setState({
            data: undefined,
            loading: false,
            error: err instanceof Error ? err.message : 'Не удалось загрузить данные',
          })
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
