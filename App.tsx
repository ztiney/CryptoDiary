import React, { useState, useEffect } from 'react';
import TradeCalculator from './components/TradeCalculator';
import Calendar from './components/Calendar';
import { TradeRecord, CryptoPrice } from './types';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  NotebookPen, 
  FileText, 
  Copy, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock,
  CheckCircle,
  Activity
} from 'lucide-react';

const App: React.FC = () => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [dailySummary, setDailySummary] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const addTrade = (trade: TradeRecord) => {
    setTrades([trade, ...trades]);
  };

  const removeTrade = (id: string) => {
    if(confirm('确定要删除这条记录吗？')) {
      setTrades(trades.filter(t => t.id !== id));
    }
  };

  const updateTradeNote = (id: string, note: string) => {
    setTrades(trades.map(t => t.id === id ? { ...t, note } : t));
  };

  const refreshPrices = async () => {
    const holdingWithIds = trades.filter(t => t.status === 'HOLDING' && t.coinId);
    if (holdingWithIds.length === 0) return;

    setRefreshing(true);
    const ids = Array.from(new Set(holdingWithIds.map(t => t.coinId))).join(',');

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&page=1&sparkline=false`
      );
      
      if (response.ok) {
        const data: CryptoPrice[] = await response.json();
        const priceMap = new Map(data.map(c => [c.id, c.current_price]));

        setTrades(prevTrades => prevTrades.map(trade => {
          if (trade.status === 'HOLDING' && trade.coinId && priceMap.has(trade.coinId)) {
            const currentPrice = priceMap.get(trade.coinId)!;
            
            let pnl = 0;
            let roi = 0;
            
            if (trade.type === 'SPOT') {
               const coinSize = trade.amount / trade.entryPrice;
               pnl = (currentPrice - trade.entryPrice) * coinSize;
               roi = (pnl / trade.amount) * 100;
            } else {
               const positionValue = trade.amount * trade.leverage;
               const coinSize = positionValue / trade.entryPrice;
               if (trade.direction === 'LONG') {
                 pnl = (currentPrice - trade.entryPrice) * coinSize;
               } else {
                 pnl = (trade.entryPrice - currentPrice) * coinSize;
               }
               roi = trade.amount !== 0 ? (pnl / trade.amount) * 100 : 0;
            }

            return {
              ...trade,
              exitPrice: currentPrice,
              pnl,
              roi
            };
          }
          return trade;
        }));
      }
    } catch (error) {
      console.error("Failed to refresh prices", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(refreshPrices, 60000);
    return () => clearInterval(interval);
  }, [trades]);

  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const holdingTrades = trades.filter(t => t.status === 'HOLDING');

  const calculateTotalRealizedPnL = () => closedTrades.reduce((acc, t) => acc + t.pnl, 0);
  const calculateTotalUnrealizedPnL = () => holdingTrades.reduce((acc, t) => acc + t.pnl, 0);

  const generateMarkdown = () => {
    const date = new Date().toLocaleDateString('zh-CN');
    let md = `# 📅 交易复盘日记 - ${date}\n\n`;
    
    md += `## 📝 今日总结\n`;
    md += `${dailySummary || '（今日暂无详细总结）'}\n\n`;
    
    const realizedPnL = calculateTotalRealizedPnL();
    const unrealizedPnL = calculateTotalUnrealizedPnL();
    const winRate = closedTrades.length > 0 
      ? (closedTrades.filter(t => t.pnl > 0).length / closedTrades.length * 100).toFixed(1) 
      : 0;

    md += `## 📊 账户概览\n`;
    md += `- **已实现盈亏 (Realized)**: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)}\n`;
    md += `- **持仓浮盈 (Unrealized)**: ${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toFixed(2)}\n`;
    md += `- **胜率**: ${winRate}%\n\n`;

    const renderTable = (list: TradeRecord[]) => {
      let table = `| 标的 | 方向 | 价格(入/出) | 投入/杠杆 | 盈亏 | 心得 |\n`;
      table += `|---|---|---|---|---|---|\n`;
      list.forEach(t => {
        const pnlIcon = t.pnl >= 0 ? '🟢' : '🔴';
        const dirIcon = t.direction === 'LONG' ? '📈 多' : '📉 空';
        const typeLabel = t.type === 'SPOT' ? '现货' : '合约';
        const prices = `$${t.entryPrice} ➝ $${t.exitPrice}`;
        const size = t.type === 'FUTURES' ? `${t.leverage}x` : `$${t.amount}`;
        const note = t.note ? t.note.replace(/\n/g, ' ') : '-';
        table += `| **${t.symbol}** | ${typeLabel} ${dirIcon} | ${prices} | ${size} | ${pnlIcon} $${t.pnl.toFixed(2)} | ${note} |\n`;
      });
      return table;
    };

    if (closedTrades.length > 0) {
      md += `## ✅ 已平仓 (Closed)\n`;
      md += renderTable(closedTrades);
      md += `\n`;
    }

    if (holdingTrades.length > 0) {
      md += `## ⏳ 持仓中 (Holding)\n`;
      md += renderTable(holdingTrades);
      md += `\n`;
    }
    
    return md;
  };

  const handleGenerate = () => {
    setMarkdownContent(generateMarkdown());
    setShowMarkdown(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const TradeCard = ({ trade }: { trade: TradeRecord }) => (
    <div className={`group relative p-4 transition-all border-l-4 rounded-r-lg mb-2 ${
      trade.status === 'HOLDING' 
        ? 'bg-gradient-to-r from-blue-900/10 to-transparent border-blue-500 hover:from-blue-900/20' 
        : 'bg-crypto-card border-gray-600 hover:bg-gray-800'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              trade.symbol === 'BTC' ? 'bg-orange-500 text-white' : 
              trade.symbol === 'ETH' ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300'
            }`}>
              {trade.symbol.substring(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{trade.symbol}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${
                  trade.direction === 'LONG' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-rose-900/50 text-rose-400'
                }`}>
                  {trade.direction === 'LONG' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {trade.type === 'FUTURES' ? `${trade.leverage}x` : '现货'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {new Date(trade.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
        </div>
        
        <div className="text-right">
          <div className={`font-mono font-bold flex items-center justify-end gap-1 ${trade.pnl >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
            <span className="text-[10px] text-gray-500">USD</span>
          </div>
          <div className={`text-[10px] font-medium ${trade.roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trade.roi.toFixed(2)}%
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between bg-gray-900/50 rounded p-2 mb-3 text-xs">
        <div>
          <span className="text-gray-500">入:</span> <span className="text-gray-300 font-mono">${trade.entryPrice}</span>
        </div>
        <div className="text-gray-600">➜</div>
        <div>
          <span className="text-gray-500">{trade.status === 'HOLDING' ? '现' : '出'}:</span> 
          <span className={`ml-1 font-mono ${trade.status === 'HOLDING' ? 'text-blue-300 font-bold' : 'text-gray-300'}`}>
            ${trade.exitPrice}
          </span>
        </div>
      </div>

      <div className="relative">
        <input
            type="text"
            value={trade.note}
            onChange={(e) => updateTradeNote(trade.id, e.target.value)}
            placeholder="添加心得备注..."
            className="w-full bg-gray-900/30 border border-gray-700/50 rounded px-2 py-1.5 text-xs text-gray-300 focus:border-crypto-accent focus:bg-gray-900 focus:outline-none transition-all placeholder-gray-600"
        />
        <button 
            onClick={() => removeTrade(trade.id)}
            className="absolute right-2 top-1.5 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="删除"
        >
            <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-crypto-dark text-gray-200 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-crypto-dark/95 backdrop-blur-md border-b border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-blue-600 to-cyan-400 p-2 rounded-lg text-white shadow-lg shadow-blue-500/20">
              <NotebookPen size={20} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight hidden sm:block">
              Crypto<span className="text-crypto-accent">Diary</span>
            </h1>
          </div>
          
          <div className="flex gap-3 text-sm">
            {/* Realized PnL */}
            <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700">
              <Wallet size={14} className="text-gray-400" />
              <div className="flex flex-col sm:flex-row sm:gap-2 items-baseline">
                <span className="text-[10px] text-gray-500 uppercase font-bold">已落袋</span>
                <span className={`font-mono font-bold leading-none ${calculateTotalRealizedPnL() >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
                  ${calculateTotalRealizedPnL().toFixed(2)}
                </span>
              </div>
            </div>
            
            {/* Unrealized PnL */}
            {holdingTrades.length > 0 && (
              <div className="flex items-center gap-2 bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-500/30">
                <Activity size={14} className="text-blue-400" />
                <div className="flex flex-col sm:flex-row sm:gap-2 items-baseline">
                  <span className="text-[10px] text-blue-300 uppercase font-bold">持仓中</span>
                  <span className={`font-mono font-bold leading-none ${calculateTotalUnrealizedPnL() >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
                    ${calculateTotalUnrealizedPnL().toFixed(2)}
                  </span>
                </div>
                <button 
                  onClick={refreshPrices}
                  disabled={refreshing}
                  className={`ml-1 p-1 rounded-full hover:bg-blue-800/50 transition-colors ${refreshing ? 'animate-spin text-white' : 'text-blue-400'}`}
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-6">
          <TradeCalculator onAddTrade={addTrade} />
          
          <div className="bg-crypto-card rounded-xl border border-gray-700 p-4 shadow-lg">
             <div className="flex items-center gap-2 mb-4 text-white font-semibold">
                <Clock size={18} className="text-crypto-accent" />
                <span>收益日历</span>
             </div>
             <Calendar trades={closedTrades} />
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 flex flex-col h-full space-y-6">
          
          {/* Daily Summary */}
          <section className="bg-crypto-card p-5 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
               <FileText size={100} />
             </div>
             <div className="flex justify-between items-center mb-3 relative z-10">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 p-1 rounded"><NotebookPen size={16}/></span>
                  今日复盘
                </h2>
                <button 
                  onClick={handleGenerate}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-900/20"
                >
                  <FileText size={14} /> 生成报告
                </button>
             </div>
             <textarea
                className="w-full h-28 bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-crypto-accent focus:ring-1 focus:ring-crypto-accent/50 resize-none placeholder-gray-600 custom-scrollbar relative z-10"
                placeholder="记录今日的市场情绪、关键点位观察或策略调整..."
                value={dailySummary}
                onChange={(e) => setDailySummary(e.target.value)}
              />
          </section>

          {/* Markdown Preview */}
          {showMarkdown && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                  <FileText size={14}/> Markdown 预览
                </h3>
                <button
                  onClick={handleCopy}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                    copySuccess ? 'text-green-400 bg-green-900/20' : 'text-crypto-accent hover:text-white hover:bg-white/10'
                  }`}
                >
                  {copySuccess ? <CheckCircle size={12}/> : <Copy size={12}/>}
                  {copySuccess ? '已复制' : '复制全部'}
                </button>
              </div>
              <textarea 
                readOnly
                value={markdownContent}
                className="w-full h-48 bg-black/40 border border-gray-800 rounded p-3 text-xs font-mono text-gray-300 focus:outline-none custom-scrollbar"
              />
            </div>
          )}

          {/* Trade List */}
          <div className="bg-crypto-card rounded-xl border border-gray-700 flex flex-col shadow-lg overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-gray-700 bg-gray-800/30 flex justify-between items-center">
               <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                 <span className="bg-indigo-500/20 text-indigo-400 p-1 rounded"><TrendingUp size={16}/></span>
                 交易记录
               </h2>
               <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded">
                 Total: {trades.length}
               </span>
            </div>
            
            <div className="flex-1 overflow-auto max-h-[800px] custom-scrollbar p-2">
              {trades.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-500 h-64">
                  <div className="bg-gray-800 rounded-full p-4 mb-3">
                    <TrendingUp size={32} className="text-gray-600" />
                  </div>
                  <p>暂无记录</p>
                  <p className="text-xs mt-1">左侧添加第一笔交易</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Holding Section */}
                  {holdingTrades.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                        <Clock size={10} /> 持仓中 / 挂单
                      </div>
                      {holdingTrades.map(trade => <TradeCard key={trade.id} trade={trade} />)}
                    </div>
                  )}

                  {/* Closed Section */}
                  {closedTrades.length > 0 && (
                    <div className="space-y-1">
                       {holdingTrades.length > 0 && (
                          <div className="px-2 py-1 mt-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle size={10} /> 已平仓历史
                          </div>
                       )}
                       {closedTrades.map(trade => <TradeCard key={trade.id} trade={trade} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;