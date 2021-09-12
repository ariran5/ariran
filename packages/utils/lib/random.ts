/** Случайное число от from до to */
export function random(from: number, to: number) {
  const diff = to - from
  return Math.floor(from + Math.random() * diff)
}

/** Случайный элемент массива от from включительно до to не включительно */
export function randomFromArray<T>(
  arr: T[],
  from: number = 0,
  to: number = arr.length,
): T {
  return arr[random(from, to)]
}
