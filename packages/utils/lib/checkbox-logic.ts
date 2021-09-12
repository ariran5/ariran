export interface IProps<T extends IItem> {
  isActive: (item: T, value: T[]) => boolean
  value: T[]
  item: T
  multiple: boolean
}

export interface IItem {
  text: string
  value: string | number
}

export function toggleItem<T extends IItem>({
  isActive,
  value,
  item,
  multiple = false,
}: IProps<T>) {
  let newVal = value.slice()

  if (!multiple && value.length > 1) {
    // если в значении несколько вариантов и мы выбираем активный, он остается один активный
    newVal.splice(0, newVal.length)
    newVal.push(item)
  } else if (isActive(item, value)) {
    const index = newVal.findIndex((i) => i.value === item.value)
    index + 1 && newVal.splice(index, 1) // если есть индекс
  } else {
    !multiple && newVal.splice(0, newVal.length)

    newVal.push(item)
  }

  return newVal
}

export function isActive<T extends IItem>(item: T, value: T[]): boolean {
  return !!~value.findIndex?.((v) => v.value === item.value)
}
