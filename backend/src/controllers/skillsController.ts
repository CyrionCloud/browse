import { Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/errorHandler'

export const getSkills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const category = req.query.category as string | undefined

  let query = supabase
    .from('skills')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (category) {
    query = query.eq('category', category)
  }

  const { data: skills, error } = await query

  if (error) {
    logger.error('Failed to get skills', { error })
    throw new Error('Failed to get skills')
  }

  res.json({ data: skills })
})

export const getSkill = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data: skill, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !skill) {
    throw new NotFoundError('Skill not found')
  }

  res.json({ data: skill })
})

export const getUserSkills = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id
  if (!userId) {
    throw new BadRequestError('User ID required')
  }

  const { userId: pathUserId } = req.params

  // Users can only get their own skills
  if (pathUserId !== userId) {
    throw new NotFoundError('User not found')
  }

  const { data: userSkills, error } = await supabase
    .from('user_skills')
    .select(`
      *,
      skill:skills(*)
    `)
    .eq('user_id', userId)

  if (error) {
    logger.error('Failed to get user skills', { userId, error })
    throw new Error('Failed to get user skills')
  }

  res.json({ data: userSkills })
})

export const toggleSkill = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id
  if (!userId) {
    throw new BadRequestError('User ID required')
  }

  const { id: skillId } = req.params
  const { enabled } = req.body

  if (typeof enabled !== 'boolean') {
    throw new BadRequestError('Enabled field must be a boolean')
  }

  // Check if skill exists
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('id')
    .eq('id', skillId)
    .single()

  if (skillError || !skill) {
    throw new NotFoundError('Skill not found')
  }

  // Upsert user skill
  const { data: userSkill, error } = await supabase
    .from('user_skills')
    .upsert({
      user_id: userId,
      skill_id: skillId,
      enabled,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,skill_id'
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to toggle skill', { userId, skillId, error })
    throw new Error('Failed to toggle skill')
  }

  logger.info('Skill toggled', { userId, skillId, enabled })

  res.json({ data: userSkill })
})

export const updateSkillConfig = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id
  if (!userId) {
    throw new BadRequestError('User ID required')
  }

  const { id: skillId } = req.params
  const { custom_config } = req.body

  if (!custom_config || typeof custom_config !== 'object') {
    throw new BadRequestError('Custom config must be an object')
  }

  // Check if skill exists
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('id')
    .eq('id', skillId)
    .single()

  if (skillError || !skill) {
    throw new NotFoundError('Skill not found')
  }

  // Upsert user skill with custom config
  const { data: userSkill, error } = await supabase
    .from('user_skills')
    .upsert({
      user_id: userId,
      skill_id: skillId,
      custom_config,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,skill_id'
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to update skill config', { userId, skillId, error })
    throw new Error('Failed to update skill config')
  }

  logger.info('Skill config updated', { userId, skillId })

  res.json({ data: userSkill })
})

export const incrementSkillUsage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id
  if (!userId) {
    throw new BadRequestError('User ID required')
  }

  const { id: skillId } = req.params

  // Get current usage count
  const { data: userSkill, error: getError } = await supabase
    .from('user_skills')
    .select('usage_count')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .single()

  const currentCount = userSkill?.usage_count || 0

  // Update usage count
  const { error: updateError } = await supabase
    .from('user_skills')
    .upsert({
      user_id: userId,
      skill_id: skillId,
      usage_count: currentCount + 1,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,skill_id'
    })

  if (updateError) {
    logger.error('Failed to increment skill usage', { userId, skillId, error: updateError })
    throw new Error('Failed to increment skill usage')
  }

  res.json({ message: 'Usage incremented' })
})
