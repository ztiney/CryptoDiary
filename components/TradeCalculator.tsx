import React, { useState, useEffect, useRef } from 'react';
import { TradeType, PositionDirection, TradeRecord, CalculatorState, CryptoPrice, TradeStatus } from '../types';
import { Search, Calculator, Save, Coins, DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface TradeCalculatorProps {
  onAddTrade: (trade: TradeRecord) => void;
}

const TradeCalculator: React.FC<TradeCalculatorProps> = ({ onAddTrade }) => {
  const [state, setState] = useState<CalculatorState>({
    symbol: '',
    coinId: '',
    entryPrice: '',
    exitPrice: '',
    amount: '',
    leverage: '1',
    direction: 'LONG',
    type: 'SPOT',
    status: 'CLOSED',
    note: ''
  });

  const [result, setResult] = useState({ pnl: 0, roi: 0 });
  
  const [availableCoins, setAvailableCoins] = useState<CryptoPrice[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<CryptoPrice[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCoinPrice, setSelectedCoinPrice] = useState<number | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false'
        );
        if (response.ok) {
          const data = await response.json();
          setAvailableCoins(data);
        }
      } catch (error) {
        console.error("Failed to fetch coin list", error);
      }
    };
    fetchCoins();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (state.symbol) {
      const lower = state.symbol.toLowerCase();
      const filtered = availableCoins.filter(c => 
        c.symbol.toLowerCase().includes(lower) || 
        c.name.toLowerCase().includes(lower)
      ).slice(0, 10);
      setFilteredCoins(filtered);
    } else {
      setFilteredCoins([]);
    }
  }, [state.symbol, availableCoins]);

  useEffect(() => {
    calculate();
  }, [state.entryPrice, state.exitPrice, state.amount, state.leverage, state.direction, state.type, state.status]);

  const calculate = () => {
    const entry = parseFloat(state.entryPrice);
    const exit = parseFloat(state.exitPrice);
    const amt = parseFloat(state.amount);
    const lev = parseFloat(state.leverage);

    if (isNaN(entry) || isNaN(exit) || isNaN(amt)) {
      setResult({ pnl: 0, roi: 0 });
      return;
    }

    let pnl = 0;
    let roi = 0;

    if (state.type === 'SPOT') {
      const coinSize = amt / entry;
      pnl = (exit - entry) * coinSize;
      roi = (pnl / amt) * 100;
    } else {
      const margin = amt;
      const positionValue = margin * lev;
      const coinSize = positionValue / entry;

      if (state.direction === 'LONG') {
        pnl = (exit - entry) * coinSize;
      } else {
        pnl = (entry - exit) * coinSize;
      }
      roi = margin !== 0 ? (pnl / margin) * 100 : 0;
    }

    setResult({ pnl, roi });
  };

  const selectCoin = (coin: CryptoPrice) => {
    setState(s => ({ 
      ...s, 
      symbol: coin.symbol.toUpperCase(),
      coinId: coin.id 
    }));
    setSelectedCoinPrice(coin.current_price);
    setShowDropdown(false);
  };

  const fillPrice = (field: 'entryPrice' | 'exitPrice') => {
    if (selectedCoinPrice !== null) {
      setState(s => ({ ...s, [field]: selectedCoinPrice.toString() }));
    }
  };

  const generateId = () => {
    if(typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trade: TradeRecord = {
      id: generateId(),
      coinId: state.coinId,
      symbol: state.symbol.toUpperCase(),
      type: state.type,
      direction: state.type === 'SPOT' ? 'LONG' : state.direction,
      status: state.status,
      entryPrice: parseFloat(state.entryPrice),
      exitPrice: parseFloat(state.exitPrice),
      amount: parseFloat(state.amount),
      leverage: parseFloat(state.leverage),
      pnl: result.pnl,
      roi: result.roi,
      note: state.note,
      timestamp: Date.now(),
    };
    onAddTrade(trade);
    setState(s => ({ ...s, entryPrice: '', exitPrice: '', note: '' }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-crypto-card rounded-xl p-5 shadow-lg border border-gray-700">
      <div className="flex items-center gap-2 mb-5 text-white font-semibold border-b border-gray-700 pb-3">
         <Calculator size={18} className="text-crypto-accent" />
         <span>盈亏计算 & 登记</span>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
           <button
            type="button"
            onClick={() => setState(s => ({ ...s, type: 'SPOT', leverage: '1', direction: 'LONG' }))}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
              state.type === 'SPOT' 
                ? 'bg-crypto-accent text-crypto-dark shadow-sm' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            现货 SPOT
          </button>
          <button
            type="button"
            onClick={() => setState(s => ({ ...s, type: 'FUTURES' }))}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
              state.type === 'FUTURES' 
                ? 'bg-purple-600 text-white shadow-sm' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            合约 FUTURES
          </button>
        </div>

        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
           <button
            type="button"
            onClick={() => setState(s => ({ ...s, status: 'CLOSED' }))}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
              state.status === 'CLOSED' 
                ? 'bg-gray-700 text-white shadow-sm' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            已平仓
          </button>
          <button
            type="button"
            onClick={() => setState(s => ({ ...s, status: 'HOLDING' }))}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
              state.status === 'HOLDING' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            持仓中 / 挂单
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative" ref={searchWrapperRef}>
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">币种</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                name="symbol"
                value={state.symbol}
                onChange={(e) => {
                  handleInputChange(e);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white focus:border-crypto-accent focus:outline-none uppercase text-sm"
                placeholder="BTC..."
                autoComplete="off"
                required
              />
            </div>
            {selectedCoinPrice && state.symbol && (
              <div className="absolute right-0 top-[-1.2rem] text-[10px] text-crypto-accent font-mono">
                现价: ${selectedCoinPrice.toLocaleString()}
              </div>
            )}
            {showDropdown && filteredCoins.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                {filteredCoins.map(coin => (
                  <div 
                    key={coin.id}
                    onClick={() => selectCoin(coin)}
                    className="p-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <div className="flex items-center gap-2">
                       <img src={coin.image || ''} alt="" className="w-4 h-4 rounded-full bg-gray-600" onError={(e) => e.currentTarget.style.display = 'none'} />
                       <span className="font-bold text-white uppercase">{coin.symbol}</span>
                    </div>
                    <span className="text-crypto-accent font-mono">${coin.current_price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {state.type === 'FUTURES' ? (
            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">方向</label>
              <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700 h-[38px]">
                <button
                  type="button"
                  onClick={() => setState(s => ({ ...s, direction: 'LONG' }))}
                  className={`flex-1 text-xs rounded font-bold flex items-center justify-center gap-1 ${state.direction === 'LONG' ? 'bg-crypto-up text-white' : 'text-gray-400'}`}
                >
                  <TrendingUp size={12}/> 多
                </button>
                <button
                  type="button"
                  onClick={() => setState(s => ({ ...s, direction: 'SHORT' }))}
                  className={`flex-1 text-xs rounded font-bold flex items-center justify-center gap-1 ${state.direction === 'SHORT' ? 'bg-crypto-down text-white' : 'text-gray-400'}`}
                >
                  <TrendingDown size={12}/> 空
                </button>
              </div>
            </div>
          ) : (
             <div className="flex items-end pb-2">
                <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-1 rounded">现货默认为买入做多</span>
             </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">开仓价</label>
              {selectedCoinPrice && (
                <button 
                  type="button" 
                  onClick={() => fillPrice('entryPrice')}
                  className="text-[10px] text-crypto-accent hover:text-white underline"
                >
                  填现价
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 text-xs">$</span>
              <input
                type="number"
                name="entryPrice"
                value={state.entryPrice}
                onChange={handleInputChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-6 pr-3 py-2 text-white focus:border-crypto-accent focus:outline-none text-sm font-mono"
                placeholder="0.00"
                step="any"
                required
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold">
                {state.status === 'HOLDING' ? '当前价/目标价' : '平仓价'}
              </label>
              {selectedCoinPrice && (
                <button 
                  type="button" 
                  onClick={() => fillPrice('exitPrice')}
                  className="text-[10px] text-crypto-accent hover:text-white underline"
                >
                  填现价
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 text-xs">$</span>
              <input
                type="number"
                name="exitPrice"
                value={state.exitPrice}
                onChange={handleInputChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-6 pr-3 py-2 text-white focus:border-crypto-accent focus:outline-none text-sm font-mono"
                placeholder="0.00"
                step="any"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">
              {state.type === 'SPOT' ? '投入金额 (U)' : '保证金 (U)'}
            </label>
            <div className="relative">
               <DollarSign size={12} className="absolute left-3 top-2.5 text-gray-500" />
               <input
                type="number"
                name="amount"
                value={state.amount}
                onChange={handleInputChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-white focus:border-crypto-accent focus:outline-none text-sm font-mono"
                placeholder="0.00"
                step="any"
                required
              />
            </div>
          </div>
          
          {state.type === 'FUTURES' ? (
            <div>
              <div className="flex justify-between items-center mb-1">
                 <label className="block text-[10px] text-gray-400 uppercase font-bold">杠杆: <span className="text-crypto-accent text-sm">{state.leverage}x</span></label>
              </div>
              <input
                type="range"
                min="1"
                max="125"
                step="1"
                name="leverage"
                value={state.leverage}
                onChange={handleInputChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-2"
              />
            </div>
          ) : (
            <div className="flex flex-col justify-end pb-2">
                 <span className="text-[10px] text-gray-500 flex items-center gap-1">
                   <Target size={10}/> 自动计算持币量
                 </span>
            </div>
          )}
        </div>

        <div>
           <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">备注</label>
           <input
              type="text"
              name="note"
              value={state.note}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-crypto-accent focus:outline-none text-xs"
              placeholder="记录想法..."
            />
        </div>

        <div className="mt-4 bg-black/40 rounded-lg p-3 border border-gray-800">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-500 text-xs">预计盈亏</span>
            <span className={`text-sm font-bold font-mono ${result.pnl >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
              {result.pnl >= 0 ? '+' : ''}{result.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">ROI</span>
            <span className={`text-xs font-semibold ${result.roi >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
              {result.roi.toFixed(2)}%
            </span>
          </div>
        </div>

        <button
          type="submit"
          className={`w-full font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-lg ${
             state.status === 'HOLDING' 
             ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' 
             : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20'
          }`}
        >
          <Save size={16} />
          <span>{state.status === 'HOLDING' ? '记录持仓' : '登记平仓'}</span>
        </button>
      </form>
    </div>
  );
};

export default TradeCalculator;