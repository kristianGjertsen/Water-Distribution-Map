// shape: circle eller square. radius er sirkelradius / halv sidelengde i piksler.
export type PointStyle = {
  shape: 'circle' | 'square'
  color: string
  radius: number
  strokeColor: string
  strokeWidth: number
}

export const pointTypes: Record<'Stoppekran' | 'Pumpehus' | 'Tankhus', PointStyle> = {
  Stoppekran: {
    shape: 'circle',
    color: '#ffaa00',
    radius: 5,
    strokeColor: '#000000',
    strokeWidth: 2,
  },
  Pumpehus: {
    shape: 'square',
    color: '#9333ea',
    radius: 15,
    strokeColor: '#000000',
    strokeWidth: 2,
  },
  Tankhus: {
    shape: 'square',
    color: '#0891b2',
    radius: 15,
    strokeColor: '#000000',
    strokeWidth: 2,
  },
}

// Kran bruker samme ikoninnstillinger som Stoppekran.
export const pointTypeAliases: Record<string, keyof typeof pointTypes> = {
  Kran: 'Stoppekran',
}

export const fallbackPointStyle: PointStyle = {
  shape: 'circle', color: '#ffaa00', radius: 5, strokeColor: '#000000', strokeWidth: 2,
}

// Ikke-synlige punkter beholder størrelsen fra sin punkttype.
export const hiddenPointStyle = {
  color: '#9ca3af', strokeColor: '#000000', strokeWidth: 2,
}

export const selectedPointStyle = {
  color: '#22d3ee', padding: 3,
}

export const draftPointStyle: PointStyle = {
  shape: 'circle', color: '#0284c7', radius: 8, strokeColor: '#ffffff', strokeWidth: 2,
}
