import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { logger } from '../utils/logger'
import type { AgentConfig, ActionType } from '@autobrowse/shared'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface PlannedAction {
  action: ActionType
  target?: string
  value?: string
  description: string
}

// Available models configuration
export const AVAILABLE_MODELS = {
  'deepseek-chat': {
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com'
  },
  'deepseek-reasoner': {
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    model: 'deepseek-reasoner',
    baseUrl: 'https://api.deepseek.com'
  },
  'claude-sonnet': {
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250514'
  },
  'gpt-4': {
    name: 'GPT-4',
    provider: 'openai',
    model: 'gpt-4-turbo-preview'
  },
  'gemini-pro': {
    name: 'Gemini Pro',
    provider: 'google',
    model: 'gemini-pro'
  }
} as const

// Default model - DeepSeek
const DEFAULT_MODEL = 'deepseek-chat'

const BROWSER_SYSTEM_PROMPT = `You are an AI assistant that helps automate web browser tasks. You analyze user requests and break them down into specific browser actions.

Available actions:
- navigate: Go to a URL
- click: Click on an element (use CSS selectors or describe the element)
- type: Enter text into an input field
- scroll: Scroll the page (up/down)
- extract: Extract text content from an element
- wait: Wait for a specified time or element
- screenshot: Take a screenshot of the current page

When planning browser actions, respond with a JSON array of actions. Each action should have:
- action: The action type
- target: CSS selector or element description (if applicable)
- value: Input value (for type action) or URL (for navigate)
- description: Brief description of what this action does

Example response:
[
  {"action": "navigate", "value": "https://example.com", "description": "Navigate to example.com"},
  {"action": "click", "target": "button.submit", "description": "Click the submit button"},
  {"action": "type", "target": "input[name='search']", "value": "search term", "description": "Enter search term"}
]

Be precise with selectors and provide clear descriptions.`

export class AgentService {
  private anthropicClient: Anthropic | null = null
  private deepseekClient: OpenAI
  private openaiClient: OpenAI | null = null
  private conversationHistory: Message[] = []
  private config: AgentConfig
  private currentModel: AgentConfig['model']

  constructor(config?: Partial<AgentConfig>) {
    // Initialize DeepSeek client (default)
    this.deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com'
    })

    // Initialize Anthropic client if key is available
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key') {
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      })
    }

    // Initialize OpenAI client if key is available
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_key') {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }

    this.currentModel = config?.model || DEFAULT_MODEL

    this.config = {
      model: this.currentModel,
      maxSteps: 50,
      outputType: 'streaming',
      highlightElements: true,
      hashMode: false,
      thinking: true,
      vision: true,
      profile: null,
      proxyLocation: 'auto',
      allowedDomains: [],
      secrets: {},
      enabledSkills: [],
      ...config
    }

    logger.info('AgentService initialized', {
      model: this.currentModel,
      hasDeepSeek: !!process.env.DEEPSEEK_API_KEY,
      hasAnthropic: !!this.anthropicClient,
      hasOpenAI: !!this.openaiClient
    })
  }

  async chat(userMessage: string): Promise<string> {
    try {
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      })

      logger.debug('Sending message to LLM', {
        messageLength: userMessage.length,
        model: this.currentModel
      })

      const assistantMessage = await this.callLLM(
        this.conversationHistory,
        undefined
      )

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      })

      logger.debug('Received response from LLM', {
        responseLength: assistantMessage.length,
        model: this.currentModel
      })

      return assistantMessage
    } catch (error) {
      logger.error('Chat error', { error, model: this.currentModel })
      throw error
    }
  }

  private async callLLM(messages: Message[], systemPrompt?: string): Promise<string> {
    const modelConfig = AVAILABLE_MODELS[this.currentModel as keyof typeof AVAILABLE_MODELS] || AVAILABLE_MODELS[DEFAULT_MODEL]

    logger.info('Calling LLM', {
      model: this.currentModel,
      provider: modelConfig.provider,
      messageCount: messages.length
    })

    // Use DeepSeek (default)
    if (modelConfig.provider === 'deepseek') {
      const response = await this.deepseekClient.chat.completions.create({
        model: modelConfig.model,
        max_tokens: 4096,
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })

      return response.choices[0]?.message?.content || ''
    }

    // Use Anthropic (Claude)
    if (modelConfig.provider === 'anthropic' && this.anthropicClient) {
      const response = await this.anthropicClient.messages.create({
        model: modelConfig.model,
        max_tokens: 4096,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: messages
      })

      return response.content[0].type === 'text' ? response.content[0].text : ''
    }

    // Use OpenAI (GPT)
    if (modelConfig.provider === 'openai' && this.openaiClient) {
      const response = await this.openaiClient.chat.completions.create({
        model: modelConfig.model,
        max_tokens: 4096,
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })

      return response.choices[0]?.message?.content || ''
    }

    // Fallback to DeepSeek if configured model not available
    logger.warn('Configured model not available, falling back to DeepSeek', {
      requestedModel: this.currentModel
    })

    const response = await this.deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 4096,
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ]
    })

    return response.choices[0]?.message?.content || ''
  }

  async planBrowserActions(taskDescription: string, pageContext?: string): Promise<PlannedAction[]> {
    try {
      let prompt = `Task: ${taskDescription}`

      if (pageContext) {
        prompt += `\n\nCurrent page context:\n${pageContext}`
      }

      prompt += '\n\nPlan the browser actions needed to complete this task. Respond with only the JSON array of actions.'

      logger.info('Planning browser actions', { task: taskDescription, model: this.currentModel })

      const content = await this.callLLM(
        [{ role: 'user', content: prompt }],
        BROWSER_SYSTEM_PROMPT
      )

      // Extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        logger.error('No valid JSON found in response', { content })
        throw new Error('Failed to parse action plan')
      }

      const actions: PlannedAction[] = JSON.parse(jsonMatch[0])

      logger.info('Actions planned', { actionCount: actions.length, model: this.currentModel })

      return actions
    } catch (error) {
      logger.error('Planning error', { error, model: this.currentModel })
      throw error
    }
  }

  async analyzeScreenshot(screenshot: Buffer, question: string): Promise<string> {
    try {
      const base64Image = screenshot.toString('base64')

      // Use Claude for vision if available (Claude has best vision capabilities)
      if (this.anthropicClient) {
        logger.debug('Using Claude for screenshot analysis (vision)')

        const response = await this.anthropicClient.messages.create({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: base64Image
                  }
                },
                {
                  type: 'text',
                  text: question
                }
              ]
            }
          ]
        })

        const content = response.content[0].type === 'text'
          ? response.content[0].text
          : ''

        logger.debug('Screenshot analyzed with Claude')
        return content
      }

      // Fallback: Use text-only analysis with DeepSeek (no vision)
      logger.warn('No vision-capable model available, using text-only analysis')

      const response = await this.callLLM(
        [{
          role: 'user',
          content: `I have a screenshot of a webpage. Based on the question, provide a reasonable response even though you cannot see the image. Question: ${question}\n\nProvide helpful guidance about what might typically be on such a page.`
        }],
        'You are analyzing a webpage. Provide helpful responses about typical webpage layouts and interactions.'
      )

      return response
    } catch (error) {
      logger.error('Screenshot analysis error', { error })
      throw error
    }
  }

  clearHistory(): void {
    this.conversationHistory = []
    logger.debug('Conversation history cleared')
  }

  getHistory(): Message[] {
    return [...this.conversationHistory]
  }

  getConfig(): AgentConfig {
    return { ...this.config }
  }

  getCurrentModel(): string {
    return this.currentModel
  }

  setModel(modelId: string): void {
    if (AVAILABLE_MODELS[modelId as keyof typeof AVAILABLE_MODELS]) {
      this.currentModel = modelId as AgentConfig['model']
      this.config.model = modelId as AgentConfig['model']
      logger.info('Model changed', { model: modelId })
    } else {
      logger.warn('Unknown model, keeping current', { requested: modelId, current: this.currentModel })
    }
  }

  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config }
    if (config.model) {
      this.setModel(config.model)
    }
    logger.debug('Agent config updated', { config: this.config })
  }

  static getAvailableModels() {
    return AVAILABLE_MODELS
  }
}
