/**
 * GAIA Benchmark Suite for AutoBrowse
 *
 * GAIA (General AI Assistants) is a benchmark for evaluating AI assistants
 * on real-world tasks. This suite implements web automation benchmarks.
 *
 * Reference: https://huggingface.co/datasets/gaia-benchmark/GAIA
 */

import { EventEmitter } from 'events'
import { logger } from '../utils/logger'
import { automationService } from '../services/IntegratedAutomationService'
import { v4 as uuidv4 } from 'uuid'

/**
 * Benchmark task definition
 */
interface BenchmarkTask {
  id: string
  name: string
  description: string
  taskPrompt: string
  expectedOutcome: string | string[]
  category: 'navigation' | 'extraction' | 'form_filling' | 'multi_step' | 'reasoning'
  difficulty: 'easy' | 'medium' | 'hard'
  timeoutMs: number
  validateResult: (result: string | null) => boolean
}

/**
 * Benchmark result
 */
interface BenchmarkResult {
  taskId: string
  taskName: string
  success: boolean
  duration: number
  latencyP50?: number
  latencyP95?: number
  error?: string
  actualResult?: string
  expectedOutcome: string | string[]
}

/**
 * Benchmark suite summary
 */
interface BenchmarkSummary {
  totalTasks: number
  passedTasks: number
  failedTasks: number
  successRate: number
  avgDuration: number
  avgLatencyP50: number
  avgLatencyP95: number
  byCategory: Record<string, { passed: number; total: number; rate: number }>
  byDifficulty: Record<string, { passed: number; total: number; rate: number }>
  results: BenchmarkResult[]
}

/**
 * Standard GAIA-style benchmark tasks for web automation
 */
const BENCHMARK_TASKS: BenchmarkTask[] = [
  // EASY - Navigation tasks
  {
    id: 'nav-001',
    name: 'Simple Navigation',
    description: 'Navigate to a website and verify the page loaded',
    taskPrompt: 'Go to https://example.com and tell me the page title',
    expectedOutcome: ['Example Domain'],
    category: 'navigation',
    difficulty: 'easy',
    timeoutMs: 30000,
    validateResult: (result) => result?.toLowerCase().includes('example') || false
  },
  {
    id: 'nav-002',
    name: 'Search Navigation',
    description: 'Navigate to Google and perform a search',
    taskPrompt: 'Go to https://www.google.com, search for "OpenAI", and tell me if search results appeared',
    expectedOutcome: ['yes', 'search results', 'results appeared'],
    category: 'navigation',
    difficulty: 'easy',
    timeoutMs: 45000,
    validateResult: (result) =>
      result?.toLowerCase().includes('yes') ||
      result?.toLowerCase().includes('result') ||
      result?.toLowerCase().includes('found') || false
  },

  // EASY - Extraction tasks
  {
    id: 'ext-001',
    name: 'Simple Text Extraction',
    description: 'Extract text from a webpage',
    taskPrompt: 'Go to https://httpbin.org/html and extract the main heading text',
    expectedOutcome: ['Herman Melville', 'Moby Dick'],
    category: 'extraction',
    difficulty: 'easy',
    timeoutMs: 30000,
    validateResult: (result) =>
      result?.toLowerCase().includes('herman') ||
      result?.toLowerCase().includes('melville') ||
      result?.toLowerCase().includes('moby') || false
  },
  {
    id: 'ext-002',
    name: 'Link Extraction',
    description: 'Find and extract links from a page',
    taskPrompt: 'Go to https://example.com and tell me if there are any links on the page',
    expectedOutcome: ['More information', 'iana.org'],
    category: 'extraction',
    difficulty: 'easy',
    timeoutMs: 30000,
    validateResult: (result) =>
      result?.toLowerCase().includes('link') ||
      result?.toLowerCase().includes('more information') ||
      result?.toLowerCase().includes('iana') || false
  },

  // MEDIUM - Form filling tasks
  {
    id: 'form-001',
    name: 'Simple Form Input',
    description: 'Fill out a simple form',
    taskPrompt: 'Go to https://httpbin.org/forms/post, fill in "custname" with "John Doe" and tell me if you succeeded',
    expectedOutcome: ['success', 'filled', 'John Doe'],
    category: 'form_filling',
    difficulty: 'medium',
    timeoutMs: 45000,
    validateResult: (result) =>
      result?.toLowerCase().includes('success') ||
      result?.toLowerCase().includes('filled') ||
      result?.toLowerCase().includes('john') || false
  },
  {
    id: 'form-002',
    name: 'Form with Multiple Fields',
    description: 'Fill multiple form fields',
    taskPrompt: 'Go to https://httpbin.org/forms/post, fill "custname" with "Test User", "custtel" with "555-1234", and report what you did',
    expectedOutcome: ['filled', 'Test User', '555-1234'],
    category: 'form_filling',
    difficulty: 'medium',
    timeoutMs: 60000,
    validateResult: (result) =>
      (result?.toLowerCase().includes('test') && result?.toLowerCase().includes('user')) ||
      result?.toLowerCase().includes('555') ||
      result?.toLowerCase().includes('filled') || false
  },

  // MEDIUM - Multi-step tasks
  {
    id: 'multi-001',
    name: 'Navigate and Click',
    description: 'Navigate to a page and click a link',
    taskPrompt: 'Go to https://example.com, click on "More information" link, and tell me where you ended up',
    expectedOutcome: ['iana.org', 'IANA'],
    category: 'multi_step',
    difficulty: 'medium',
    timeoutMs: 60000,
    validateResult: (result) =>
      result?.toLowerCase().includes('iana') ||
      result?.toLowerCase().includes('internet assigned') || false
  },
  {
    id: 'multi-002',
    name: 'Search and Extract',
    description: 'Search on a site and extract results',
    taskPrompt: 'Go to https://en.wikipedia.org, search for "artificial intelligence", and tell me the first sentence of the article',
    expectedOutcome: ['intelligence', 'machine', 'AI'],
    category: 'multi_step',
    difficulty: 'medium',
    timeoutMs: 90000,
    validateResult: (result) =>
      result?.toLowerCase().includes('intelligence') ||
      result?.toLowerCase().includes('machine') ||
      result?.toLowerCase().includes('ai') || false
  },

  // HARD - Reasoning tasks
  {
    id: 'reason-001',
    name: 'Compare Information',
    description: 'Navigate to multiple pages and compare information',
    taskPrompt: 'Go to https://httpbin.org/ip and https://httpbin.org/user-agent, and tell me both your IP and user agent',
    expectedOutcome: ['ip', 'user-agent', 'Mozilla'],
    category: 'reasoning',
    difficulty: 'hard',
    timeoutMs: 120000,
    validateResult: (result) =>
      (result?.toLowerCase().includes('ip') || result?.includes('.')) &&
      (result?.toLowerCase().includes('agent') || result?.toLowerCase().includes('mozilla')) || false
  },
  {
    id: 'reason-002',
    name: 'Conditional Navigation',
    description: 'Make decisions based on page content',
    taskPrompt: 'Go to https://httpbin.org/status/200, check if you got a successful response, and if so navigate to https://httpbin.org/json and extract the slideshow title',
    expectedOutcome: ['Sample Slideshow', 'success', 'slideshow'],
    category: 'reasoning',
    difficulty: 'hard',
    timeoutMs: 120000,
    validateResult: (result) =>
      result?.toLowerCase().includes('sample') ||
      result?.toLowerCase().includes('slideshow') ||
      result?.toLowerCase().includes('success') || false
  }
]

/**
 * GAIA Benchmark Runner
 */
export class GAIABenchmark extends EventEmitter {
  private tasks: BenchmarkTask[]
  private results: BenchmarkResult[] = []
  private isRunning: boolean = false
  private shouldStop: boolean = false

  constructor(customTasks?: BenchmarkTask[]) {
    super()
    this.tasks = customTasks || BENCHMARK_TASKS
  }

  /**
   * Run all benchmark tasks
   */
  async runAll(): Promise<BenchmarkSummary> {
    logger.info('Starting GAIA benchmark suite', { taskCount: this.tasks.length })

    this.isRunning = true
    this.shouldStop = false
    this.results = []

    for (const task of this.tasks) {
      if (this.shouldStop) {
        logger.info('Benchmark stopped by user')
        break
      }

      const result = await this.runTask(task)
      this.results.push(result)

      this.emit('taskComplete', result)

      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    this.isRunning = false

    const summary = this.calculateSummary()
    this.emit('complete', summary)

    logger.info('GAIA benchmark complete', {
      successRate: `${(summary.successRate * 100).toFixed(1)}%`,
      passed: summary.passedTasks,
      total: summary.totalTasks
    })

    return summary
  }

  /**
   * Run a single benchmark task
   */
  async runTask(task: BenchmarkTask): Promise<BenchmarkResult> {
    const sessionId = `benchmark-${task.id}-${uuidv4().slice(0, 8)}`
    const startTime = Date.now()

    logger.info('Running benchmark task', { taskId: task.id, taskName: task.name })

    this.emit('taskStart', { taskId: task.id, taskName: task.name })

    try {
      let finalResult: string | null = null

      // Execute the task
      const results = await Promise.race([
        automationService.executeTask({
          sessionId,
          userId: 'benchmark-user',
          taskDescription: task.taskPrompt,
          agentConfig: {
            maxSteps: 20,
            vision: true,
            thinking: true
          },
          onAction: (action) => {
            if (action.value) {
              finalResult = action.value
            }
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), task.timeoutMs)
        )
      ])

      const duration = Date.now() - startTime
      const metrics = automationService.getLatencyMetrics(sessionId)

      // Get result from last action
      if (results.length > 0) {
        const lastSuccessful = results.filter(r => r.success).pop()
        if (lastSuccessful?.value) {
          finalResult = lastSuccessful.value
        }
      }

      // Validate the result
      const success = task.validateResult(finalResult)

      return {
        taskId: task.id,
        taskName: task.name,
        success,
        duration,
        latencyP50: metrics?.p50,
        latencyP95: metrics?.p95,
        actualResult: finalResult || undefined,
        expectedOutcome: task.expectedOutcome
      }
    } catch (error: any) {
      const duration = Date.now() - startTime

      logger.error('Benchmark task failed', { taskId: task.id, error: error.message })

      return {
        taskId: task.id,
        taskName: task.name,
        success: false,
        duration,
        error: error.message,
        expectedOutcome: task.expectedOutcome
      }
    } finally {
      // Cleanup
      automationService.cancel(sessionId)
    }
  }

  /**
   * Run tasks by category
   */
  async runByCategory(category: BenchmarkTask['category']): Promise<BenchmarkSummary> {
    const filteredTasks = this.tasks.filter(t => t.category === category)

    if (filteredTasks.length === 0) {
      throw new Error(`No tasks found for category: ${category}`)
    }

    const originalTasks = this.tasks
    this.tasks = filteredTasks

    try {
      return await this.runAll()
    } finally {
      this.tasks = originalTasks
    }
  }

  /**
   * Run tasks by difficulty
   */
  async runByDifficulty(difficulty: BenchmarkTask['difficulty']): Promise<BenchmarkSummary> {
    const filteredTasks = this.tasks.filter(t => t.difficulty === difficulty)

    if (filteredTasks.length === 0) {
      throw new Error(`No tasks found for difficulty: ${difficulty}`)
    }

    const originalTasks = this.tasks
    this.tasks = filteredTasks

    try {
      return await this.runAll()
    } finally {
      this.tasks = originalTasks
    }
  }

  /**
   * Stop the benchmark
   */
  stop(): void {
    this.shouldStop = true
    logger.info('Stopping benchmark...')
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(): BenchmarkSummary {
    const passedTasks = this.results.filter(r => r.success).length
    const totalTasks = this.results.length

    const durations = this.results.map(r => r.duration)
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    const latenciesP50 = this.results.map(r => r.latencyP50).filter((l): l is number => l !== undefined)
    const avgLatencyP50 = latenciesP50.length > 0
      ? latenciesP50.reduce((a, b) => a + b, 0) / latenciesP50.length
      : 0

    const latenciesP95 = this.results.map(r => r.latencyP95).filter((l): l is number => l !== undefined)
    const avgLatencyP95 = latenciesP95.length > 0
      ? latenciesP95.reduce((a, b) => a + b, 0) / latenciesP95.length
      : 0

    // Calculate by category
    const byCategory: Record<string, { passed: number; total: number; rate: number }> = {}
    for (const task of this.tasks) {
      if (!byCategory[task.category]) {
        byCategory[task.category] = { passed: 0, total: 0, rate: 0 }
      }
      byCategory[task.category].total++
    }
    for (const result of this.results) {
      const task = this.tasks.find(t => t.id === result.taskId)
      if (task && result.success) {
        byCategory[task.category].passed++
      }
    }
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].rate = byCategory[cat].total > 0
        ? byCategory[cat].passed / byCategory[cat].total
        : 0
    }

    // Calculate by difficulty
    const byDifficulty: Record<string, { passed: number; total: number; rate: number }> = {}
    for (const task of this.tasks) {
      if (!byDifficulty[task.difficulty]) {
        byDifficulty[task.difficulty] = { passed: 0, total: 0, rate: 0 }
      }
      byDifficulty[task.difficulty].total++
    }
    for (const result of this.results) {
      const task = this.tasks.find(t => t.id === result.taskId)
      if (task && result.success) {
        byDifficulty[task.difficulty].passed++
      }
    }
    for (const diff of Object.keys(byDifficulty)) {
      byDifficulty[diff].rate = byDifficulty[diff].total > 0
        ? byDifficulty[diff].passed / byDifficulty[diff].total
        : 0
    }

    return {
      totalTasks,
      passedTasks,
      failedTasks: totalTasks - passedTasks,
      successRate: totalTasks > 0 ? passedTasks / totalTasks : 0,
      avgDuration,
      avgLatencyP50,
      avgLatencyP95,
      byCategory,
      byDifficulty,
      results: this.results
    }
  }

  /**
   * Get current results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results]
  }

  /**
   * Check if benchmark is running
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Get available tasks
   */
  getTasks(): BenchmarkTask[] {
    return [...this.tasks]
  }

  /**
   * Add custom task
   */
  addTask(task: BenchmarkTask): void {
    this.tasks.push(task)
  }
}

// Export singleton
export const gaiaBenchmark = new GAIABenchmark()

// Export task types for custom tasks
export type { BenchmarkTask, BenchmarkResult, BenchmarkSummary }
