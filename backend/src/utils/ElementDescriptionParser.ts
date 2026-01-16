import { logger } from '../utils/logger'
import type { ActionType, DomTree, DomElement } from '@autobrowse/shared'

interface ParsedAction {
  actionType: ActionType
  selector?: string
  value?: string
  targetDescription?: string
  url?: string
  textContent?: string
  confidence: number
}

export class ElementDescriptionParser {
  static parseAction(description: string, domTree?: DomTree): ParsedAction | null {
    if (!description || description.trim().length === 0) {
      return null
    }

    const descLower = description.toLowerCase()

    let actionType: ActionType | null = null
    let url: string | undefined = undefined
    let value: string | undefined = undefined
    let targetDescription: string | undefined = undefined
    let selector: string | undefined = undefined
    let confidence = 0.7

    if (descLower.includes('go to') || descLower.includes('navigate to') || descLower.includes('open') || descLower.includes('visit')) {
      actionType = 'navigate'
      const urlMatch = description.match(/https?:\/\/[^\s]+/)
      if (urlMatch) {
        url = urlMatch[0]
      }
      confidence = 0.9
    } else if (descLower.includes('click')) {
      actionType = 'click'
      const quotedText = description.match(/["']([^"']+)["']/)
      if (quotedText) {
        targetDescription = quotedText[1]
      }
      confidence = 0.8

      if (domTree && targetDescription) {
        const selector = this.findSelectorByDescription(targetDescription, domTree)
        if (selector) {
          return {
            actionType,
            selector,
            targetDescription,
            confidence: 0.95
          }
        }
      }
    } else if (descLower.includes('type') || descLower.includes('enter') || descLower.includes('input') || descLower.includes('fill') || descLower.includes('write')) {
      actionType = 'type'
      const valueMatch = description.match(/(?:type|enter|input|fill|write)\s+(?:["']?)([^"']+)(?:["']?)?\s+(?:into|in)?/i)
      if (valueMatch) {
        value = valueMatch[1]
        const targetMatch = description.match(/(?:into|in)\s+(?:the\s+)?(.+)/i)
        if (targetMatch) {
          targetDescription = targetMatch[1]
        }
      }
      confidence = 0.8

      if (domTree && targetDescription) {
        const selector = this.findSelectorByDescription(targetDescription, domTree)
        if (selector) {
          return {
            actionType,
            selector,
            targetDescription,
            value,
            confidence: 0.95
          }
        }
      }
    } else if (descLower.includes('scroll')) {
      actionType = 'scroll'
      if (descLower.includes('up')) {
        value = 'up'
      } else if (descLower.includes('right')) {
        value = 'right'
      } else if (descLower.includes('left')) {
        value = 'left'
      } else {
        value = 'down'
      }
      targetDescription = `scroll ${value}`
      confidence = 0.9
    } else if (descLower.includes('extract') || descLower.includes('get') || descLower.includes('copy') || descLower.includes('read')) {
      actionType = 'extract'
      targetDescription = 'body'
      confidence = 0.75

      if (domTree) {
        const selector = this.findSelectorByDescription(targetDescription, domTree)
        if (selector) {
          return {
            actionType,
            selector,
            targetDescription,
            confidence: 0.95
          }
        }
      }
    } else if (descLower.includes('wait') || descLower.includes('sleep') || descLower.includes('pause')) {
      actionType = 'wait'
      const timeMatch = description.match(/(\d+)\s*(?:seconds?|ms|milliseconds?|sec)/i)
      if (timeMatch) {
        const timeValue = parseInt(timeMatch[1])
        const isMs = descLower.includes('ms') || descLower.includes('milliseconds')
        value = (isMs ? timeValue : timeValue * 1000).toString()
      }
      targetDescription = 'wait'
      confidence = 0.95
    } else if (descLower.includes('screenshot') || descLower.includes('capture')) {
      actionType = 'screenshot'
      targetDescription = 'screenshot'
      confidence = 0.95
    } else if (descLower.includes('select')) {
      actionType = 'select'
      const quotedText = description.match(/["']([^"']+)["']/)
      if (quotedText) {
        targetDescription = quotedText[1]
      }
      confidence = 0.8

      if (domTree && targetDescription) {
        const selector = this.findSelectorByDescription(targetDescription, domTree)
        if (selector) {
          return {
            actionType,
            selector,
            targetDescription,
            confidence: 0.95
          }
        }
      }
    } else if (descLower.includes('hover')) {
      actionType = 'hover'
      const quotedText = description.match(/["']([^"']+)["']/)
      if (quotedText) {
        targetDescription = quotedText[1]
      }
      confidence = 0.8

      if (domTree && targetDescription) {
        const selector = this.findSelectorByDescription(targetDescription, domTree)
        if (selector) {
          return {
            actionType,
            selector,
            targetDescription,
            confidence: 0.95
          }
        }
      }
    } else if (descLower.includes('drag')) {
      actionType = 'drag'
      const parts = description.split(/(?:to|and\s+drop)/i)
      if (parts.length >= 2) {
        targetDescription = parts[0].trim()
        value = parts[1].trim()
      }
      confidence = 0.7
    } else if (descLower.includes('upload')) {
      actionType = 'upload'
      const valueMatch = description.match(/(?:upload)\s+(?:["']?)([^"']+)(?:["']?)?\s*(?:to|into)?\s*(?:the\s+)?(.+)/i)
      if (valueMatch) {
        value = valueMatch[1]
        targetDescription = valueMatch[2] || 'input[type="file"]'
      }
      confidence = 0.75

      if (domTree && targetDescription) {
        const selector = this.findSelectorByDescription(targetDescription, domTree)
        if (selector) {
          return {
            actionType,
            selector,
            targetDescription,
            value,
            confidence: 0.95
          }
        }
      }
    } else if (descLower.includes('download')) {
      actionType = 'download'
      const urlMatch = description.match(/download\s+(?:file|document|image)?\s*(?:from\s+)?(?:["']?)([^"'\s]+)/i)
      if (urlMatch) {
        targetDescription = urlMatch[1]
        url = urlMatch[1]
      }
      confidence = 0.75
    } else if (descLower.includes('highlight')) {
      actionType = 'highlight'
      const quotedText = description.match(/["']([^"']+)["']/)
      if (quotedText) {
        targetDescription = quotedText[1]
      }
      confidence = 0.8

      if (domTree && targetDescription) {
        const selector = this.findSelectorByDescription(targetDescription, domTree)
        if (selector) {
          return {
            actionType,
            selector,
            targetDescription,
            confidence: 0.95
          }
        }
      }
    }

    if (!actionType) {
      logger.debug('Could not infer action type from description', { description })
      return null
    }

    const result: ParsedAction = {
      actionType: actionType!,
      selector: selector,
      value: value,
      targetDescription: targetDescription,
      url: url,
      confidence: confidence
    }

    logger.debug('Parsed action from description', {
      description,
      actionType,
      confidence
    })

    return result
  }

  private static findSelectorByDescription(
    description: string | undefined,
    domTree: DomTree
  ): string | null {
    if (!description || !domTree || domTree.elements.length === 0) {
      return null
    }

    const descLower = description.toLowerCase()
    const allElements = this.flattenDomTree(domTree.elements)

    const matches = allElements.filter(el => {
      if (el.text && el.text.toLowerCase().includes(descLower)) {
        return true
      }

      if (el.attributes.id && el.attributes.id.toLowerCase().includes(descLower)) {
        return true
      }

      if (el.attributes.class && el.attributes.class.toLowerCase().includes(descLower)) {
        return true
      }

      if (el.attributes['aria-label'] && 
          el.attributes['aria-label'].toLowerCase().includes(descLower)) {
        return true
      }

      return false
    })

    if (matches.length === 0) {
      return null
    }

    const bestMatch = matches[0]

    if (bestMatch.attributes.id) {
      return `#${bestMatch.attributes.id}`
    }

    if (bestMatch.attributes['data-testid']) {
      return `[data-testid="${bestMatch.attributes['data-testid']}"]`
    }

    if (bestMatch.attributes.name) {
      return `[name="${bestMatch.attributes.name}"]`
    }

    if (bestMatch.attributes.class) {
      return `.${bestMatch.attributes.class.split(' ')[0]}`
    }

    return `${bestMatch.tag}`
  }

  private static flattenDomTree(elements: DomElement[]): DomElement[] {
    const flattened: DomElement[] = []

    function traverse(elements: DomElement[]) {
      for (const element of elements) {
        flattened.push(element)

        if (element.children && element.children.length > 0) {
          traverse(element.children)
        }
      }
    }

    traverse(elements)
    return flattened
  }

  static inferActionType(description: string): ActionType | null {
    if (!description || description.trim().length === 0) {
      return null
    }

    const descLower = description.toLowerCase()

    const actionMap: Partial<Record<string, ActionType>> = {
      'go to': 'navigate',
      'navigate to': 'navigate',
      'open': 'navigate',
      'visit': 'navigate',
      'click': 'click',
      'type': 'type',
      'enter': 'type',
      'input': 'type',
      'fill': 'type',
      'write': 'type',
      'scroll': 'scroll',
      'extract': 'extract',
      'get': 'extract',
      'copy': 'extract',
      'read': 'extract',
      'wait': 'wait',
      'sleep': 'wait',
      'pause': 'wait',
      'screenshot': 'screenshot',
      'capture': 'screenshot',
      'select': 'select',
      'hover': 'hover',
      'drag': 'drag',
      'upload': 'upload',
      'download': 'download',
      'highlight': 'highlight'
    }

    for (const [keyword, actionType] of Object.entries(actionMap)) {
      if (descLower.includes(keyword) && actionType) {
        logger.debug('Inferred action type', { description, actionType })
        return actionType
      }
    }

    logger.debug('Could not infer action type from description', { description })
    return null
  }

  static extractSelectors(description: string): string[] {
    const selectors: string[] = []

    const idPattern = /#([a-zA-Z][\w-]*)/g
    const classPattern = /\.([a-zA-Z][\w-]*)/g
    const attrPattern = /\[([a-zA-Z-]+)=["']([^"']+)["']\]/g

    let match: RegExpExecArray | null

    while ((match = idPattern.exec(description)) !== null) {
      selectors.push(`#${match[1]}`)
    }

    while ((match = classPattern.exec(description)) !== null) {
      selectors.push(`.${match[1]}`)
    }

    while ((match = attrPattern.exec(description)) !== null) {
      selectors.push(`[${match[1]}="${match[2]}"]`)
    }

    logger.debug('Extracted selectors from description', {
      description,
      selectors,
      count: selectors.length
    })

    return selectors
  }

  static extractUrls(description: string): string[] {
    const urlPattern = /https?:\/\/[^\s]+/g
    const urls: string[] = []
    let match: RegExpExecArray | null

    while ((match = urlPattern.exec(description)) !== null) {
      urls.push(match[0])
    }

    logger.debug('Extracted URLs from description', {
      description,
      urls,
      count: urls.length
    })

    return urls
  }

  static validateParsedAction(parsedAction: ParsedAction): boolean {
    if (!parsedAction) {
      return false
    }

    if (!parsedAction.actionType) {
      logger.warn('Parsed action missing action type', { parsedAction })
      return false
    }

    const actionType = parsedAction.actionType

    if (actionType === 'navigate' && !parsedAction.url) {
      logger.warn('Navigate action missing URL', { parsedAction })
      return false
    }

    if (actionType === 'type' && !parsedAction.value) {
      logger.warn('Type action missing value', { parsedAction })
      return false
    }

    if (actionType === 'upload' && !parsedAction.value) {
      logger.warn('Upload action missing file path', { parsedAction })
      return false
    }

    if (parsedAction.confidence < 0.5) {
      logger.warn('Low confidence action', { parsedAction })
      return false
    }

    return true
  }

  static enhanceActionWithContext(
    parsedAction: ParsedAction,
    domTree: DomTree
  ): ParsedAction {
    if (!domTree || !parsedAction) {
      return parsedAction
    }

    const enhanced = { ...parsedAction }

    if (enhanced.targetDescription) {
      const selector = this.findSelectorByDescription(
        enhanced.targetDescription,
        domTree
      )

      if (selector) {
        enhanced.selector = selector
        enhanced.confidence = Math.min(enhanced.confidence + 0.1, 1.0)
      }
    }

    logger.debug('Enhanced action with DOM context', {
      original: parsedAction,
      enhanced,
      confidenceImproved: enhanced.confidence > parsedAction.confidence
    })

    return enhanced
  }
}
