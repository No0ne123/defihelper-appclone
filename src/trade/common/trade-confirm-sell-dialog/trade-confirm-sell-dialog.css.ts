import { globalStyle, style } from '@vanilla-extract/css'

import { theme } from '~/common/theme'

export const root = style({
  height: 484,
  width: 560,
  padding: '12px 24px 32px',
  display: 'flex',
  flexDirection: 'column',
})

export const title = style({
  marginBottom: 32,
})

export const row = style({
  display: 'grid',
  gridTemplateColumns: '150px 1fr',
  alignItems: 'center',
  gap: 10,

  selectors: {
    '&:not(:last-of-type)': {
      marginBottom: 16,
    },
  },
})

globalStyle(`${row} > *:first-child`, {
  color: theme.colors.textColorGrey,
})

export const button = style({
  marginTop: 'auto',
})

export const buttonInner = style({
  width: '100%',
})

export const contractName = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
})
