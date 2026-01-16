import { EventEmitter } from 'events'
import { logger } from '../utils/logger'
import type { ActionResult, ActionType } from '@autobrowse/shared'

interface InteractiveCommand {
  id: string
  type: 'click' | 'type' | 'scroll' | 'extract' | 'navigate' | 'screenshot' | 'hover' | 'wait' | 'reload'
  sessionId: string
  timestamp: Date
}

interface ElementData {
  id: string
  tag: string
  selector: string
  text: string
  attributes: Record<string, string>
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface SelectionState {
  selectedElement: string | null
  selectionRange: {
    start: { x: number; y: number }
    end: { x: number; y: number }
  } | null
  hoveredElement: string | null
}

export class InteractiveBrowserService extends EventEmitter {
  private sessionCommandQueue: Map<string, InteractiveCommand[]>
  private elementCache: Map<string, ElementData>
  private selectionStates: Map<string, SelectionState>

  constructor() {
    super()
    this.sessionCommandQueue = new Map()
    this.elementCache = new Map()
    this.selectionStates = new Map()

    logger.info('InteractiveBrowserService initialized')
  }

  async executeCommand(command: InteractiveCommand, sessionId: string): Promise<ActionResult> {
    try {
      logger.info('Executing interactive command', { command, sessionId })

      const startTime = Date.now()

      if (command.type === 'navigate') {
        return await this.executeNavigate(command, sessionId)
      } else if (command.type === 'click') {
        return await this.executeClick(command, sessionId)
      } else if (command.type === 'type') {
        return await this.executeType(command, sessionId)
      } else if (command.type === 'scroll') {
        return await this.executeScroll(command, sessionId)
      } else if (command.type === 'extract') {
        return await this.executeExtract(command, sessionId)
      } else if (command.type === 'screenshot') {
        return await this.executeScreenshot(command, sessionId)
      } else if (command.type === 'hover') {
        return await this.executeHover(command, sessionId)
      } else if (command.type === 'wait') {
        return await this.executeWait(command, sessionId)
      } else if (command.type === 'reload') {
        return await this.executeReload(command, sessionId)
      } else {
        throw new Error(`Unknown command type: ${command.type}`)
      }
    } catch (error: any) {
      logger.error('Interactive command failed', { command, error })
      
      this.emit('command_failed', { sessionId, command, error })
      
      return {
        success: false,
        action: command.type,
        description: command.description || '',
        error: error.message || 'Command failed',
        duration: Date.now() - startTime
      }
    }
  }

  async getVisibleElements(sessionId: string): Promise<ElementData[]> {
    try {
      logger.debug('Getting visible elements for session', { sessionId })

      return Array.from(this.elementCache.values())
    } catch (error: any) {
      logger.error('Failed to get visible elements', { sessionId, error })
      return []
    }
  }

  setElementData(sessionId: string, elements: ElementData[]): void {
    logger.debug('Setting element data', { sessionId, count: elements.length })

    elements.forEach((element) => {
      this.elementCache.set(element.id, element)
    })

    logger.info('Element data updated', { sessionId, count: elements.length })
  }

  updateSelection(sessionId: string, selection: SelectionState): void {
    this.selectionStates.set(sessionId, selection)
    logger.debug('Selection updated', { sessionId, selection })
    this.emit('selection_changed', { sessionId, selection })
  }

  getSelection(sessionId: string): SelectionState | null {
    return this.selectionStates.get(sessionId) || null
  }

  hoverElement(sessionId: string, elementId: string): void {
    this.selectionStates.set(sessionId, {
      selectedElement: elementId,
      hoveredElement: elementId,
      selectionRange: null
    })

    this.emit('element_hovered', { sessionId, elementId })
  }

  clickElement(sessionId: string, elementId: string): void {
    this.selectionStates.set(sessionId, {
      selectedElement: elementId,
      hoveredElement: null,
      selectionRange: null
    })

    this.emit('element_clicked', { sessionId, elementId })
  }

  selectAll(sessionId: string, elementId: string): void {
    const selectionRange: {
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 }
    }

    this.selectionStates.set(sessionId, {
      selectedElement: elementId,
      hoveredElement: null,
      selectionRange
    })

    this.emit('element_selected', { sessionId, elementId })
  }

  clearSelection(sessionId: string): void {
    this.selectionStates.delete(sessionId)
    this.emit('selection_cleared', { sessionId })
  }

  private async executeNavigate(command: InteractiveCommand, sessionId: string): Promise<ActionResult> {
    const startTime = Date.now()

    logger.info('Executing navigate', { url: command.value || '' })

    this.emit('command_starting', { sessionId, command })

    try {
      this.emit('browser_action', {
        sessionId,
        action: 'navigate',
        target: command.value || '',
        description: `Navigate to ${command.value || 'URL'}`
      })

      this.emit('command_complete', {
        sessionId,
        command
      })

      return {
        success: true,
        action: 'navigate',
        target: command.value || '',
        description: command.description || `Navigated to ${command.value || 'URL'}`,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      logger.error('Navigate command failed', { error })
      this.emit('command_failed', { sessionId, command, error })

      return {
        success: false,
        action: 'navigate',
        target: command.value || '',
        description: 'Navigation failed',
        error: error.message || 'Navigate failed',
        duration: Date.now() - startTime
      }
    }
  }

  private async executeClick(command: InteractiveCommand, sessionId: string): Promise<ActionResult> {
    const startTime = Date.now()

    logger.info('Executing click', { selector: command.selector || '' })

    this.emit('command_starting', { sessionId, command })

    try {
      const selector = command.selector || 'body'

      this.emit('browser_action', {
        sessionId,
        action: 'click',
        target: selector,
        description: `Click on ${selector}`
      })

      this.emit('command_complete', {
        sessionId,
        command
      })

      return {
        success: true,
        action: 'click',
        target: selector,
        description: command.description || 'Click executed',
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      logger.error('Click command failed', { error })
      this.emit('command_failed', { sessionId, command, error })

      return {
        success: false,
        action: error: 'click',
        target: command.selector || '',
        description: 'Click failed',
        error: error.message || 'Click failed',
        duration: Date.now() - startTime
      }
    }
  }

  private async executeType(command: InteractiveCommand, sessionId: string): Promise<ActionResult> {
    const startTime = Date.now()

    logger.info('Executing type', { selector: command.selector || '', value: command.value || '' })

    this.emit('command_starting', { sessionId, command })

    try {
      const selector = command.selector || 'input[type="text"]'

      this.emit('browser_action', {
        sessionId,
        action: 'type',
        target: selector,
        value: command.value || '',
        description: `Type "${command.value || ''}" into ${selector}`
      })

      this.emit('command_complete', {
        sessionId,
        command
      })

      return {
        success: true,
        action: 'type',
        target: selector,
        value: command.value || '',
        description: `Typed "${command.value || ''}" into ${selector}`,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      logger.error('Type command failed', { error })
      this.emit('command_failed', { sessionId, command, error })

      return {
        success: false,
        action: 'type',
        target: command.selector || '',
        description: 'Type failed',
        error: error.message || 'Type failed',
        duration: Date.now() - startTime
      }
    }
  }

  private async executeScroll(command: InteractiveCommand, sessionId: string): Promise<ActionResult> {
    const startTime = Date.now()

    const direction = command.description?.toLowerCase().includes('up') ? 'up' : 'down'
    const amount = parseInt(command.value || '500', 10)

    logger.info('Executing scroll', { direction, amount })

    this.emit('command_starting', { sessionId, command })

    try {
      this.emit('browser_action', {
        sessionId,
        action: 'scroll',
        target: 'page',
        value: direction,
        description: `Scroll ${direction} ${amount}px`
      })

      this.emit('command_complete', {
        sessionId,
        command
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      this.emit('browser_action', {
        sessionId,
        action: 'scroll_complete',
        target: 'page',
        value: direction,
        description: `Scrolled ${direction} ${amount}px`
      })

      return {
        success: true,
        action: 'scroll',
        target: 'page',
        value: direction,
        description: `Scrolled ${direction} ${amount}px`,
        duration: 500
      }
    } catch (error: any) {
      logger.error('Scroll command failed', { error })
      this.emit('command_failed', { sessionId, command, error })

      return {
        success: false,
        action: 'scroll',
        target: 'page',
        value: direction,
        description: 'Scroll failed',
        error: error.message || 'Scroll failed',
        duration: Date.now() - startTime
      }
    }
  }

  private async executeExtract(command: InteractiveCommand, sessionId: string): Promise<ActionResult> {
    const startTime = Date.now()

    const selector = command.selector || 'body'

    logger.info('Executing extract', { selector })

    this.emit('command_starting', { sessionId, command })

    try {
      this.emit('browser_action', {
        sessionId,
        action: 'extract',
        target: selector,
        description: `Extract from ${selector}`
      })

      this.emit('command_complete', {
        sessionId,
        command
      })

      return {
        success: true,
        action: 'extract',
        target: selector,
        description: `Extracted from ${selector}`,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      logger.error('Extract command failed', { error })
      this.emit('command_failed', { sessionId, command, error })

      return {
        success: false,
        action: 'extract',
        target: selector,
        description: 'Extract failed',
        error: error.message || 'Extract failed',
        duration: Date.now() - startTime
      }
    }
  }

  private async executeScreenshot(command: InteractiveCommand, sessionId: string): Promise<ActionResult> {
    const startTime = Date.now()

    logger.info('Executing screenshot')

    this.emit('command_starting', { sessionId, command })

    try {
      this.emit('browser_action', {
        sessionId,
        action: 'screenshot',
        target: 'page',
        description: 'Taking screenshot'
      })

      this.emit('command_complete', {
        sessionId,
        command
      })

      return {
        success: true,
        action: 'screenshot',
        target: 'page',
        description: 'Screenshot taken',
        screenshot: await this.takeScreenshot(sessionId),
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      logger.error('Screenshot command failed', { error })
      this.emit('command_failed', { sessionId, command, error })

      return {
        success: false,
        action: 'screenshot',
        target: 'page',
        description: 'Screenshot failed',
        error: error.message || 'Screenshot failed',
        duration: Date.now() - startTime
      }
    }
  }

  private async executeHover(command: InteractiveCommand, sessionId: string): Promise<ActionResult> {
    logger.debug('Executing hover', { elementId: command.selector })

    this.emit('element_hovered', { sessionId, elementId: command.selector })

    return {
      success: true,
      action: 'hover',
      target: command.selector || '',
      description: 'Hovered on element',
      duration: 50
    }
  }

  private async executeWait(command: InteractiveCommand, sessionId: string): Promise<ActionResult> {
    const duration = parseInt(command.value || '1000', 10)

    logger.info('Executing wait', { duration })

    this.emit('command_starting', { sessionId, command })

    this.emit('command_complete', { sessionId, command })

    await new Promise(resolve => setTimeout(resolve, duration))

    this.emit('browser_action', {
      sessionId,
      action: 'wait',
      target: 'page',
      description: `Waited ${duration}ms`
    })

    return {
      success: true,
      action: 'wait',
      target: 'page',
      description: `Waited ${duration}ms`,
      duration
    }
  }

  private async executeReload(command: InteractiveCommand, sessionId: string): Promise<ActionResult> {
    const startTime = Date.now()

    logger.info('Executing reload')

    this.emit('command_starting', { sessionId, command })

    try {
      this.emit('browser_action', {
        sessionId,
        action: 'reload',
        target: 'page',
        description: 'Reloading page'
      })

      this.emit('command_complete', {
        sessionId,
        command
      })

      return {
        success: true,
        action: 'reload',
        target: 'page',
        description: 'Page reloaded',
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      logger.error('Reload command failed', { error })
      this.emit('command_failed', { sessionId, command, error })

      return {
        success: false,
        action: 'reload',
        target: 'page',
        description: 'Reload failed',
        error: error.message || 'Failed to reload',
        duration: Date.now() - startTime
      }
    }
  }

  private async takeScreenshot(sessionId: string): Promise<string> {
    logger.debug('Taking screenshot for interactive preview', { sessionId })

    return `screenshot_${sessionId}_${Date.now()}`
  }

  clearSession(sessionId: string): void {
    this.sessionCommandQueue.delete(sessionId)
    this.elementCache.clear(sessionId)
    this.selectionStates.delete(sessionId)

    logger.info('Session cleared', { sessionId })
    this.emit('session_cleared', { sessionId })
  }
}
