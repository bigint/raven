import { requestLogs } from '@raven/db'
import { gte, lte } from 'drizzle-orm'

import { ValidationError } from '../../lib/errors.js'

export const parseDateRange = (from?: string, to?: string) => {
  const conditions: ReturnType<typeof gte>[] = []

  if (from) {
    const fromDate = new Date(from)
    if (Number.isNaN(fromDate.getTime())) {
      throw new ValidationError('Invalid `from` date')
    }
    conditions.push(gte(requestLogs.createdAt, fromDate))
  }

  if (to) {
    const toDate = new Date(to)
    if (Number.isNaN(toDate.getTime())) {
      throw new ValidationError('Invalid `to` date')
    }
    conditions.push(lte(requestLogs.createdAt, toDate))
  }

  return conditions
}
