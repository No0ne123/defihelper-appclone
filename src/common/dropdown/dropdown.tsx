/* eslint-disable no-unused-vars */
import clsx from 'clsx'
import { isValidElement, cloneElement, useRef } from 'react'
import type { Placement, Modifier } from '@popperjs/core'
import { useKey } from 'react-use'
import isEmpty from 'lodash.isempty'

import { useClickAway, usePopper, useForkRef } from '~/common/hooks'
import { Paper } from '~/common/paper'
import { Portal } from '~/common/portal'
import * as styles from './dropdown.css'

export type DropdownProps = {
  control: React.ReactNode | ((active: boolean) => JSX.Element)
  className?: string
  placement?: Placement
  offset?: number[]
  sameWidth?: boolean
  trigger?: 'click' | 'hover'
  clickable?: boolean
}

export const Dropdown: React.FC<DropdownProps> = (props) => {
  if (!isValidElement(props.control) && typeof props.control !== 'function')
    throw new Error('control is not valid')

  const { placement = 'auto', trigger = 'click' } = props

  const localRef = useRef(null)

  const popper = useRef<HTMLElement>(null)

  const modifiers = useRef<Partial<Modifier<string, unknown>>[]>([])

  if (props.offset)
    modifiers.current.push(usePopper.modifiers.getOffset(props.offset))
  if (props.sameWidth) modifiers.current.push(usePopper.modifiers.sameWidth)

  const {
    popperStyles,
    popperAttributes,
    setPopperElement,
    setReferenceElement,
    referenceElement,
  } = usePopper({
    placement,
    modifiers: isEmpty(modifiers.current) ? undefined : modifiers.current,
  })

  const popperRef = useForkRef(setPopperElement, popper)

  const handleOnTrigger = (event: Event | null) => {
    const target = (event?.currentTarget as HTMLElement) ?? null

    event?.preventDefault() // clickable protocol
    event?.stopPropagation() // portfolio wallet select

    setReferenceElement(target)
  }

  useClickAway(
    localRef,
    handleOnTrigger.bind(null, null),
    props.clickable ? popper : undefined
  )

  useKey('Escape', handleOnTrigger.bind(null, null))

  const control =
    typeof props.control === 'function'
      ? props.control(Boolean(referenceElement))
      : props.control

  return (
    <>
      {cloneElement(control, {
        ...control.props,
        ref: localRef,
        onClick: trigger === 'click' ? handleOnTrigger : undefined,
        onMouseEnter: trigger === 'hover' ? handleOnTrigger : undefined,
        onMouseLeave: trigger === 'hover' ? handleOnTrigger : undefined,
      })}
      {referenceElement && (
        <Portal>
          <Paper
            radius={8}
            ref={popperRef}
            {...popperAttributes}
            style={popperStyles}
            data-open="true"
            className={clsx(styles.dropdown, props.className)}
          >
            {props.children}
          </Paper>
        </Portal>
      )}
    </>
  )
}
