
import React, { useState, useEffect, useRef } from 'react';
import { TradeType, PositionDirection, TradeRecord, CalculatorState, CryptoPrice, TradeStatus } from '../types';

interface TradeCalculatorProps {
  onAddTrade: (trade: TradeRecord) => void;
}

const TradeCalculator: React.FC<TradeCalculatorProps> = ({ onAddTrade }) => {
  const [state, setState] = useState<CalculatorState>({
    symbol: '',
    entryPrice: '',
    exitPrice: '',
    amount: '',
    leverage: '1',
    direction: 'LONG',
    type: 'SPOT',
    status: 'CLOSED', // Default to closed trade
    note: ''
  });

  const [result, setResult] = useState({ pnl: 0, roi: 0 });
  
  // Coin Search State
  const [availableCoins, setAvailableCoins] = useState<CryptoPrice[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<CryptoPrice[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCoinPrice, setSelectedCoinPrice] = useState<number | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Fetch top coins on mount for search
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

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter coins when symbol changes
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

  // Recalculate logic
  useEffect(() => {
    calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.entryPrice, state.exitPrice, state.amount, state.leverage, state.direction, state.type, state.status]);

  const calculate = () => {
    const entry = parseFloat(state.entryPrice);
    const exit = parseFloat(state.exitPrice);
    const amt = parseFloat(state.amount); // Now USDT for both Spot and Futures
    const lev = parseFloat(state.leverage);

    if (isNaN(entry) || isNaN(exit) || isNaN(amt)) {
      setResult({ pnl: 0, roi: 0 });
      return;
    }

    let pnl = 0;
    let roi = 0;

    if (state.type === 'SPOT') {
      // Spot Calculation:
      // Amount is now Investment in USDT.
      // Coin Size = Investment / Entry Price
      const coinSize = amt / entry;
      pnl = (exit - entry) * coinSize;
      
      // ROI = PnL / Investment
      roi = (pnl / amt) * 100;
    } else {
      // Futures Calculation:
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
    setState(s => ({ ...s, symbol: coin.symbol.toUpperCase() }));
    setSelectedCoinPrice(coin.current_price);
    setShowDropdown(false);
  };

  const fillPrice = (field: 'entryPrice' | 'exitPrice') => {
    if (selectedCoinPrice !== null) {
      setState(s => ({ ...s, [field]: selectedCoinPrice.toString() }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trade: TradeRecord = {
      id: crypto.randomUUID(),
      symbol: state.symbol.toUpperCase(),
      type: state.type,
      direction: state.type === 'SPOT' ? 'LONG' : state.direction,
      status: state.status,
      entryPrice: parseFloat(state.entryPrice),
      exitPrice: parseFloat(state.exitPrice),
      amount: parseFloat(state.amount), // Stored as USDT
      leverage: parseFloat(state.leverage),
      pnl: result.pnl,
      roi: result.roi,
      note: state.note,
      timestamp: Date.now(),
    };
    onAddTrade(trade);
    // Reset basic fields but keep symbol/type settings
    setState(s => ({ ...s, entryPrice: '', exitPrice: '', note: '' }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-crypto-card rounded-xl p-6 shadow-lg border border-gray-700">
      
      {/* Mode Selectors */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Type: Spot vs Futures */}
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
           <button
            type="button"
            onClick={() => setState(s => ({ ...s, type: 'SPOT', leverage: '1', direction: 'LONG' }))}
            className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              state.type === 'SPOT' 
                ? 'bg-crypto-accent text-crypto-dark' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            现货 (Spot)
          </button>
          <button
            type="button"
            onClick={() => setState(s => ({ ...s, type: 'FUTURES' }))}
            className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              state.type === 'FUTURES' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            合约 (Futures)
          </button>
        </div>

        {/* Status: Closed vs Holding */}
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
           <button
            type="button"
            onClick={() => setState(s => ({ ...s, status: 'CLOSED' }))}
            className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              state.status === 'CLOSED' 
                ? 'bg-gray-600 text-white' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            已平仓 (Closed)
          </button>
          <button
            type="button"
            onClick={() => setState(s => ({ ...s, status: 'HOLDING' }))}
            className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              state.status === 'HOLDING' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            持仓中/挂单 (Hold)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Symbol Search & Direction */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative" ref={searchWrapperRef}>
            <label className="block text-xs text-gray-400 mb-1">币种 (搜币)</label>
            <input
              type="text"
              name="symbol"
              value={state.symbol}
              onChange={(e) => {
                handleInputChange(e);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-crypto-accent focus:outline-none uppercase"
              placeholder="输入如 BTC..."
              autoComplete="off"
              required
            />
            {/* Live Price Helper */}
            {selectedCoinPrice && state.symbol && (
              <div className="absolute right-0 top-0 text-[10px] text-crypto-accent font-mono mt-1.5 mr-1">
                现价: ${selectedCoinPrice.toLocaleString()}
              </div>
            )}
            {/* Search Dropdown */}
            {showDropdown && filteredCoins.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                {filteredCoins.map(coin => (
                  <div 
                    key={coin.id}
                    onClick={() => selectCoin(coin)}
                    className="p-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center text-sm"
                  >
                    <div>
                      <span className="font-bold text-white uppercase mr-2">{coin.symbol}</span>
                      <span className="text-gray-400 text-xs truncate">{coin.name}</span>
                    </div>
                    <span className="text-crypto-accent font-mono">${coin.current_price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {state.type === 'FUTURES' ? (
            <div>
              <label className="block text-xs text-gray-400 mb-1">方向</label>
              <div className="flex bg-gray-900 rounded p-1 border border-gray-700 h-[42px]">
                <button
                  type="button"
                  onClick={() => setState(s => ({ ...s, direction: 'LONG' }))}
                  className={`flex-1 text-sm rounded ${state.direction === 'LONG' ? 'bg-crypto-up text-white' : 'text-gray-400'}`}
                >
                  多
                </button>
                <button
                  type="button"
                  onClick={() => setState(s => ({ ...s, direction: 'SHORT' }))}
                  className={`flex-1 text-sm rounded ${state.direction === 'SHORT' ? 'bg-crypto-down text-white' : 'text-gray-400'}`}
                >
                  空
                </button>
              </div>
            </div>
          ) : (
             <div className="flex items-end pb-2">
                <span className="text-xs text-gray-500">现货默认做多</span>
             </div>
          )}
        </div>

        {/* Row 2: Prices with Auto-Fill Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-400">开仓价格 ($)</label>
              {selectedCoinPrice && (
                <button 
                  type="button" 
                  onClick={() => fillPrice('entryPrice')}
                  className="text-[10px] bg-gray-700 hover:bg-gray-600 px-1.5 rounded text-crypto-accent transition-colors"
                >
                  填入现价
                </button>
              )}
            </div>
            <input
              type="number"
              name="entryPrice"
              value={state.entryPrice}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-crypto-accent focus:outline-none"
              placeholder="0.00"
              step="any"
              required
            />
          </div>
          <div className="relative">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-400">
                {state.status === 'HOLDING' ? '当前/预期价格' : '平仓价格 ($)'}
              </label>
              {selectedCoinPrice && (
                <button 
                  type="button" 
                  onClick={() => fillPrice('exitPrice')}
                  className="text-[10px] bg-gray-700 hover:bg-gray-600 px-1.5 rounded text-crypto-accent transition-colors"
                >
                  填入现价
                </button>
              )}
            </div>
            <input
              type="number"
              name="exitPrice"
              value={state.exitPrice}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-crypto-accent focus:outline-none"
              placeholder="0.00"
              step="any"
              required
            />
          </div>
        </div>

        {/* Row 3: Amount & Leverage */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              {state.type === 'SPOT' ? '投入金额 (U)' : '保证金 (U)'}
            </label>
            <input
              type="number"
              name="amount"
              value={state.amount}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-crypto-accent focus:outline-none"
              placeholder="0.00"
              step="any"
              required
            />
          </div>
          
          {state.type === 'FUTURES' ? (
            <div>
              <div className="flex justify-between items-center mb-1">
                 <label className="block text-xs text-gray-400">杠杆: <span className="text-crypto-accent">{state.leverage}x</span></label>
              </div>
              <input
                type="range"
                min="1"
                max="125"
                step="1"
                name="leverage"
                value={state.leverage}
                onChange={handleInputChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          ) : (
            <div className="flex flex-col justify-end pb-2">
                 <span className="text-[10px] text-gray-500 italic">自动转换: 投入 U 本位，系统按开仓价自动换算币量。</span>
            </div>
          )}
        </div>

        {/* Note Field */}
        <div>
           <label className="block text-xs text-gray-400 mb-1">备注/心得</label>
           <input
              type="text"
              name="note"
              value={state.note}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-crypto-accent focus:outline-none text-sm"
              placeholder={state.status === 'HOLDING' ? "例如: 长期看好, 目标价100k..." : "例如: 突破回踩进场..."}
            />
        </div>

        {/* Live Preview Card */}
        <div className="mt-4 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">
                {state.status === 'HOLDING' ? '未实现盈亏 (浮动)' : '已实现盈亏 (PnL)'}
            </span>
            <span className={`text-lg font-bold ${result.pnl >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
              {result.pnl >= 0 ? '+' : ''}{result.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">收益率 (ROI)</span>
            <span className={`text-md font-semibold ${result.roi >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
              {result.roi.toFixed(2)}%
            </span>
          </div>
        </div>

        <button
          type="submit"
          className={`w-full font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all ${
             state.status === 'HOLDING' 
             ? 'bg-blue-600 hover:bg-blue-500 text-white' 
             : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          <span>{state.status === 'HOLDING' ? '记录持仓/挂单' : '登记已平仓交易'}</span>
        </button>
      </form>
    </div>
  );
};

export default TradeCalculator;
