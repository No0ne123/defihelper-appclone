import { Dialog } from '~/common/dialog'
import { Button } from '~/common/button'
import { Typography } from '~/common/typography'
import { config } from '~/config'
import { UserContactBrokerEnum } from '~/graphql/_generated-types'
import * as styles from './settings-success-dialog.css'

export enum TransactionEnum {
  refund = 'refund',
  deposit = 'deposit',
}

export type SettingsSuccessDialogProps = {
  onConfirm: () => void
  onCancel: () => void
  type: UserContactBrokerEnum | TransactionEnum
  confirmationCode?: string
}

const TITLES = {
  [UserContactBrokerEnum.Email]:
    'Please confirm your email by clicking the link in the email',
  [UserContactBrokerEnum.Telegram]: 'Please click to the button and enable bot',
  [TransactionEnum.refund]: 'Refund successful',
  [TransactionEnum.deposit]:
    'Deposit successful. Please wait 3-5 minutes until the money appears on your balance',
}

export const SettingsSuccessDialog: React.VFC<SettingsSuccessDialogProps> = (
  props
) => {
  return (
    <Dialog className={styles.root}>
      <Typography align="center" className={styles.title}>
        {TITLES[props.type]}
      </Typography>
      <div className={styles.actions}>
        <Button onClick={props.onConfirm} className={styles.button}>
          Continue
        </Button>
        {props.type === UserContactBrokerEnum.Telegram && (
          <Button
            as="a"
            href={`https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=${props.confirmationCode}`}
            target="_blank"
            className={styles.button}
          >
            Open telegram
          </Button>
        )}
      </div>
    </Dialog>
  )
}