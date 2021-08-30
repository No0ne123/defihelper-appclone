import { style, styleVariants } from '@vanilla-extract/css'

import { theme } from '~/common/theme'

export const root = style({
  margin: 0,
  minWidth: 0,
  fontWeight: 400,
  borderRadius: 8,
  padding: '0 8px',
  border: '1px solid currentColor',
  display: 'inline-block',
})

export const outlinedColors = styleVariants({
  grey: {
    color: theme.colors.common.grey1,
  },

  blue: {
    color: theme.colors.common.blue,
  },

  red: {
    color: theme.colors.common.red,
  },

  orange: {
    color: theme.colors.common.orange,
  },

  beige: {
    color: theme.colors.common.beige,
  },

  green: {
    color: theme.colors.common.green,
  },

  pink: {
    color: theme.colors.common.pink,
  },

  purple: {
    color: theme.colors.common.purple,
  },

  black: {
    color: 'inherit',
  },
})

export const containedColors = styleVariants({
  grey: {
    backgroundColor: theme.colors.common.grey1,
    color: 'inherit',
    borderColor: theme.colors.common.grey1,
  },

  blue: {
    backgroundColor: theme.colors.common.blue,
    color: 'inherit',
    borderColor: theme.colors.common.blue,
  },

  red: {
    backgroundColor: theme.colors.common.red,
    color: 'inherit',
    borderColor: theme.colors.common.red,
  },

  orange: {
    backgroundColor: theme.colors.common.orange,
    color: 'inherit',
    borderColor: theme.colors.common.orange,
  },

  beige: {
    backgroundColor: theme.colors.common.beige,
    color: 'inherit',
    borderColor: theme.colors.common.beige,
  },

  green: {
    backgroundColor: theme.colors.common.green,
    color: 'inherit',
    borderColor: theme.colors.common.green,
  },

  pink: {
    backgroundColor: theme.colors.common.pink,
    color: 'inherit',
    borderColor: theme.colors.common.pink,
  },

  purple: {
    backgroundColor: theme.colors.common.purple,
    color: 'inherit',
    borderColor: theme.colors.common.purple,
  },

  black: {
    backgroundcolor: 'inherit',
    color: theme.colors.secondary,
    bordercolor: 'inherit',
  },
})

export const colors = {
  outlined: outlinedColors,
  contained: containedColors,
}