import { useStore } from 'effector-react'
import { useMemo } from 'react'
import clsx from 'clsx'

import { Button } from '~/common/button'
import { Paper } from '~/common/paper'
import { Typography } from '~/common/typography'
import { UserContactBrokerEnum } from '~/api/_generated-types'
import notification from '~/assets/images/notification.png'
import { dateUtils } from '~/common/date-utils'
import { pluralize } from '~/common/pluralize'
import { useOnUserContactActivated } from '~/settings/common'
import * as authModel from '~/auth/auth.model'
import * as settingsContacts from '~/settings/settings-contacts/settings-contact.model'
import * as styles from './settings-telegram.css'
import * as model from './settings-telegram.model'

export type SettingsTelegramProps = unknown

export const SettingsTelegram: React.VFC<SettingsTelegramProps> = () => {
  const contacts = useStore(settingsContacts.$userContactList)
  const user = useStore(authModel.$user)
  const loading = useStore(settingsContacts.fetchUserContactListFx.pending)
  const userReady = useStore(authModel.$userReady)

  const leftDays = user?.portfolioCollectingFreezedAt
    ? Math.round(dateUtils.leftDays(user.portfolioCollectingFreezedAt))
    : null

  const telegram = contacts.find(
    ({ broker }) => broker === UserContactBrokerEnum.Telegram
  )

  const variables = useMemo(() => {
    if (!user) return undefined

    return {
      user: [user.id],
    }
  }, [user])

  useOnUserContactActivated(({ data }) => {
    if (data?.onUserContactActivated) {
      settingsContacts.replaceUserContact(data.onUserContactActivated)
    }
  }, variables)

  if (telegram?.address || loading || !userReady || !leftDays) return <></>

  const handleOpenTelegram = () => {
    model.openTelegram(undefined)
  }

  return (
    <Paper
      radius={4}
      className={clsx(
        styles.root,
        leftDays >= 4 && styles.green,
        leftDays < 1 && styles.red,
        leftDays >= 1 && leftDays < 4 && styles.yellow
      )}
    >
      <img alt="" src={notification} className={styles.notification} />
      <Typography variant="body3" as="div" className={styles.text}>
        {leftDays > 0 ? (
          <>
            We will stop tracking your portfolio in {leftDays}{' '}
            {pluralize(leftDays, 'day')} if you do not connect your Telegram
            account.
          </>
        ) : (
          <>
            We are no longer tracking your portfolio because you have not
            connected your Telegram account
          </>
        )}
      </Typography>
      <div className={styles.buttons}>
        <Button
          size="small"
          color="primary"
          variant="contained"
          className={styles.button}
          onClick={handleOpenTelegram}
        >
          Connect telegram
        </Button>
      </div>
    </Paper>
  )
}
