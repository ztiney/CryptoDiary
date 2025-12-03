
import React, { useState } from 'react';
import TradeCalculator from './components/TradeCalculator';
import Calendar from './components/Calendar';
import { TradeRecord } from './types';

const App: React.FC = () => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [dailySummary, setDailySummary] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');

  const addTrade = (trade: TradeRecord) => {
    setTrades([trade, ...trades]);
  };

  const removeTrade = (id: string) => {
    setTrades(trades.filter(t => t.id !== id));
  };

  const updateTradeNote = (id: string, note: string) => {
    setTrades(trades.map(t => t.id === id ? { ...t, note } : t));
  };

  // Split trades
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const holdingTrades = trades.filter(t => t.status === 'HOLDING');

  const calculateTotalRealizedPnL = () => closedTrades.reduce((acc, t) => acc + t.pnl, 0);
  const calculateTotalUnrealizedPnL = () => holdingTrades.reduce((acc, t) => acc + t.pnl, 0);

  const generateMarkdown = () => {
    const date = new Date().toLocaleDateString('zh-CN');
    let md = `# 📅 交易日记 - ${date}\n\n`;
    
    // Add Daily Summary
    md += `## 📝 今日复盘\n`;
    md += `${dailySummary || '（今日暂无详细总结）'}\n\n`;
    
    // Stats (Realized)
    const realizedPnL = calculateTotalRealizedPnL();
    const unrealizedPnL = calculateTotalUnrealizedPnL();
    const winRate = closedTrades.length > 0 
      ? (closedTrades.filter(t => t.pnl > 0).length / closedTrades.length * 100).toFixed(1) 
      : 0;

    md += `## 📊 账户统计\n`;
    md += `- **已实现盈亏 (Realized)**: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)}\n`;
    md += `- **未实现盈亏 (Unrealized)**: ${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toFixed(2)}\n`;
    md += `- **胜率 (仅平仓)**: ${winRate}%\n`;
    md += `- **交易笔数**: 已平仓 ${closedTrades.length} | 持仓中 ${holdingTrades.length}\n\n`;

    // Function to render table
    const renderTable = (list: TradeRecord[]) => {
      let table = `| 币种 | 类型 | 价格 (开/现) | 投入/杠杆 | 盈亏 | 备注 |\n`;
      table += `|---|---|---|---|---|---|\n`;
      list.forEach(t => {
        const pnlIcon = t.pnl >= 0 ? '🟢' : '🔴';
        const directionStr = t.direction === 'LONG' ? '做多' : '做空';
        const typeStr = t.type === 'SPOT' ? '现货' : '合约';
        const prices = `$${t.entryPrice} / $${t.exitPrice}`;
        const size = t.type === 'FUTURES' ? `${t.leverage}x` : `$${t.amount}`;
        const note = t.note ? t.note.replace(/\n/g, ' ') : '-';
        table += `| **${t.symbol}** | ${typeStr} ${directionStr} | ${prices} | ${size} | ${pnlIcon} $${t.pnl.toFixed(2)} | ${note} |\n`;
      });
      return table;
    };

    if (closedTrades.length > 0) {
      md += `## ✅ 已平仓交易 (Closed)\n`;
      md += renderTable(closedTrades);
      md += `\n`;
    }

    if (holdingTrades.length > 0) {
      md += `## ⏳ 当前持仓/挂单 (Holding)\n`;
      md += renderTable(holdingTrades);
      md += `\n`;
    }
    
    return md;
  };

  const handleGenerate = () => {
    setMarkdownContent(generateMarkdown());
    setShowMarkdown(true);
  };

  const TradeCard = ({ trade }: { trade: TradeRecord }) => (
    <div className={`p-4 transition-colors border-l-4 ${trade.status === 'HOLDING' ? 'bg-blue-900/10 border-blue-500 hover:bg-blue-900/20' : 'bg-gray-800/30 border-gray-600 hover:bg-gray-800/50'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-white">{trade.symbol}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${trade.direction === 'LONG' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
              {trade.type === 'FUTURES' ? (trade.direction === 'LONG' ? '做多' : '做空') : '现货'}
            </span>
            {trade.status === 'HOLDING' && (
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">持仓中</span>
            )}
            <span className="text-xs text-gray-500">
              {trade.type === 'FUTURES' ? `${trade.leverage}x` : `投入: $${trade.amount}`}
            </span>
        </div>
        <div className={`text-right font-mono font-bold ${trade.pnl >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)} USD
          <div className="text-[10px] text-gray-500 font-normal">ROI: {trade.roi.toFixed(2)}%</div>
        </div>
      </div>
      
      <div className="flex gap-4 text-xs text-gray-400 mb-3">
        <span>开: <span className="text-gray-300">${trade.entryPrice}</span></span>
        <span>{trade.status === 'HOLDING' ? '现/预:' : '平:'} <span className="text-gray-300">${trade.exitPrice}</span></span>
      </div>

      <div className="relative">
        <input
            type="text"
            value={trade.note}
            onChange={(e) => updateTradeNote(trade.id, e.target.value)}
            placeholder="添加心得/备注..."
            className="w-full bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:border-crypto-accent focus:outline-none transition-colors"
        />
        <button 
            onClick={() => removeTrade(trade.id)}
            className="absolute right-2 top-2 text-gray-600 hover:text-red-500"
            title="删除此记录"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-crypto-dark text-gray-200 font-sans pb-10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-crypto-dark shadow-md border-b border-gray-800">
        <div className="p-4 flex justify-between items-center max-w-7xl mx-auto w-full">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">📒</span>
            CryptoJournal
          </h1>
          <div className="flex gap-4 text-sm font-mono">
            <div className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
              <span className="text-gray-400 text-xs block">已实现 (Realized)</span>
              <span className={`font-bold ${calculateTotalRealizedPnL() >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
                ${calculateTotalRealizedPnL().toFixed(2)}
              </span>
            </div>
            {holdingTrades.length > 0 && (
              <div className="bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-900/50">
                <span className="text-blue-300 text-xs block">持仓浮盈 (Unrealized)</span>
                <span className={`font-bold ${calculateTotalUnrealizedPnL() >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
                  ${calculateTotalUnrealizedPnL().toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Calculator & Calendar */}
        <div className="lg:col-span-4 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3 text-gray-300 flex items-center">
              🧮 交易/持仓记录
            </h2>
            <TradeCalculator onAddTrade={addTrade} />
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-gray-300 flex items-center">
              📅 已实现盈亏日历
            </h2>
            {/* Note: Calendar typically only tracks REALIZED gains */}
            <Calendar trades={closedTrades} />
          </section>
        </div>

        {/* Right Column: Daily Summary & Trade List */}
        <div className="lg:col-span-8 flex flex-col h-full space-y-6">
          
          {/* Daily Summary Input */}
          <section className="bg-crypto-card p-4 rounded-xl border border-gray-700 shadow-sm">
             <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-white">📝 今日复盘总结</h2>
                <button 
                  onClick={handleGenerate}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <span>⬇️</span> 一键生成 Markdown
                </button>
             </div>
             <textarea
                className="w-full h-24 bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-crypto-accent resize-none placeholder-gray-600"
                placeholder="在此写下今天的整体市场观察、情绪总结或策略反思（将包含在导出报告中）..."
                value={dailySummary}
                onChange={(e) => setDailySummary(e.target.value)}
              />
          </section>

          {/* Trade List Container */}
          <div className="flex-1 bg-crypto-card rounded-xl border border-gray-700 flex flex-col shadow-sm min-h-[500px]">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
               <h2 className="text-lg font-semibold text-white">📋 交易列表 ({trades.length})</h2>
            </div>
            
            <div className="flex-1 overflow-auto max-h-[800px] custom-scrollbar">
              {trades.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-500 py-12">
                  <p>暂无记录，请在左侧添加交易或持仓。</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {/* Holding Section (if any) */}
                  {holdingTrades.length > 0 && (
                    <div className="bg-blue-900/5">
                      <div className="px-4 py-2 text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-900/20">
                        ⏳ 当前持仓 / 挂单 (Open Positions)
                      </div>
                      {holdingTrades.map(trade => <TradeCard key={trade.id} trade={trade} />)}
                    </div>
                  )}

                  {/* Closed Section (if any) */}
                  {closedTrades.length > 0 && (
                    <div className="">
                       {holdingTrades.length > 0 && (
                          <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-800">
                            ✅ 已平仓 (Closed)
                          </div>
                       )}
                       {closedTrades.map(trade => <TradeCard key={trade.id} trade={trade} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Markdown Output Area */}
          {showMarkdown && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-400">Markdown 预览</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(markdownContent);
                    alert('已复制到剪贴板！');
                  }}
                  className="text-xs text-crypto-accent hover:text-white"
                >
                  📋 复制全部
                </button>
              </div>
              <textarea 
                readOnly
                value={markdownContent}
                className="w-full h-64 bg-black/40 border border-gray-800 rounded p-3 text-xs font-mono text-gray-300 focus:outline-none custom-scrollbar"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
