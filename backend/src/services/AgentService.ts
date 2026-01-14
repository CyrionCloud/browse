import Anthropic from '@anthropic-ai/sdk'
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
  private client: Anthropic
  private conversationHistory: Message[] = []
  private config: AgentConfig

  constructor(config?: Partial<AgentConfig>) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    this.config = {
      model: 'claude-sonnet-4.5',
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
  }

  async chat(userMessage: string): Promise<string> {
    try {
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      })

      logger.debug('Sending message to Claude', { messageLength: userMessage.length })

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        messages: this.conversationHistory
      })

      const assistantMessage = response.content[0].type === 'text'
        ? response.content[0].text
        : ''

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      })

      logger.debug('Received response from Claude', { responseLength: assistantMessage.length })

      return assistantMessage
    } catch (error) {
      logger.error('Chat error', { error })
      throw error
    }
  }

  async planBrowserActions(taskDescription: string, pageContext?: string): Promise<PlannedAction[]> {
    try {
      let prompt = `Task: ${taskDescription}`

      if (pageContext) {
        prompt += `\n\nCurrent page context:\n${pageContext}`
      }

      prompt += '\n\nPlan the browser actions needed to complete this task. Respond with only the JSON array of actions.'

      logger.info('Planning browser actions', { task: taskDescription })

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        system: BROWSER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      })

      const content = response.content[0].type === 'text'
        ? response.content[0].text
        : ''

      // Extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        logger.error('No valid JSON found in response', { content })
        throw new Error('Failed to parse action plan')
      }

      const actions: PlannedAction[] = JSON.parse(jsonMatch[0])

      logger.info('Actions planned', { actionCount: actions.length })

      return actions
    } catch (error) {
      logger.error('Planning error', { error })
      throw error
    }
  }

  async analyzeScreenshot(screenshot: Buffer, question: string): Promise<string> {
    try {
      const base64Image = screenshot.toString('base64')

      const response = await this.client.messages.create({
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

      logger.debug('Screenshot analyzed')

      return content
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

  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config }
    logger.debug('Agent config updated', { config: this.config })
  }
}
