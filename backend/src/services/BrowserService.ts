import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { logger } from '../utils/logger'

export interface BrowserConfig {
  headless?: boolean
  viewport?: { width: number; height: number }
  userAgent?: string
  proxy?: { server: string; username?: string; password?: string }
}

const DEFAULT_CONFIG: BrowserConfig = {
  headless: true,
  viewport: { width: 1280, height: 720 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

export class BrowserService {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private config: BrowserConfig

  constructor(config: Partial<BrowserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async init(): Promise<void> {
    try {
      logger.info('Initializing browser...')

      this.browser = await chromium.launch({
        headless: this.config.headless
      })

      const contextOptions: any = {
        viewport: this.config.viewport,
        userAgent: this.config.userAgent
      }

      if (this.config.proxy) {
        contextOptions.proxy = this.config.proxy
      }

      this.context = await this.browser.newContext(contextOptions)
      this.page = await this.context.newPage()

      logger.info('Browser initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize browser', { error })
      throw error
    }
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized')
    }

    try {
      logger.info('Navigating to URL', { url })
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      logger.info('Navigation complete', { url })
    } catch (error) {
      logger.error('Navigation failed', { url, error })
      throw error
    }
  }

  async click(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized')
    }

    try {
      logger.debug('Clicking element', { selector })
      await this.page.click(selector, { timeout: 10000 })
      logger.debug('Click complete', { selector })
    } catch (error) {
      logger.error('Click failed', { selector, error })
      throw error
    }
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized')
    }

    try {
      logger.debug('Typing text', { selector, textLength: text.length })
      await this.page.fill(selector, text)
      logger.debug('Type complete', { selector })
    } catch (error) {
      logger.error('Type failed', { selector, error })
      throw error
    }
  }

  async scroll(direction: 'up' | 'down', amount: number = 500): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized')
    }

    try {
      const scrollAmount = direction === 'down' ? amount : -amount
      if (!this.page) {
        throw new Error('Browser not initialized')
      }
      await this.page.evaluate((scrollY: number) => {
        (globalThis as any).window.scrollBy(0, scrollY)
      }, scrollAmount)
      logger.debug('Scroll complete', { direction, amount })
    } catch (error) {
      logger.error('Scroll failed', { direction, error })
      throw error
    }
  }

  async extract(selector: string): Promise<string | null> {
    if (!this.page) {
      throw new Error('Browser not initialized')
    }

    try {
      const element = await this.page.$(selector)
      if (!element) {
        return null
      }
      const text = await element.textContent()
      logger.debug('Extract complete', { selector, textLength: text?.length })
      return text
    } catch (error) {
      logger.error('Extract failed', { selector, error })
      throw error
    }
  }

  async wait(ms: number): Promise<void> {
    logger.debug('Waiting', { ms })
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  async waitForSelector(selector: string, timeout: number = 10000): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized')
    }

    try {
      await this.page.waitForSelector(selector, { timeout })
      logger.debug('Wait for selector complete', { selector })
    } catch (error) {
      logger.error('Wait for selector failed', { selector, error })
      throw error
    }
  }

  async screenshot(): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Browser not initialized')
    }

    try {
      const screenshot = await this.page.screenshot({ type: 'png' })
      logger.debug('Screenshot captured')
      return screenshot
    } catch (error) {
      logger.error('Screenshot failed', { error })
      throw error
    }
  }

  async getPageContent(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized')
    }

    return await this.page.content()
  }

  async getCurrentUrl(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized')
    }

    return this.page.url()
  }

  getPage(): Page | null {
    return this.page
  }

  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close()
        this.context = null
      }
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
      this.page = null
      logger.info('Browser closed')
    } catch (error) {
      logger.error('Failed to close browser', { error })
      throw error
    }
  }
}
