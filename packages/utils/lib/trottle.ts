export function throttle<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
  delay = 50,
  ctx?: object,
) {
  let last = 0
  let timeout: ReturnType<typeof setTimeout> | void
  let lastArgs: TArgs

  return (...args: TArgs) => {
    const now = Date.now()
    if (now - last < delay) {
      if (!timeout) {
        timeout = setTimeout(() => {
          last = now
          fn.call(ctx, ...lastArgs)
          timeout = undefined
        }, delay - (now - last))
      }
      lastArgs = args
      return
    }

    last = now
    fn.call(ctx, ...args)
  }
}
