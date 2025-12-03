
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
  coinId?: string; // 用于API刷新价格
  symbol: string;
  type: TradeType;
  direction: PositionDirection;
  status: TradeStatus;
  entryPrice: number;
  exitPrice: number; // 持仓时代表当前价格
  amount: number; // 现货为投入U，合约为保证金U
  leverage: number; 
  pnl: number;
  roi: number;
  note: string;
  timestamp: number;
}

export interface CalculatorState {
  symbol: string;
  coinId?: string;
  entryPrice: string;
  exitPrice: string;
  amount: string;
  leverage: string;
  direction: PositionDirection;
  type: TradeType;
  status: TradeStatus;
  note: string;
}
