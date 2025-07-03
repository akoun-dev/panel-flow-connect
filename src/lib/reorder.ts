export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const newArr = [...arr]
  const [item] = newArr.splice(from, 1)
  newArr.splice(to, 0, item)
  return newArr
}
