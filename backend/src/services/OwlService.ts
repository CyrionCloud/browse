import { EventEmitter } from 'events'
import { logger } from '../utils/logger'
import { PythonBridge } from './PythonBridge'
import type {
  OwlAnalysisResult,
  OwlElement,
  OwlLayout,
  OwlConfig,
  PythonServiceType
} from '@autobrowse/shared'

const DEFAULT_CONFIG: OwlConfig = {
  ocrEnabled: true,
  elementDetection: true,
  layoutAnalysis: true,
  confidenceThreshold: 0.7
}

export class OwlService extends EventEmitter {
  private bridge: PythonBridge
  private config: OwlConfig

  constructor(config?: Partial<OwlConfig>) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.bridge = new PythonBridge({
      maxProcesses: 2,
      timeout: 60000
    })

    this.bridge.on('process_spawned', (data) => {
      logger.debug('Owl service process spawned', data)
      this.emit('ready', data)
    })

    this.bridge.on('process_closed', (data) => {
      logger.info('Owl service process closed', data)
      this.emit('closed', data)
    })

    logger.info('OwlService initialized', { config: this.config })
  }

  async analyzeScreenshot(image: Buffer, options?: {
    ocrEngine?: 'tesseract' | 'easyocr' | 'paddleocr'
    languages?: string[]
    useMLDetection?: boolean
  }): Promise<OwlAnalysisResult> {
    const startTime = Date.now()

    logger.info('Analyzing screenshot with Owl', { options })

    try {
      const base64Image = image.toString('base64')
      const result = await this.bridge.call<OwlAnalysisResult>('owl', 'analyze_screenshot', {
        image: base64Image,
        ocrEnabled: this.config.ocrEnabled,
        elementDetection: this.config.elementDetection,
        layoutAnalysis: this.config.layoutAnalysis,
        confidenceThreshold: this.config.confidenceThreshold,
        ocrEngine: options?.ocrEngine || 'tesseract',
        languages: options?.languages || ['en', 'ch_sim'],
        useMLDetection: options?.useMLDetection !== undefined ? options.useMLDetection : true
      })

      this.emit('analysis_complete', { duration: Date.now() - startTime })

      return result
    } catch (error: any) {
      logger.error('Failed to analyze screenshot', { error })
      throw error
    }
  }

  async extractText(image: Buffer): Promise<string> {
    const startTime = Date.now()

    logger.info('Extracting text with Owl OCR')

    try {
      const base64Image = image.toString('base64')
      const result = await this.bridge.call<{ text: string }>('owl', 'extract_text', {
        image: base64Image,
        confidenceThreshold: this.config.confidenceThreshold
      })

      this.emit('text_extracted', { text: result.text, duration: Date.now() - startTime })

      return result.text
    } catch (error: any) {
      logger.error('Failed to extract text', { error })
      throw error
    }
  }

  async detectElements(image: Buffer): Promise<OwlElement[]> {
    const startTime = Date.now()

    logger.info('Detecting elements with Owl')

    try {
      const base64Image = image.toString('base64')
      const result = await this.bridge.call<{ elements: OwlElement[] }>('owl', 'detect_elements', {
        image: base64Image,
        confidenceThreshold: this.config.confidenceThreshold
      })

      this.emit('elements_detected', { count: result.elements.length, duration: Date.now() - startTime })

      return result.elements
    } catch (error: any) {
      logger.error('Failed to detect elements', { error })
      throw error
    }
  }

  async classifyRegions(image: Buffer): Promise<OwlLayout> {
    const startTime = Date.now()

    logger.info('Classifying page regions with Owl')

    try {
      const base64Image = image.toString('base64')
      const result = await this.bridge.call<OwlLayout>('owl', 'classify_regions', {
        image: base64Image,
        confidenceThreshold: this.config.confidenceThreshold
      })

      this.emit('regions_classified', { duration: Date.now() - startTime })

      return result
    } catch (error: any) {
      logger.error('Failed to classify regions', { error })
      throw error
    }
  }

  async findElementByDescription(
    image: Buffer,
    description: string,
    elementTypes?: Array<'button' | 'link' | 'input'>
  ): Promise<OwlElement | null> {
    const startTime = Date.now()

    logger.info('Finding element by description with Owl', { description, elementTypes })

    try {
      const base64Image = image.toString('base64')
      const result = await this.bridge.call<{ element: OwlElement | null }>('owl', 'find_element', {
        image: base64Image,
        description,
        elementTypes,
        confidenceThreshold: this.config.confidenceThreshold
      })

      this.emit('element_found', { element: result.element, duration: Date.now() - startTime })

      return result.element
    } catch (error: any) {
      logger.error('Failed to find element by description', { error })
      throw error
    }
  }

  async analyzeLayout(image: Buffer, elements?: any[]): Promise<any> {
    const startTime = Date.now()

    logger.info('Analyzing layout with Owl', { hasElements: !!elements })

    try {
      const base64Image = image.toString('base64')
      const result = await this.bridge.call<any>('owl', 'analyze_layout', {
        image: base64Image,
        elements
      })

      this.emit('layout_analyzed', { duration: Date.now() - startTime })

      return result
    } catch (error: any) {
      logger.error('Failed to analyze layout', { error })
      throw error
    }
  }

  async detectGrids(image: Buffer): Promise<any> {
    const startTime = Date.now()

    logger.info('Detecting grids with Owl')

    try {
      const base64Image = image.toString('base64')
      const result = await this.bridge.call<any>('owl', 'detect_grids', {
        image: base64Image
      })

      this.emit('grids_detected', { duration: Date.now() - startTime })

      return result
    } catch (error: any) {
      logger.error('Failed to detect grids', { error })
      throw error
    }
  }

  async detectTables(image: Buffer): Promise<any> {
    const startTime = Date.now()

    logger.info('Detecting tables with Owl')

    try {
      const base64Image = image.toString('base64')
      const result = await this.bridge.call<any>('owl', 'detect_tables', {
        image: base64Image
      })

      this.emit('tables_detected', { duration: Date.now() - startTime })

      return result
    } catch (error: any) {
      logger.error('Failed to detect tables', { error })
      throw error
    }
  }

  async getReadingOrder(image: Buffer, elements?: any[]): Promise<any> {
    const startTime = Date.now()

    logger.info('Getting reading order with Owl')

    try {
      const base64Image = image.toString('base64')
      const result = await this.bridge.call<any>('owl', 'get_reading_order', {
        image: base64Image,
        elements
      })

      this.emit('reading_order_detected', { duration: Date.now() - startTime })

      return result
    } catch (error: any) {
      logger.error('Failed to get reading order', { error })
      throw error
    }
  }

  async analyzeAndDetect(
    image: Buffer,
    query?: string
  ): Promise<{ analysis: OwlAnalysisResult; elements: OwlElement[] }> {
    const startTime = Date.now()

    logger.info('Analyzing and detecting elements', { query })

    try {
      const base64Image = image.toString('base64')

      const [analysis, elements] = await Promise.all([
        this.analyzeScreenshot(image),
        this.detectElements(image)
      ])

      this.emit('analysis_and_detection_complete', { duration: Date.now() - startTime })

      if (query) {
        const matchingElements = this.filterElementsByQuery(elements, query)
        return { analysis, elements: matchingElements }
      }

      return { analysis, elements }
    } catch (error: any) {
      logger.error('Failed to analyze and detect', { error })
      throw error
    }
  }

  private filterElementsByQuery(elements: OwlElement[], query: string): OwlElement[] {
    const queryLower = query.toLowerCase()

    return elements.filter(element => {
      if (element.text && element.text.toLowerCase().includes(queryLower)) {
        return true
      }

      if (element.type.toLowerCase().includes(queryLower)) {
        return true
      }

      return false
    })
  }

  getConfig(): OwlConfig {
    return { ...this.config }
  }

  updateConfig(config: Partial<OwlConfig>): void {
    this.config = { ...this.config, ...config }
    logger.debug('Owl config updated', { config: this.config })
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up OwlService')

    await this.bridge.stopAllProcesses()

    logger.info('OwlService cleanup complete')
  }

  isReady(): boolean {
    return this.bridge.getProcessInfo()?.status === 'running'
  }

  getStatus() {
    const bridgeStats = this.bridge.getStats()

    return {
      ready: this.isReady(),
      ...bridgeStats,
      config: this.config
    }
  }
}
