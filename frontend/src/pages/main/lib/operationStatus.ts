import type { ExpressionSpecification } from 'maplibre-gl'

export const operationStatuses = {
  unknown: { label: 'Ukjent', color: '#02c4e6' },
  operational: { label: 'Operativ', color: '#16a34a' },
  'non-operational': { label: 'Ute av drift', color: '#dc2626' },
  'maintenance-needed': { label: 'Vedlikehold kreves', color: '#6a05f7' },
} as const
export type OperationStatus = keyof typeof operationStatuses
export const statusFallback = { label: 'Ikke angitt / annen status', color: '#000000' }
// Preserve raw database values on edit; only presentation normalizes legacy aliases.
export const statusAliases = { not_operational: 'non-operational', maintenance: 'maintenance-needed' } as const
export function operationStatusExpression(value: (status: OperationStatus) => string, fallback: string): ExpressionSpecification {
  return ['match', ['get', 'status'], 'unknown', value('unknown'),
    ...Object.keys(operationStatuses).filter(status => status !== 'unknown').flatMap(status => [status, value(status as OperationStatus)]),
    ...Object.entries(statusAliases).flatMap(([alias, status]) => [alias, value(status)]),
    fallback]
}
