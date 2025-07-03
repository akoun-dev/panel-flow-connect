import { moveItem } from '@/lib/reorder'

describe('moveItem', () => {
  it('moves element to new index', () => {
    const arr = ['a', 'b', 'c']
    expect(moveItem(arr, 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(arr, 0, 2)).toEqual(['b', 'c', 'a'])
  })
})
