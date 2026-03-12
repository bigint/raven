import { type RefObject, useEffect, useRef, useState } from 'react'

interface UseRevealOnceResult<T extends HTMLElement> {
  readonly ref: RefObject<T | null>
  readonly isVisible: boolean
}

export const useRevealOnce = <T extends HTMLElement>(threshold = 0.1): UseRevealOnceResult<T> => {
  const ref = useRef<T | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element || isVisible) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [isVisible, threshold])

  return { ref, isVisible }
}
