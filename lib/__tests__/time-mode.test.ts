import { describe, it, expect } from 'vitest'
import { isTimeMode } from '../time-mode'

describe('isTimeMode', () => {
  it.each(['depart', 'arrive'])('%s は時刻の指定方法', (v) => expect(isTimeMode(v)).toBe(true))
  it.each(['bogus', 'Depart', 'now', '', null, undefined, 1])('%s は時刻の指定方法でない', (v) => expect(isTimeMode(v)).toBe(false))
})
