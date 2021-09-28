import { style } from '@vanilla-extract/css'

import { theme } from '~/common/theme'

export const root = style({
  padding: 0,
  margin: 0,
  listStyle: 'none',
})

export const header = style({
  display: 'flex',
  alignItems: 'center',
  marginBottom: 24,
})

export const title = style({})

export const tabs = style({
  marginLeft: 'auto',
})

export const select = style({
  padding: '8px 16px',
  fontSize: 16,
  lineHeight: '24px',
  color: theme.colors.textColorGrey,
  marginLeft: 16,
})

export const selectArrow = style({
  width: 8,
  height: 4,
  marginLeft: 8,
  verticalAlign: 'middle',
  marginTop: '-4px',
  transform: 'rotate(180deg)',
})

export const create = style({
  padding: 8,
  marginLeft: 16,
})

export const tableHeader = style({
  color: theme.colors.textColorGrey,
})

export const listItem = style({
  selectors: {
    '&:not(:last-child)': {
      borderBottom: `1px solid ${theme.colors.common.white2}`,
    },
  },
})

export const row = style({
  display: 'grid',
  gridTemplateColumns: '21% 15% 10% 14% 14% 12% 1fr',
  padding: '16px 24px',
})

export const card = style({})

export const red = style({
  color: theme.colors.common.red1,
})

export const lightGreen = style({
  color: theme.colors.common.green1,
})

export const green = style({
  color: theme.colors.common.green2,
})

export const tableCol = style({
  display: 'flex',
  alignItems: 'center',
})

export const coinIcons = style({
  display: 'inline-flex',
  alignItems: 'center',
  marginRight: 10,
})

export const coinIcon = style({
  width: 16,
  height: 16,

  selectors: {
    '&:first-child': {
      marginRight: -1,
    },
    '&:last-child': {
      marginLeft: -1,
    },
  },
})

export const accorionButton = style({
  marginLeft: 'auto',
  marginRight: -12,
  color: theme.colors.textColorGrey,
})

export const manageButton = style({
  width: 24,
  height: 24,
  padding: 6,
  marginLeft: 'auto',
})