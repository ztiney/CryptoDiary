import { GoogleGenAI } from "@google/genai";
import { TradeRecord } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const generateEnhancedMarkdown = async (
  trades: TradeRecord[],
  notes: string
): Promise<string> => {
  try {
    const ai = getClient();
    
    // Determine overall PnL for context
    const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
    const winRate = trades.length > 0 
      ? (trades.filter(t => t.pnl > 0).length / trades.length * 100).toFixed(1) 
      : 0;

    const prompt = `
      你是一位专业的加密货币交易分析师。
      请将我今天的交易日记整理成一份清晰、结构化、专业的 Markdown 报告（请使用中文回答）。
      
      以下是我今天的原始数据：
      
      **总体统计:**
      - 总盈亏: ${totalPnL.toFixed(2)} USD
      - 胜率: ${winRate}%
      - 交易笔数: ${trades.length}
      
      **原始心得/笔记:**
      ${notes}
      
      **交易历史数据 (JSON):**
      ${JSON.stringify(trades, null, 2)}
      
      **要求:**
      1. 开头请给出一个吸引人的标题，总结今天的表现（例如：“多空双杀”、“稳健获利”、“需要加强风控”等）。
      2. 撰写一段简练的“市场复盘与总结”，结合我的原始笔记和表现。语言要专业但真实，像一个资深交易员的语气。
      3. 创建一个 Markdown 表格列出交易详情，表头请用中文：币种, 类型, 方向, 开仓价, 平仓价, 杠杆, 收益率%, 盈亏($)。根据盈亏情况在行首添加 emoji ✅ 或 ❌。
      4. 添加“关键要点”部分，列出 3 条基于数据和笔记的教训或观察。
      5. 输出结果只包含 Markdown 内容，不要包含 JSON 代码块。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "生成报告失败。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `生成报告时出错: ${(error as Error).message}。请确保已设置 API Key。`;
  }
};