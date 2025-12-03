import React from 'react';
import { TradeRecord } from '../types';

interface CalendarProps {
  trades: TradeRecord[];
}

const Calendar: React.FC<CalendarProps> = ({ trades }) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = React.useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  // Group trades by date (YYYY-MM-DD)
  const dailyPnL: Record<string, number> = {};
  trades.forEach(trade => {
    const dateStr = new Date(trade.timestamp).toLocaleDateString('zh-CN');
    if (!dailyPnL[dateStr]) dailyPnL[dateStr] = 0;
    dailyPnL[dateStr] += trade.pnl;
  });

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const renderDays = () => {
    const days = [];
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 bg-gray-900/30 border border-gray-800/50"></div>);
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const dateStr = dateCheck.toLocaleDateString('zh-CN');
      const pnl = dailyPnL[dateStr];
      const isToday = new Date().toDateString() === dateCheck.toDateString();

      days.push(
        <div key={d} className={`h-20 border border-gray-800 p-1 flex flex-col justify-between transition-colors hover:bg-gray-800 ${isToday ? 'bg-gray-800/80 ring-1 ring-blue-500' : 'bg-gray-900'}`}>
          <span className={`text-xs font-mono ${isToday ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>{d}</span>
          {pnl !== undefined && (
            <div className={`text-xs font-bold text-center ${pnl >= 0 ? 'text-crypto-up' : 'text-crypto-down'}`}>
              {pnl > 0 ? '+' : ''}{Math.round(pnl)}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-crypto-card rounded-xl border border-gray-700 p-4">
      <div className="flex justify-between items-center mb-4 text-white">
        <button onClick={() => changeMonth(-1)} className="p-1 hover:text-crypto-accent">&lt;</button>
        <span className="font-bold text-lg">
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </span>
        <button onClick={() => changeMonth(1)} className="p-1 hover:text-crypto-accent">&gt;</button>
      </div>
      
      <div className="grid grid-cols-7 gap-px text-center mb-1">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="text-xs text-gray-500 py-1">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-px rounded overflow-hidden border border-gray-800">
        {renderDays()}
      </div>
      <div className="mt-3 flex justify-between text-xs text-gray-500 px-1">
        <span>* 显示每日净盈亏 (USD)</span>
        <span>今日: {new Date().toLocaleDateString('zh-CN')}</span>
      </div>
    </div>
  );
};

export default Calendar;
