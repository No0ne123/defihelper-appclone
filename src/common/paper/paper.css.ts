import { style } from '@vanilla-extract/css'
import { theme } from '../theme'

export const root = style({
  borderRadius: 16,
  backgroundColor: theme.colors.paper,

  '@media': {
    [theme.mediaQueries.lg()]: {
      borderRadius: 24,
    },
  },
})