/**
 * Community Skills API Client
 * 
 * Handles marketplace operations: browse, rate, fork, import skills
 */

import api from './client'

export interface PublicSkill {
    id: string
    name: string
    slug: string
    description: string
    category: string
    icon: string
    prompt_template: string
    default_config: Record<string, any>
    tags: string[]
    is_public: boolean
    author_user_id?: string
    author_name?: string
    author_email?: string
    rating_avg?: number
    rating_count?: number
    import_count?: number
    fork_count?: number
    forked_from_id?: string | null
    version?: string
    created_at: string
    updated_at: string
}

export interface SkillRating {
    id: string
    skill_id: string
    user_id: string
    rating: number // 1-5
    review?: string
    created_at: string
    profiles?: {
        full_name?: string
        email?: string
    }
}

export interface SkillCategory {
    id: string
    name: string
    icon: string
}

export const communitySkillsApi = {
    /**
     * Browse public skills marketplace
     */
    getPublicSkills: async (params?: {
        category?: string
        tag?: string
        sort_by?: 'popular' | 'trending' | 'top_rated' | 'recent'
        limit?: number
        offset?: number
    }): Promise<{ skills: PublicSkill[]; total: number }> => {
        const { data } = await api.get<{ skills: PublicSkill[]; total: number }>('/api/skills/public', { params })
        return data
    },

    /**
     * Get skill details
     */
    getSkillById: async (skillId: string): Promise<PublicSkill> => {
        const { data } = await api.get<PublicSkill>(`/api/skills/${skillId}`)
        return data
    },

    /**
     * Get all skill categories
     */
    getCategories: async (): Promise<SkillCategory[]> => {
        const { data } = await api.get<{ categories: SkillCategory[] }>('/api/skills/categories')
        return data.categories
    },

    /**
     * Rate a skill (1-5 stars)
     */
    rateSkill: async (skillId: string, rating: number, review?: string): Promise<{ message: string; skill_stats: { rating_avg: number; rating_count: number } }> => {
        const { data } = await api.post<{ message: string; skill_stats: { rating_avg: number; rating_count: number } }>(`/api/skills/${skillId}/rate`, {
            rating,
            review
        })
        return data
    },

    /**
     * Get ratings for a skill
     */
    getRatings: async (skillId: string, limit = 10, offset = 0): Promise<{ ratings: SkillRating[] }> => {
        const { data } = await api.get<{ ratings: SkillRating[] }>(`/api/skills/${skillId}/ratings`, {
            params: { limit, offset }
        })
        return data
    },

    /**
     * Fork a skill to create your own copy
     */
    forkSkill: async (skillId: string, name: string, description?: string): Promise<{ message: string; skill: PublicSkill }> => {
        const { data } = await api.post<{ message: string; skill: PublicSkill }>(`/api/skills/${skillId}/fork`, {
            name,
            description
        })
        return data
    },

    /**
     * Import a skill to your library
     */
    importSkill: async (skillId: string): Promise<{ message: string; skill: PublicSkill }> => {
        const { data } = await api.post<{ message: string; skill: PublicSkill }>(`/api/skills/${skillId}/import`)
        return data
    },

    /**
     * Get all skills imported by current user
     */
    getMyImportedSkills: async (): Promise<{ imported_skills: any[] }> => {
        const { data } = await api.get<{ imported_skills: any[] }>('/api/skills/my/imported')
        return data
    },

    /**
     * Create a new skill
     */
    createSkill: async (skill: {
        name: string
        slug: string
        description: string
        category: string
        icon?: string
        prompt_template: string
        default_config?: Record<string, any>
        tags?: string[]
        is_public?: boolean
    }): Promise<PublicSkill> => {
        const { data } = await api.post<PublicSkill>('/api/skills', skill)
        return data
    },

    /**
     * Update an existing skill
     */
    updateSkill: async (skillId: string, updates: {
        name?: string
        description?: string
        prompt_template?: string
        default_config?: Record<string, any>
        tags?: string[]
        is_public?: boolean
    }): Promise<PublicSkill> => {
        const { data } = await api.put<PublicSkill>(`/api/skills/${skillId}`, updates)
        return data
    },

    /**
     * Delete a skill
     */
    deleteSkill: async (skillId: string): Promise<{ message: string }> => {
        const { data } = await api.delete<{ message: string }>(`/api/skills/${skillId}`)
        return data
    },
}
