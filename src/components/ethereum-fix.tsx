"use client"

import { useEffect } from 'react'

export function EthereumFix() {
  useEffect(() => {
    // Prevent ethereum-related errors by creating a protective wrapper
    if (typeof window !== 'undefined') {
      // Protect against ethereum access errors
      const originalEthereum = (window as { ethereum?: unknown }).ethereum

      if (originalEthereum) {
        // Create a proxy to prevent selectedAddress assignment errors
        const ethereumProxy = new Proxy(originalEthereum, {
          set(target, property, value) {
            if (property === 'selectedAddress' && value === undefined) {
              // Prevent setting selectedAddress to undefined
              console.warn('Prevented setting ethereum.selectedAddress to undefined')
              return true
            }
            return Reflect.set(target, property, value)
          }
        })

        try {
          Object.defineProperty(window, 'ethereum', {
            value: ethereumProxy,
            writable: false,
            configurable: true
          })
        } catch (error) {
          // If we can't override, just log the attempt
          console.warn('Could not override window.ethereum:', error)
        }
      }

      // Also prevent any potential errors from other wallet extensions
      const preventWalletErrors = () => {
        try {
          const ethereum = (window as { ethereum?: unknown }).ethereum
          if (ethereum && typeof ethereum === 'object' && ethereum !== null && 'selectedAddress' in ethereum) {
            const ethereumWithAddress = ethereum as { selectedAddress?: unknown }
            if (typeof ethereumWithAddress.selectedAddress === 'undefined') {
              // Don't set to undefined, leave it as is
              return
            }
          }
        } catch (error) {
          // Silently handle any ethereum access errors
          console.warn('Ethereum access error prevented:', error)
        }
      }

      // Run prevention on mount and periodically
      preventWalletErrors()
      const interval = setInterval(preventWalletErrors, 1000)

      return () => {
        clearInterval(interval)
      }
    }
  }, [])

  return null
}
