import type { LineString, Point, Position } from 'geojson'
import type { ObjectKind } from '@/pages/main/types/waterObjects'

export type WaterGeometry = Point | LineString

export function geometryFromVertices(kind: ObjectKind, vertices: Position[]): WaterGeometry | null {
  if (kind === 'points') return vertices.length === 1 ? { type: 'Point', coordinates: vertices[0] } : null
  return vertices.length >= 2 ? { type: 'LineString', coordinates: vertices } : null
}

export function validateGeometry(kind: ObjectKind, geometry: WaterGeometry | null): asserts geometry is WaterGeometry {
  if (!geometry || geometry.type !== (kind === 'pipes' ? 'LineString' : 'Point')) {
    throw new Error(kind === 'pipes' ? 'Tegn en ledning med minst to punkter.' : 'Velg plasseringen i kartet.')
  }
  const vertices = geometry.type === 'Point' ? [geometry.coordinates] : geometry.coordinates
  if (vertices.length < (kind === 'pipes' ? 2 : 1) || vertices.some((p) =>
    p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90,
  )) throw new Error('Koordinatene må være gyldige WGS84-koordinater.')
  if (kind === 'pipes' && !vertices.some((p) => p[0] !== vertices[0][0] || p[1] !== vertices[0][1])) {
    throw new Error('Ledningen må ha minst to ulike punkter.')
  }
}
