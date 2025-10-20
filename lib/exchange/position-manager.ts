import { okxFetch } from './okx'

interface PositionState {
  symbol: string
  side: 'buy' | 'sell'
  entryPrice: number
  totalSize: number
  remainingSize: number
  tpLevels: Array<{ price: number; size: number; filled: boolean }>
  slPrice: number
  algoIds: string[]
}

class PositionManager {
  private positions = new Map<string, PositionState>()

  addPosition(state: PositionState) {
    this.positions.set(state.symbol, state)
  }

  getPosition(symbol: string): PositionState | undefined {
    return this.positions.get(symbol)
  }

  async updatePositionState(symbol: string, currentSize: number): Promise<void> {
    const state = this.positions.get(symbol)
    if (!state) return
    state.remainingSize = currentSize
    // If position fully closed, cancel remaining algo orders
    if (currentSize === 0) {
      await this.cancelRemainingOrders(symbol)
      this.positions.delete(symbol)
    }
  }

  async cancelRemainingOrders(symbol: string): Promise<void> {
    const state = this.positions.get(symbol)
    if (!state) return
    for (const algoId of state.algoIds) {
      try {
        await okxFetch('/api/v5/trade/cancel-algos', 'POST', {
          data: [{ algoId }]
        })
      } catch (err) {
        console.error(`Failed to cancel algo order ${algoId}:`, err)
      }
    }
  }

  removePosition(symbol: string) {
    this.positions.delete(symbol)
  }

  getAllPositions(): PositionState[] {
    return Array.from(this.positions.values())
  }
}

let singleton: PositionManager | null = null
export function getPositionManager() {
  if (!singleton) singleton = new PositionManager()
  return singleton
}

