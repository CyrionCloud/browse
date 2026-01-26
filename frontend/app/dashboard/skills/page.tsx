'use client'

import { useState, useEffect } from 'react'
import { Pencil, Trash2, Globe, Lock, Plus } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

interface Skill {
  id: string
  name: string
  description: string
  category: string
  icon: string
  prompt_template: string
  default_config: Record<string, any>
  tags: string[]
  is_public: boolean
  is_active: boolean
  fork_count: number
  import_count: number
  rating_avg: number
  forked_from_id: string | null
}

export default function MySkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)

  useEffect(() => {
    loadSkills()
  }, [])

  const loadSkills = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/skills/user/all`)
      // Show skills unless explicitly inactive
      setSkills(data.filter((s: Skill) => s.is_active !== false))
      setLoading(false)
    } catch (error) {
      console.error('Failed to load skills:', error)
      setLoading(false)
    }
  }

  const handleDelete = async (skillId: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return

    try {
      await axios.delete(`${API_BASE}/skills/${skillId}`)
      setSkills(skills.filter(s => s.id !== skillId))
    } catch (error) {
      console.error('Failed to delete skill:', error)
      alert('Failed to delete skill')
    }
  }

  const handleTogglePublic = async (skill: Skill) => {
    try {
      const { data } = await axios.put(`${API_BASE}/skills/${skill.id}`, {
        is_public: !skill.is_public
      })
      // Reload all skills to get fresh data
      await loadSkills()
    } catch (error) {
      console.error('Failed to update skill:', error)
      alert('Failed to update skill')
    }
  }

  const handleSaveEdit = async (updatedSkill: Skill) => {
    try {
      const { data } = await axios.put(`${API_BASE}/skills/${updatedSkill.id}`, {
        name: updatedSkill.name,
        description: updatedSkill.description,
        category: updatedSkill.category,
        icon: updatedSkill.icon,
        prompt_template: updatedSkill.prompt_template,
        tags: updatedSkill.tags,
        is_public: updatedSkill.is_public
      })
      setEditingSkill(null)
      // Reload all skills to get fresh data
      await loadSkills()
    } catch (error) {
      console.error('Failed to update skill:', error)
      alert('Failed to update skill')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Skills</h1>
          <p className="text-muted-foreground">Manage your automation skills</p>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.filter(s => s).map((skill) => (
            <Card key={skill.id} className="p-6 hover:border-accent/50 transition-all">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{skill.icon || '⚡'}</span>
                  <div>
                    <h3 className="font-semibold text-foreground">{skill.name}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {skill.category}
                    </Badge>
                  </div>
                </div>
                {skill.is_public ? (
                  <Globe className="w-4 h-4 text-green-500" title="Public" />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground" title="Private" />
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {skill.description}
              </p>

              {/* Tags */}
              {skill.tags && skill.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {skill.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-surface-elevated text-xs text-muted-foreground rounded border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              {skill.is_public && (
                <div className="flex gap-4 text-xs text-muted-foreground mb-4">
                  <span>⭐ {skill.rating_avg.toFixed(1)}</span>
                  <span>🍴 {skill.fork_count} forks</span>
                  <span>📥 {skill.import_count} imports</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSkill(skill)}
                  className="flex-1"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTogglePublic(skill)}
                  className="flex-1"
                >
                  {skill.is_public ? <Lock className="w-4 h-4 mr-1" /> : <Globe className="w-4 h-4 mr-1" />}
                  {skill.is_public ? 'Private' : 'Publish'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(skill.id)}
                  className="text-red-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Forked Badge */}
              {skill.forked_from_id && (
                <div className="mt-2 text-xs text-muted-foreground">
                  🍴 Forked from original
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {skills.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Skills Yet</h3>
            <p className="text-muted-foreground mb-6">
              Import skills from the marketplace or create your own
            </p>
            <Button onClick={() => window.location.href = '/dashboard/marketplace'}>
              <Plus className="w-4 h-4 mr-2" />
              Browse Marketplace
            </Button>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      {editingSkill && (
        <SkillEditModal
          skill={editingSkill}
          onSave={handleSaveEdit}
          onClose={() => setEditingSkill(null)}
        />
      )}
    </div>
  )
}

// Edit Modal Component
interface SkillEditModalProps {
  skill: Skill
  onSave: (skill: Skill) => void
  onClose: () => void
}

function SkillEditModal({ skill, onSave, onClose }: SkillEditModalProps) {
  const [formData, setFormData] = useState(skill)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground">Edit Skill</h2>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {/* Name & Icon */}
            <div className="grid grid-cols-[1fr,auto] gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Icon
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-20 px-3 py-2 bg-surface-elevated border border-border rounded text-center text-2xl"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-foreground"
                rows={3}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-foreground"
              >
                <option value="research">🔍 Research</option>
                <option value="shopping">🛒 Shopping</option>
                <option value="job_search">💼 Job Search</option>
                <option value="form_filling">📝 Form Filling</option>
                <option value="monitoring">👁️ Monitoring</option>
                <option value="productivity">⚡ Productivity</option>
                <option value="social">📱 Social Media</option>
              </select>
            </div>

            {/* Prompt Template */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Prompt Template
              </label>
              <textarea
                value={formData.prompt_template}
                onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-foreground font-mono text-sm"
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{'}variables{'}'} for dynamic content
              </p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()) })}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded text-foreground"
                placeholder="linkedin, scraping, research"
              />
            </div>

            {/* Public Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_public" className="text-sm text-foreground">
                Make this skill public (share in marketplace)
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-border flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
