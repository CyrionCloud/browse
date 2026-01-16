import type { Request, Response } from 'express'
import { gaiaBenchmark, BenchmarkSummary } from '../benchmark/GAIABenchmark'
import { logger } from '../utils/logger'

let currentBenchmark: Promise<BenchmarkSummary> | null = null

/**
 * Start GAIA benchmark suite
 */
export const startBenchmark = async (req: Request, res: Response) => {
  try {
    if (gaiaBenchmark.isActive()) {
      res.status(409).json({ error: 'Benchmark already running' })
      return
    }

    const { category, difficulty } = req.body

    logger.info('Starting GAIA benchmark', { category, difficulty })

    // Start benchmark in background
    if (category) {
      currentBenchmark = gaiaBenchmark.runByCategory(category)
    } else if (difficulty) {
      currentBenchmark = gaiaBenchmark.runByDifficulty(difficulty)
    } else {
      currentBenchmark = gaiaBenchmark.runAll()
    }

    res.json({
      message: 'Benchmark started',
      tasks: gaiaBenchmark.getTasks().length
    })
  } catch (error: any) {
    logger.error('Start benchmark error', { error: error.message })
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get benchmark status and results
 */
export const getBenchmarkStatus = async (_req: Request, res: Response) => {
  try {
    const isRunning = gaiaBenchmark.isActive()
    const results = gaiaBenchmark.getResults()

    res.json({
      isRunning,
      completedTasks: results.length,
      totalTasks: gaiaBenchmark.getTasks().length,
      results,
      passedSoFar: results.filter(r => r.success).length
    })
  } catch (error: any) {
    logger.error('Get benchmark status error', { error: error.message })
    res.status(500).json({ error: error.message })
  }
}

/**
 * Stop running benchmark
 */
export const stopBenchmark = async (_req: Request, res: Response) => {
  try {
    if (!gaiaBenchmark.isActive()) {
      res.status(400).json({ error: 'No benchmark running' })
      return
    }

    gaiaBenchmark.stop()

    res.json({ message: 'Benchmark stop requested' })
  } catch (error: any) {
    logger.error('Stop benchmark error', { error: error.message })
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get available benchmark tasks
 */
export const getBenchmarkTasks = async (_req: Request, res: Response) => {
  try {
    const tasks = gaiaBenchmark.getTasks().map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      difficulty: t.difficulty
    }))

    res.json({ tasks })
  } catch (error: any) {
    logger.error('Get benchmark tasks error', { error: error.message })
    res.status(500).json({ error: error.message })
  }
}

/**
 * Wait for benchmark to complete and return summary
 */
export const waitForBenchmark = async (_req: Request, res: Response) => {
  try {
    if (!currentBenchmark) {
      res.status(400).json({ error: 'No benchmark has been started' })
      return
    }

    const summary = await currentBenchmark

    res.json({
      success: true,
      summary: {
        ...summary,
        successRatePercent: `${(summary.successRate * 100).toFixed(1)}%`,
        meetsTarget: summary.successRate >= 0.8 // 80% target
      }
    })
  } catch (error: any) {
    logger.error('Wait for benchmark error', { error: error.message })
    res.status(500).json({ error: error.message })
  }
}
