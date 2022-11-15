import { Controller, useForm } from 'react-hook-form'

import { Button } from '~/common/button'
import { Dialog } from '~/common/dialog'
import { Select, SelectOption } from '~/common/select'
import { UserRoleEnum } from '~/api/_generated-types'
import * as styles from './user-role-dialog.css'

type FormValues = {
  role: UserRoleEnum
}

export type UserRoleDialogProps = {
  defaultValues: FormValues
  onConfirm: (role: UserRoleEnum) => void
}

export const UserRoleDialog: React.VFC<UserRoleDialogProps> = (props) => {
  const { control, handleSubmit } = useForm<{ role: UserRoleEnum }>({
    defaultValues: props.defaultValues,
  })

  const handleOnSubmit = handleSubmit(({ role }) => {
    props.onConfirm(role)
  })

  return (
    <Dialog className={styles.root}>
      <form noValidate autoComplete="off" onSubmit={handleOnSubmit}>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select {...field} label="Role" className={styles.input}>
              {Object.entries(UserRoleEnum).map(([key, value]) => (
                <SelectOption key={key} value={value}>
                  {value}
                </SelectOption>
              ))}
            </Select>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Dialog>
  )
}
