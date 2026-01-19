'use client'

import { useState, useEffect } from 'react'
import { Template, templatesApi } from '@/lib/api/templates'
import { Card, Button } from '@/components/ui'
import { Plus, Search, Clock, TrendingUp, Star, Trash2, Edit, Copy } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'updated_at' | 'created_at' | 'use_count' | 'name'>('updated_at')

    useEffect(() => {
        loadTemplates()
    }, [sortBy])

    const loadTemplates = async () => {
        setLoading(true)
        try {
            const fetchedTemplates = await templatesApi.getAll(sortBy)
            setTemplates(fetchedTemplates)
        } catch (error) {
            console.error('Failed to load templates:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return

        try {
            await templatesApi.delete(id)
            setTemplates(templates.filter(t => t.id !== id))
        } catch (error) {
            console.error('Failed to delete template:', error)
            alert('Failed to delete template')
        }
    }

    const handleUseTemplate = async (template: Template) => {
        try {
            await templatesApi.markAsUsed(template.id)
            // Navigate to new session with template data
            const sessionData = {
                task: template.task_description,
                config: template.config,
                skills: template.selected_skills
            }

            // Store in localStorage for the new session page to pick up
            localStorage.setItem('template_session', JSON.stringify(sessionData))
            window.location.href = '/dashboard/sessions/new'
        } catch (error) {
            console.error('Failed to use template:', error)
        }
    }

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.task_description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Templates</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Save and reuse your favorite automation configurations
                    </p>
                </div>
                <Button onClick={() => window.location.href = '/dashboard/sessions/new'}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                </Button>
            </div>

            {/* Search and Sort */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                    <option value="updated_at">Recently Updated</option>
                    <option value="created_at">Recently Created</option>
                    <option value="use_count">Most Used</option>
                    <option value="name">Name</option>
                </select>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredTemplates.length === 0 ? (
                <Card className="p-12 text-center">
                    <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No templates yet</h3>
                    <p className="text-muted-foreground mb-6">
                        {searchQuery ? 'No templates match your search' : 'Create your first template to get started'}
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => window.location.href = '/dashboard/sessions/new'}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Template
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                        <Card key={template.id} className="p-5 hover:border-accent/50 transition-all">
                            {/* Template Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
                                    {template.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                            {template.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{template.use_count}</span>
                                </div>
                            </div>

                            {/* Task Description */}
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                {template.task_description}
                            </p>

                            {/* Skills */}
                            {template.selected_skills.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {template.selected_skills.slice(0, 3).map((skill) => (
                                        <span
                                            key={skill}
                                            className="px-2 py-0.5 bg-surface-elevated text-muted-foreground text-xs rounded-full border border-border"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                    {template.selected_skills.length > 3 && (
                                        <span className="px-2 py-0.5 text-muted-foreground text-xs">
                                            +{template.selected_skills.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-border">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <Button
                                        onClick={() => handleUseTemplate(template)}
                                        size="sm"
                                        variant="outline"
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Use
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
