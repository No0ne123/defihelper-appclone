import { style } from '@vanilla-extract/css'

import { theme } from '~/common/theme'

export const root = style({})

export const hide = style({
  display: 'none',

  '@media': {
    [theme.mediaQueries.md()]: {
      display: 'flex',
    },
  },
})

export const header = style([
  hide,
  {
    marginBottom: 28,
    alignItems: 'center',
  },
])

export const select = style({
  marginBottom: 28,
  maxWidth: 200,
})

export const empty = style({
  display: 'flex',
  padding: '9px 9px 9px 18px',
  minHeight: 56,
  alignItems: 'center',
})

export const tabs = style({
  marginLeft: 'auto',
})

export const search = style({
  width: 211,
  marginLeft: 24,
})

export const create = style({
  marginLeft: 24,
})

export const protocols = style({
  padding: 0,
  margin: 0,
  listStyle: 'none',

  selectors: {
    '&:not(:last-child)': {
      marginBottom: 10,
    },
  },
})

export const proposalsHeader = style({
  alignItems: 'center',
  gridTemplateColumns: '1fr 21% 13% 12% 18% 19% 8%',
  color: theme.colors.textColorGrey,
  marginBottom: 8,
  display: 'none',

  '@media': {
    [theme.mediaQueries.md()]: {
      display: 'grid',
    },
  },
})

export const name = style({
  gridColumnStart: 2,
})

export const hiddenItem = style({
  opacity: 0.3,
  filter: 'sepia(.8)',
})

export const item = style({
  width: '100%',

  selectors: {
    '&:not(:last-child)': {
      marginBottom: 8,
    },
  },
})

export const action = style({
  display: 'flex',
  gap: 8,
})

export const searchButton = style({
  backgroundColor: theme.colors.paper,
  padding: 4,
  borderRadius: 6,
})

export const createMobile = style({
  width: 24,
  height: 24,
  padding: 6,
  borderRadius: 6,
})

export const loader = style({
  padding: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

export const profit = style({
  marginRight: 10,
})
