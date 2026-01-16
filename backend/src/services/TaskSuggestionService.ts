import { logger } from '../utils/logger'

interface TaskPattern {
  id: string
  description: string
  frequency: number
  avgSuccessRate: number
  avgDuration: number
  steps: {
    action_type: string
    selector?: string
    value?: string
    description: string
  }
}

interface UserPreference {
  userId: string
  commonTasks: string[]
  preferences: {
    frequentTasks: string[]
    favoriteTasks: string[]
    complexityPreference: 'simple' | 'medium' | 'complex'
  }
}

interface TaskSuggestion {
  id: string
  title: string
  description: string
  task_config: any
  confidence: number
  type: 'frequent' | 'popular' | 'personalized' | 'trending'
  estimatedTime: string
  estimatedSteps: number
}

interface TaskStep {
  action_type: string
  selector?: string
  value?: string
  description: string
}

interface UserPreference {
  userId: string
  commonTasks: string[]
  frequentTasks: string[]
  complexityPreference: 'simple' | 'medium' | 'complex'
}

interface TaskSuggestion {
  id: string
  title: string
  description: string
  task_config: any
  confidence: number
  estimatedTime: string
  type: 'frequent' | 'popular' | 'personalized' | 'trending'
}

export class TaskSuggestionService {
  private taskCache: Map<string, TaskPattern>
  private userPreferences: Map<string, UserPreference>

  constructor() {
    this.taskCache = new Map()
    this.userPreferences = new Map()
    logger.info('TaskSuggestionService initialized')
  }

  async analyzeUserPatterns(userId: string): Promise<any> {
    try {
      logger.info('Analyzing user patterns', { userId })

      const sessions = await this.getUserSessions(userId)
      const userSkills = await this.getUserSkills(userId)

      const successfulSessions = sessions.filter((s) => s.status === 'completed')

      const patterns = this.extractPatterns(successfulSessions, userSkills)
      const preferences = this.inferUserPreferences(sessions, userSkills, patterns)

      this.taskCache.clear()

      patterns.forEach((pattern) => {
        this.taskCache.set(pattern.id, pattern)
      })

      this.userPreferences.set(userId, preferences)

      logger.info('Pattern analysis complete', {
        userId,
        patternsFound: patterns.length
      })

      return {
        totalSessions: sessions.length,
        successfulSessions: successfulSessions.length,
        patterns: patterns,
        userPreferences: preferences
      }
    } catch (error: any) {
      logger.error('Failed to analyze user patterns', { error, userId })
      throw error
    }
  }

  async getSuggestions(userId: string, limit: number = 5): Promise<TaskSuggestion[]> {
    try {
      logger.info('Generating task suggestions', { userId, limit })

      const userPref = this.userPreferences.get(userId)
      if (!userPref) {
        return []
      }

      const suggestions: TaskSuggestion[] = []

      for (const pattern of userPref.commonTasks) {
        const suggestion = {
          id: this.generateId(),
          title: this.generateSuggestionTitle(pattern),
          description: pattern.description,
          task_config: {
            model: 'autobrowse-llm',
            maxSteps: pattern.steps.length,
            outputType: 'batch'
          },
          confidence: this.calculateConfidence(pattern, userPref),
          type: 'frequent',
          estimatedTime: this.estimateTaskTime(pattern),
          estimatedSteps: pattern.steps.length
        }

        suggestions.push(suggestion)

        if (suggestions.length >= limit) break
      }

      suggestions.sort((a, b) => b.confidence - a.confidence)

      logger.info('Suggestions generated', { count: suggestions.length, userId })

      return suggestions
    } catch (error: any) {
      logger.error('Failed to generate suggestions', { error, userId })
      throw error
    }
  }

  async recordTaskUsage(userId: string, taskId: string, success: boolean, durationMs: number): Promise<void> {
    try {
      logger.info('Recording task usage', { taskId, success, durationMs })

      const pattern = this.taskCache.get(taskId)
      if (!pattern) {
        logger.warn('Pattern not found', { taskId })
        return
      }

      pattern.frequency = (pattern.frequency || 0) + 1

      if (success) {
        const totalActions = (pattern.avgSuccessRate || 0) * (pattern.frequency || 0) + success
        pattern.avgSuccessRate = totalActions / ((pattern.frequency || 0) + 1)
      }

      pattern.avgDuration = ((pattern.avgDuration || 0) * (pattern.frequency || 0) + durationMs) / ((pattern.frequency || 0) + 1)

      this.taskCache.set(taskId, pattern)

      await this.persistPattern(pattern)

      logger.info('Task usage recorded', { taskId, newFrequency: pattern.frequency })
    } catch (error: any) {
      logger.error('Failed to record task usage', { error, taskId })
    }
  }

  private async getUserSessions(userId: string): Promise<any[]> {
    logger.debug('Fetching user sessions', { userId })
    return []
  }

  private async getUserSkills(userId: string): Promise<any[]> {
    logger.debug('Fetching user skills', { userId })
    return []
  }

  private extractPatterns(sessions: any[], userSkills: any[]): TaskPattern[] {
    const patterns: TaskPattern[] = []

    const taskCategories = this.categorizeSessions(sessions)

    Object.entries(taskCategories).forEach(([category, categorySessions]) => {
      if (categorySessions.length < 2) return

      const commonTasks = this.findCommonTasks(categorySessions, userSkills)
      const pattern = {
        id: `pattern_${category}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        description: this.generateCategoryDescription(category, commonTasks),
        category,
        frequency: categorySessions.length,
        avgSuccessRate: this.calculateSuccessRate(categorySessions),
        avgDuration: this.calculateAvgDuration(categorySessions),
        steps: this.buildStepPatterns(commonTasks),
        confidence: 0.8
      }

      patterns.push(pattern)
    })

    return patterns
  }

  private categorizeSessions(sessions: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {
      'web_search': [],
      'shopping': [],
      'form_filling': [],
      'monitoring': [],
      'social': [],
      'custom': []
    }

    sessions.forEach((session) => {
      const category = session.task_type || 'custom'
      if (categories[category]) {
        categories[category].push(session)
      }
    })

    return categories
  }

  private findCommonTasks(sessions: any[], userSkills: any[]): string[] {
    const tasks: sessions.map((s) => s.task_description.toLowerCase())
    const taskCounts = new Map<string, number>()

    tasks.forEach((task) => {
      taskCounts.set(task, (taskCounts.get(task) || 0) + 1)
    })

    return Array.from(taskCounts.entries())
      .sort(([, b]) => b[1] - a[1])
      .filter(([desc, count]) => count >= 3)
      .slice(0, 5)
      .map(([desc]) => desc)
  }

  private buildStepPatterns(commonTasks: string[]): TaskStep[] {
    const actionTypes = {
      navigate: 'navigate',
      click: 'click',
      type: 'type',
      scroll: 'scroll',
      extract: 'extract',
      screenshot: 'screenshot',
      wait: 'wait'
    }

    const steps: TaskStep[] = []

    if (commonTasks[0].includes('navigate') && commonTasks[0].includes('google')) {
      steps.push({
        action_type: 'navigate',
        selector: 'body',
        value: 'https://google.com',
        description: commonTasks[0]
      })
    }

    if (commonTasks.some((t) => t.includes('search') || t.includes('look for'))) {
      steps.push({
        action_type: 'type',
        selector: 'input[name="q"]',
        value: commonTasks.find((t) => t.includes('google')) || 'query',
        description: `Search for ${commonTasks.find((t) => t.includes('google')) ? 'information' : 'result'}`
      })
    }

    if (commonTasks.some((t) => t.includes('click') || t.includes('submit'))) {
      const selectorMatch = commonTasks.find((t) => t.includes('button') || t.includes('submit'))
      steps.push({
        action_type: 'click',
        selector: selectorMatch || 'button[type="submit"]',
        description: selectorMatch || 'Click submit button'
      })
    }

    if (commonTasks.some((t) => t.includes('fill') || t.includes('enter'))) {
      const inputMatch = commonTasks.find((t) => t.includes('input') || t.includes('field'))
      const valueMatch = commonTasks.find((t) => t.includes('@') || t.includes('email') || t.includes('password'))
      steps.push({
        action_type: 'type',
        selector: inputMatch || 'input[type="email"], input[type="password"]',
        value: valueMatch || 'test@example.com',
        description: `Fill in ${inputMatch || 'field'}`
      })
    }

    return steps
  }

  private calculateSuccessRate(sessions: any[]): number {
    const successfulSessions = sessions.filter((s) => s.status === 'completed')
    if (successfulSessions.length === 0) return 0

    const successCount = successfulSessions.reduce((acc, s) => acc + (s.actions_count || 0), 0)

    const totalCount = sessions.reduce((acc, s) => acc + (s.actions_count || 0), 0)

    return successCount / totalCount
  }

  private calculateAvgDuration(sessions: any[]): number {
    const durations = sessions
      .filter((s) => s.duration_seconds && s.duration_seconds > 0)
      .map((s) => s.duration_seconds)

    if (durations.length === 0) return 0

    const total = durations.reduce((acc, d) => acc + d, 0)

    return total / durations.length
  }

  private inferUserPreferences(sessions: any[], userSkills: any[], patterns: TaskPattern[]): UserPreference {
    const commonTasks = this.findCommonTasks(sessions, userSkills)

    const favoriteTasks = this.findFavoriteTasks(sessions)
    const complexityPreference = this.determineComplexityPreference(sessions)

    return {
      userId: sessions[0]?.user_id || '',
      commonTasks,
      favoriteTasks,
      complexityPreference
    }
  }

  private findFavoriteTasks(sessions: any[]): string[] {
    const taskCounts = new Map<string, number>()

    sessions.forEach((session) => {
      const desc = session.task_description
      taskCounts.set(desc, (taskCounts.get(desc) || 0) + 1)
    })

    return Array.from(taskCounts.entries())
      .sort(([, b]) => b[1] - a[1])
      .filter(([desc, count]) => count >= 3)
      .map(([desc]) => desc)
      .slice(0, 3)
  }

  private determineComplexityPreference(sessions: any[]): 'simple' | 'medium' | 'complex' {
    const avgDuration = this.calculateAvgDuration(sessions)

    if (avgDuration < 180) {
      return 'simple'
    } else if (avgDuration < 600) {
      return 'medium'
    } else {
      return 'complex'
    }
  }

  private calculateConfidence(pattern: TaskPattern, userPref: UserPreference): number {
    let confidence = 0.8

    if (userPref.commonTasks.includes(pattern.description)) {
      confidence += 0.1
    }

    if (userPref.favoriteTasks.includes(pattern.description)) {
      confidence += 0.1
    }

    if (pattern.frequency >= 5) {
      confidence += 0.05
    }

    if (pattern.avgSuccessRate > 0.8) {
      confidence += 0.1
    }

    return Math.min(confidence, 0.95)
  }

  private categorizeSuggestion(pattern: TaskPattern, userPref: UserPreference): TaskSuggestion['type'] {
    if (userPref.commonTasks.includes(pattern.description)) {
      return 'frequent'
    }

    if (pattern.frequency >= 3 && userPref.complexityPreference !== 'simple') {
      return 'popular'
    }

    if (userPref.favoriteTasks.includes(pattern.description)) {
      return 'personalized'
    }

    if (pattern.avgDuration > 300) && pattern.frequency >= 2) {
      return 'trending'
    }

    return 'frequent'
  }

  private generateCategoryDescription(category: string, commonTasks: string[]): string {
    const categoryNames = {
      web_search: 'Web Research',
      shopping: 'Shopping',
      form_filling: 'Form Filling',
      monitoring: 'Monitoring',
      social: 'Social Media',
      custom: 'Custom Tasks'
    }

    return `${categoryNames[category]}: ${commonTasks.slice(0, 3).join(', ')}${commonTasks.length > 3 ? '...' : ''}`
  }

  private generateSuggestionTitle(pattern: TaskPattern): string {
    const actionVerbs = {
      navigate: 'Navigate',
      click: 'Click',
      type: 'Type',
      scroll: 'Scroll',
      extract: 'Extract',
      screenshot: 'Screenshot',
      wait: 'Wait'
    }

    const primaryAction = pattern.steps[0]?.action_type || 'navigate'

    return `${actionVerbs[primaryAction] || 'Perform'} ${pattern.description}`
  }

  private buildTaskConfig(pattern: TaskPattern): any {
    return {
      model: 'autobrowse-llm',
      maxSteps: pattern.steps.length,
      outputType: 'batch'
    }
  }

  private estimateTaskTime(pattern: TaskPattern): string {
    const avgSeconds = pattern.avgDuration || 120

    const minutes = Math.ceil(avgSeconds / 60)

    if (minutes < 1) return 'Less than 1 minute'
    if (minutes < 5) return 'Less than 5 minutes'
    if (minutes < 15) return '15-30 minutes'
    if (minutes < 30) return '30-60 minutes'
    return '60+ minutes'
  }

  private generateId(): string {
    return `sugg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  }

  private async persistPattern(pattern: TaskPattern): Promise<void> {
    logger.debug('Persisting pattern', { patternId: pattern.id })
  }
}
