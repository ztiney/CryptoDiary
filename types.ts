
export type TradeType = 'SPOT' | 'FUTURES';
export type PositionDirection = 'LONG' | 'SHORT';
export type TradeStatus = 'CLOSED' | 'HOLDING';

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  type: TradeType;
  direction: PositionDirection;
  status: TradeStatus;
  entryPrice: number;
  exitPrice: number; // For HOLDING, this represents Current Price
  amount: number; // Represents Investment Amount (USDT) for Spot, or Margin (USDT) for Futures
  leverage: number; // 1 for spot
  pnl: number;
  roi: number;
  note: string;
  timestamp: number;
}

export interface CalculatorState {
  symbol: string;
  entryPrice: string;
  exitPrice: string;
  amount: string;
  leverage: string;
  direction: PositionDirection;
  type: TradeType;
  status: TradeStatus;
  note: string;
}