/**
 * Templates API Client
 * 
 * Handles all API calls for session templates
 */

import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export interface Template {
    id: string
    user_id: string
    name: string
    description?: string
    task_description: string
    config: Record<string, any>
    selected_skills: string[]
    use_count: number
    last_used_at?: string
    created_at: string
    updated_at: string
}

export interface TemplateCreate {
    name: string
    description?: string
    task_description: string
    config?: Record<string, any>
    selected_skills?: string[]
}

export interface TemplateUpdate {
    name?: string
    description?: string
    task_description?: string
    config?: Record<string, any>
    selected_skills?: string[]
}

export const templatesApi = {
    /**
     * List all templates for current user
     */
    async getAll(sortBy: 'updated_at' | 'created_at' | 'use_count' | 'name' = 'updated_at', limit = 50): Promise<Template[]> {
        const { data } = await axios.get<Template[]>(`${API_BASE}/templates`, {
            params: { sort_by: sortBy, limit }
        })
        return data
    },

    /**
     * Create a new template
     */
    async create(template: TemplateCreate): Promise<Template> {
        const { data } = await axios.post<Template>(`${API_BASE}/templates`, template)
        return data
    },

    /**
     * Get a specific template
     */
    async get(id: string): Promise<Template> {
        const { data } = await axios.get<Template>(`${API_BASE}/templates/${id}`)
        return data
    },

    /**
     * Update a template
     */
    async update(id: string, updates: TemplateUpdate): Promise<Template> {
        const { data } = await axios.put<Template>(`${API_BASE}/templates/${id}`, updates)
        return data
    },

    /**
     * Delete a template
     */
    async delete(id: string): Promise<void> {
        await axios.delete(`${API_BASE}/templates/${id}`)
    },

    /**
     * Increment use count when template is used
     */
    async markAsUsed(id: string): Promise<void> {
        await axios.post(`${API_BASE}/templates/${id}/use`)
    }
}
