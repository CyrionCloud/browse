/**
 * Decomposition API Client
 * 
 * Handles API calls for task decomposition and subtask management
 */

import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export interface Subtask {
    index: number
    description: string
    expected_outcome: string
    success_criteria: string
    dependencies: number[]
    estimated_duration_seconds: number
}

export interface Decomposition {
    id: string
    session_id?: string
    user_id: string
    original_task: string
    subtasks: Subtask[]
    dependencies: Record<string, number[]>
    current_subtask_index: number
    completed_subtasks: number[]
    failed_subtasks: number[]
    total_estimated_duration: number
    actual_duration?: number
    created_at: string
    updated_at: string
    completed_at?: string
}

export interface SubtaskExecution {
    id: string
    decomposition_id: string
    subtask_index: number
    subtask_description: string
    expected_outcome: string
    success_criteria: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
    started_at?: string
    completed_at?: string
    duration?: number
    error_message?: string
    retry_count: number
    result_data?: Record<string, any>
    screenshot_url?: string
    created_at: string
}

export interface DecompositionWithExecutions {
    decomposition: Decomposition
    executions: SubtaskExecution[]
}

export const decompositionApi = {
    /**
     * Get decomposition for a session
     */
    async getBySession(sessionId: string): Promise<DecompositionWithExecutions> {
        const { data } = await axios.get<DecompositionWithExecutions>(
            `${API_BASE}/decomposition/${sessionId}`
        )
        return data
    },

    /**
     * Create a new decomposition
     */
    async create(originalTask: string, userId: string, sessionId?: string): Promise<Decomposition> {
        const { data } = await axios.post<Decomposition>(`${API_BASE}/decomposition/`, {
            original_task: originalTask,
            user_id: userId,
            session_id: sessionId
        })
        return data
    },

    /**
     * Update subtask execution status
     */
    async updateSubtask(
        decompositionId: string,
        subtaskIndex: number,
        status: string,
        resultData?: Record<string, any>,
        errorMessage?: string,
        screenshotUrl?: string
    ): Promise<void> {
        await axios.put(
            `${API_BASE}/decomposition/${decompositionId}/subtask/${subtaskIndex}`,
            {
                status,
                result_data: resultData,
                error_message: errorMessage,
                screenshot_url: screenshotUrl
            }
        )
    },

    /**
     * Retry a failed subtask
     */
    async retrySubtask(decompositionId: string, subtaskIndex: number): Promise<void> {
        await axios.post(`${API_BASE}/decomposition/${decompositionId}/retry/${subtaskIndex}`)
    },

    /**
     * Skip a subtask
     */
    async skipSubtask(decompositionId: string, subtaskIndex: number): Promise<void> {
        await axios.post(`${API_BASE}/decomposition/${decompositionId}/skip/${subtaskIndex}`)
    }
}
