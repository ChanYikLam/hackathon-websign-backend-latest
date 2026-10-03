/**
 * AI 服务层
 * 统一的 AI 调用服务，支持流式输出和多场景提示词
 */

import { generateLawSummaryForAI } from '@/data/complianceData'

// ============ API 配置 ============
const AI_CONFIG = {
  API_BASE: import.meta.env.VITE_AI_API_BASE || 'https://token.apps.gdmuna.com/v1',
  API_KEY: import.meta.env.VITE_AI_API_KEY || '',
  MODEL: import.meta.env.VITE_AI_MODEL || 'deepseek-v3.2',
  TIMEOUT: 15000
}

// ============ 类型定义 ============
export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AiStreamCallbacks {
  onChunk?: (content: string) => void
  onComplete?: (fullContent: string) => void
  onError?: (error: Error) => void
}

export type PromptType = 'default' | 'result' | 'compliance' | 'scenario' | 'teamRecommendation' | 'home'

// ============ System Prompt 模板 ============
const SYSTEM_PROMPTS: Record<PromptType, string> = {
  default: `你是 SoloPilot AI，一位专注于一人公司（Solopreneur）创业的智能助手。你的职责是：

1. 回答创业相关的合规、法律、税务问题
2. 帮助用户进行经营复盘和策略优化
3. 提供一人公司运营的实用建议
4. 解释商业法规和政策（以中国法律为主）

## 法律知识参考
${generateLawSummaryForAI()}

注意事项：
- 回答应具体、实用、有操作指导性
- 涉及法律问题时，在回答末尾提醒用户"如有疑问建议咨询专业律师"
- 使用中文回答，语气亲切但专业
- 如果用户问的问题与创业无关，礼貌地引导回创业话题
- 回复中使用 markdown 格式让内容更易读`,

  result: `你是一位创业规划顾问，基于用户的MBTI类型、分析结果、用户画像，为用户解释为什么推荐特定方向。

你要用通俗易懂的语言解释，避免过于专业的术语。要有温度，让用户感受到这个方向确实适合他。

## 法律知识参考
${generateLawSummaryForAI()}

注意事项：
- 回答要具体、实用、有操作指导性
- 涉及法律问题时提醒用户"如有疑问建议咨询专业律师"
- 使用 markdown 格式让内容更易读`,

  compliance: `你是一位专业的创业法律顾问。你需要根据用户的问题，从法律条款中找到相关信息并给出实用建议。

回答要具体、可操作，涉及法律问题时提醒用户咨询专业律师。

## 法律知识参考
${generateLawSummaryForAI()}`,

  scenario: `你是一位熟悉中国创业合规场景的专家。用户正在查看特定的合规场景，你需要：

1. 解释该场景下需要注意的法律风险
2. 给出实用的建议和下一步行动
3. 如有疑问，提醒用户咨询专业律师

## 法律知识参考
${generateLawSummaryForAI()}`,

  teamRecommendation: `你是一位AI工具配置专家。你需要根据用户的业务类型、阶段、痛点，推荐合适的AI团队配置。

以JSON格式返回推荐，包括：
- roles: 角色数组，每个角色包含 name(名称), tools(推荐工具数组), reason(推荐原因), monthlyBudget(预估月费)
- reasoning: 推荐理由总结

只推荐真正需要的技术栈，避免过度推荐。工具要具体，避免过于通用或昂贵的选项。`,

  home: `你是SoloPilot的产品助手。你需要根据用户当前所处的人生阶段，给出个性化的欢迎语和行动建议。

用户阶段：
- exploring: 初次访问，还没开始测评
- in_mbti: 正在进行MBTI测评
- mbti_done: 完成MBTI，还没获得结果
- has_results: 已获得分析结果
- active: 已开始创业

回答要简洁、有温度，不超过30字。直接给出建议，不要解释。`
}

// ============ Demo 模式回复 ============
const DEMO_RESPONSES: Record<PromptType, (context?: any) => string> = {
  default: () => `【演示模式】这是模拟的AI回复。在正式环境中，您将获得更详细和专业的建议。

您可以尝试：
- 询问创业初期需要注意什么
- 了解个体户和公司的区别
- 咨询税务申报相关问题`,

  result: (context) => `【演示模式】根据您的情况分析...

由于您是演示模式，完整的个性化解读将在正式环境中显示。

您的MBTI类型和创业画像已经被系统记录，正式使用时会获得精准的方向推荐和详细解读。`,

  compliance: (query) => `【演示模式】关于"${query}"的法律问题...

演示模式下，您会获得基于中国最新法律法规的专业解答。涵盖公司法、税法、劳动法、知识产权法等多个领域。

正式使用时，AI会结合您的具体情况给出实用建议。`,

  scenario: (context) => `【演示模式】关于「${context?.scenarioTitle || '该场景'}」...

演示模式。正式使用时，AI会根据具体场景和您的实际情况，给出：
1. 该场景下的核心法律风险
2. 实用的应对建议
3. 具体的行动清单`,

  teamRecommendation: () => `【演示模式】AI团队推荐...

演示模式下显示通用推荐。正式使用时，AI会根据您的：
- MBTI类型
- 创业方向
- 业务痛点

生成专属的AI团队配置方案，包括具体的工具推荐、月费预算和配置理由。`,

  home: (context) => {
    const stageMessages: Record<string, string> = {
      exploring: '欢迎！准备好开启你的创业之旅了吗？',
      in_mbti: 'MBTI测试正在进行中...',
      mbti_done: '分析即将完成，你的方法论已成型',
      has_results: '欢迎回来，你的创业方案已就绪',
      active: '创业路上，SoloPilot与你同行'
    }
    return stageMessages[context?.stage || 'exploring'] || '欢迎使用 SoloPilot'
  }
}

// ============ 核心 AI 函数 ============

/**
 * 流式聊天 - 核心 AI 调用函数
 * @param messages 消息列表
 * @param callbacks 流式回调
 */
export async function* streamChat(
  messages: AiMessage[],
  callbacks?: AiStreamCallbacks
): AsyncGenerator<string, void, unknown> {
  const apiKey = AI_CONFIG.API_KEY

  // Demo 模式
  if (!apiKey || apiKey === 'demo') {
    const demoType = detectPromptType(messages)
    const demoResponse = DEMO_RESPONSES[demoType]?.(extractContext(messages))
    if (demoResponse) {
      for (const char of demoResponse) {
        yield char
        callbacks?.onChunk?.(char)
        await sleep(10)
      }
      callbacks?.onComplete?.(demoResponse)
      return
    }
  }

  const response = await fetch(`${AI_CONFIG.API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: AI_CONFIG.MODEL,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048
    }),
    signal: AbortSignal.timeout(AI_CONFIG.TIMEOUT)
  })

  if (!response.ok) {
    throw new Error(`AI请求失败: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        try {
          const json = JSON.parse(trimmed.slice(6))
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            fullContent += delta
            callbacks?.onChunk?.(delta)
            yield delta
          }
        } catch {
          // 忽略无法解析的行
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  callbacks?.onComplete?.(fullContent)
}

/**
 * 非流式聊天（简单场景）
 */
export async function chat(message: string, promptType: PromptType = 'default'): Promise<string> {
  const messages: AiMessage[] = [
    { role: 'system', content: SYSTEM_PROMPTS[promptType] },
    { role: 'user', content: message }
  ]

  let fullResponse = ''
  for await (const chunk of streamChat(messages)) {
    fullResponse += chunk
  }

  return fullResponse
}

/**
 * 构建带上下文的 System Prompt
 */
export function buildContextPrompt(promptType: PromptType, context?: any): string {
  let prompt = SYSTEM_PROMPTS[promptType]

  if (context) {
    prompt += `\n\n## 用户上下文\n${JSON.stringify(context, null, 2)}`
  }

  return prompt
}

// ============ 辅助函数 ============

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function detectPromptType(messages: AiMessage[]): PromptType {
  // 从 system message 中检测类型
  const systemMessage = messages.find(m => m.role === 'system')
  if (!systemMessage) return 'default'

  const content = systemMessage.content

  if (content.includes('创业规划顾问') || content.includes('MBTI类型')) {
    return 'result'
  }
  if (content.includes('法律顾问') && content.includes('场景')) {
    return 'scenario'
  }
  if (content.includes('AI工具配置专家')) {
    return 'teamRecommendation'
  }
  if (content.includes('产品助手') && content.includes('人生阶段')) {
    return 'home'
  }
  if (content.includes('法律顾问') && content.includes('问题')) {
    return 'compliance'
  }

  return 'default'
}

function extractContext(messages: AiMessage[]): any {
  // 从 messages 中提取上下文信息
  const contexts: any = {}

  // 查找最近的 user message
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  if (lastUserMessage) {
    contexts.query = lastUserMessage.content
  }

  // 查找 system message 中的上下文
  const systemMessage = messages.find(m => m.role === 'system')
  if (systemMessage?.content.includes('用户上下文')) {
    try {
      const match = systemMessage.content.match(/## 用户上下文\n([\s\S]+)$/)
      if (match) {
        Object.assign(contexts, JSON.parse(match[1]))
      }
    } catch {
      // ignore
    }
  }

  return contexts
}

// ============ 预设 Prompt 生成器 ============

/**
 * 生成结果解读的 prompt
 */
export function generateResultPrompt(
  mbtiType: string,
  directionName: string,
  profile: any,
  directionReason: string
): string {
  return `Based on the user's profile and recommended direction, explain why this direction is recommended.

## User Info
- MBTI: ${mbtiType}
- Profile tags: ${profile?.tags?.join(', ') || 'N/A'}
- Profile description: ${profile?.description || 'N/A'}

## Recommended Direction
- Name: ${directionName}
- Reason: ${directionReason}

Please explain in 200 words or less:
1. Why this direction matches their personality and skills
2. What specific strengths make them suitable for this
3. What challenges they might face and how to overcome them

Keep it practical, encouraging, and easy to understand.`
}

/**
 * 生成合规咨询的 prompt
 */
export function generateCompliancePrompt(
  query: string,
  scenarioTitle?: string,
  relevantArticles?: string[]
): string {
  let prompt = `用户咨询: "${query}"`

  if (scenarioTitle) {
    prompt += `\n\n用户正在查看场景:「${scenarioTitle}」`
  }

  if (relevantArticles && relevantArticles.length > 0) {
    prompt += `\n\n相关法律条款: ${relevantArticles.join(', ')}`
  }

  prompt += `\n\n请给出实用、可操作的建议。`

  return prompt
}

/**
 * 生成 AI 团队推荐的 prompt
 */
export function generateTeamRecommendationPrompt(
  mbtiType: string,
  directions: any[],
  userType: string,
  painPoint?: string
): string {
  return `Based on the user's profile, recommend the most suitable AI team configuration.

## User Profile
- MBTI: ${mbtiType}
- Recommended directions: ${directions.map(d => d.name).join(', ')}
- User type: ${userType}
- Main pain point: ${painPoint || 'Not specified'}

Consider:
1. Their main business direction and what tasks consume most time
2. Budget constraints implied by their chosen direction
3. Stage of business (starting vs. scaling)
4. Their MBTI personality and work style

Return a JSON object with this structure:
{
  "reasoning": "Brief explanation of the recommendation",
  "roles": [
    {
      "name": "Role name",
      "tools": ["tool1", "tool2"],
      "reason": "Why this role is needed",
      "monthlyBudget": "Cost range"
    }
  ]
}`
}

/**
 * 生成欢迎语的 prompt
 */
export function generateWelcomePrompt(userStage: string): string {
  return `用户当前阶段: ${userStage}

请直接给出一句简短的欢迎语或行动建议，不超过30字，要有温度。`
}

// ============ Markdown 渲染（供前端使用）===========
export function renderMarkdown(text: string): string {
  if (!text) return ''

  return text
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="ai-chat__code"><code>$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="ai-chat__inline-code">$1</code>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 标题
    .replace(/^### (.+)$/gm, '<h4 class="ai-chat__md-h">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="ai-chat__md-h">$1</h3>')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li class="ai-chat__md-li">$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li class="ai-chat__md-li">$1</li>')
    // 换行
    .replace(/\n/g, '<br>')
}

// ============ 导出配置（供外部使用）===========
export { AI_CONFIG }
