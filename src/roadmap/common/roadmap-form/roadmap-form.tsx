import TextField from '@material-ui/core/TextField'
import { useForm } from 'react-hook-form'
import MenuItem from '@material-ui/core/MenuItem'
import { lazy, Suspense } from 'react'

import { ProposalStatusEnum } from '~/graphql/_generated-types'
import { Input } from '~/common/input'
import { Dialog } from '~/common/dialog'
import { Button } from '~/common/button'
import * as styles from './roadmap-form.css'

const MarkdownEditor = lazy(() =>
  import('~/common/markdown-editor').then((c) => ({
    default: c.MarkdownEditor,
  }))
)

export type FormValues = {
  title: string
  description: string
  status: ProposalStatusEnum
  plannedAt?: string | null
  releasedAt?: string | null
}

export type RoadmapFormProps = {
  loading?: boolean
  onConfirm: (formValues: FormValues) => void
  onCancel: () => void
  defaultValues?: FormValues
}

export const RoadmapForm: React.VFC<RoadmapFormProps> = (props) => {
  const { register, handleSubmit, formState, setValue } = useForm<FormValues>()

  const status = props.defaultValues ? register('status') : null

  const handleOnSubmit = (formValues: FormValues) => {
    props.onConfirm({
      ...formValues,
      plannedAt: formValues.plannedAt || null,
      releasedAt: formValues.releasedAt || null,
    })
  }

  return (
    <Dialog className={styles.root}>
      <form
        noValidate
        autoComplete="off"
        onSubmit={handleSubmit(handleOnSubmit)}
      >
        <Input
          type="text"
          label="Proposal Name"
          defaultValue={props.defaultValues?.title}
          {...register('title')}
          disabled={props.loading}
          error={Boolean(formState.errors.title)}
          helperText={formState.errors.title?.message}
          className={styles.input}
        />
        <Suspense fallback="loading...">
          <MarkdownEditor
            value={props.defaultValues?.description ?? ''}
            onChange={(value) => setValue('description', value)}
            label="Enter your proposal"
            className={styles.input}
          />
        </Suspense>
        {props.defaultValues && (
          <Input
            type="text"
            label="Planned at"
            defaultValue={props.defaultValues?.plannedAt || ''}
            {...register('plannedAt')}
            disabled={props.loading}
            error={Boolean(formState.errors.plannedAt)}
            helperText={formState.errors.plannedAt?.message}
            className={styles.input}
          />
        )}
        {props.defaultValues && (
          <Input
            type="text"
            label="Released at"
            defaultValue={props.defaultValues?.releasedAt || ''}
            {...register('releasedAt')}
            disabled={props.loading}
            error={Boolean(formState.errors.releasedAt)}
            helperText={formState.errors.releasedAt?.message}
            className={styles.input}
          />
        )}
        {status && (
          <TextField
            type="text"
            label="Status"
            defaultValue={
              props.defaultValues?.status ?? ProposalStatusEnum.Open
            }
            select
            disabled={props.loading}
            inputRef={status.ref}
            {...status}
            error={Boolean(formState.errors.status)}
            helperText={formState.errors.status?.message}
            className={styles.input}
          >
            {Object.entries(ProposalStatusEnum).map(([label, value]) => (
              <MenuItem key={label} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        )}
        <div className={styles.actions}>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            size="small"
            disabled={props.loading}
          >
            Submit
          </Button>
          <Button
            variant="outlined"
            color="red"
            size="small"
            disabled={props.loading}
            onClick={props.onCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  )
}