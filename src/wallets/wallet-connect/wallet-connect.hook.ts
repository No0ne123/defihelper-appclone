import { useCallback } from 'react'

import { walletNetworkModel } from '~/wallets/wallet-networks'
import { useWalletList } from '~/wallets/wallet-list'

export const useWalletConnect = () => {
  const [openWalletList] = useWalletList()

  return useCallback(async (blockchain?: string) => {
    try {
      const walletData = await openWalletList({
        blockchain,
      })

      walletNetworkModel.activateWalletFx({
        connector: walletData.connector,
      })
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}