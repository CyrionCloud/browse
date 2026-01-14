'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Switch } from '@/components/ui'
import { PageLoader } from '@/components/LoadingState'
import { skillsApi } from '@/lib/api'
import { Search, Zap, BookOpen, ShoppingCart, BarChart, Globe, Users, Plus, Check } from 'lucide-react'
import type { Skill } from '@autobrowse/shared'
import { cn } from '@/lib/utils'

const skillCategories = [
  { id: 'all', name: 'All Skills', icon: Zap },
  { id: 'research', name: 'Research', icon: BookOpen },
  { id: 'shopping', name: 'Shopping', icon: ShoppingCart },
  { id: 'automation', name: 'Automation', icon: BarChart },
  { id: 'monitoring', name: 'Monitoring', icon: Globe },
  { id: 'productivity', name: 'Productivity', icon: Users },
]

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [enabledSkills, setEnabledSkills] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSkills()
  }, [])

  const loadSkills = async () => {
    try {
      const data = await skillsApi.getAll()
      setSkills(data)
    } catch (error) {
      console.error('Failed to load skills:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSkill = async (skillId: string) => {
    const isEnabled = enabledSkills.has(skillId)
    try {
      await skillsApi.toggleSkill(skillId, !isEnabled)
      setEnabledSkills((prev) => {
        const enabledSet = new Set(prev)
        if (isEnabled) {
          enabledSet.delete(skillId)
        } else {
          enabledSet.add(skillId)
        }
        return enabledSet
      })
    } catch (error) {
      console.error('Failed to toggle skill:', error)
    }
  }

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || skill.category === activeCategory
    return matchesSearch && matchesCategory
  })

  if (isLoading) {
    return (
      <Sidebar>
        <PageLoader message="Loading skills..." />
      </Sidebar>
    )
  }

  return (
    <Sidebar>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Automation Skills</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enable and configure pre-built automation templates
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Skill
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {skillCategories.map((category) => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  activeCategory === category.id
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
                )}
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </button>
            )
          })}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <Card key={skill.id} className="hover:border-accent/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{skill.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {skill.category}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={enabledSkills.has(skill.id)}
                    onCheckedChange={() => toggleSkill(skill.id)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {skill.description}
                </p>
                {enabledSkills.has(skill.id) && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-emerald-400">
                    <Check className="h-3 w-3" />
                    <span>Enabled</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSkills.length === 0 && (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No skills found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </Sidebar>
  )
}
