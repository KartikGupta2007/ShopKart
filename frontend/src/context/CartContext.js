import { createContext, useContext } from 'react'

export const CartContext = createContext(null)

/** Read the cart — and the actions that change it — from anywhere in the tree. */
export const useCart = () => {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used inside <CartProvider>')
  }

  return context
}
