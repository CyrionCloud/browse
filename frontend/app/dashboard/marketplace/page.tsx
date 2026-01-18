'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { SkillCard } from '@/components/skills/SkillCard'
import { SkillDetailModal } from '@/components/skills/SkillDetailModal'
import type { PublicSkill, SkillCategory } from '@/lib/api/community-skills'
import { communitySkillsApi } from '@/lib/api/community-skills'
import { cn } from '@/lib/utils'

export default function MarketplacePage() {
  const [skills, setSkills] = useState<PublicSkill[]>([])
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [sortBy, setSortBy] = useState<'popular' | 'trending' | 'top_rated' | 'recent'>('popular')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<PublicSkill | null>(null)

  useEffect(() => {
    loadCategories()
    loadSkills()
  }, [])

  useEffect(() => {
    loadSkills()
  }, [selectedCategory, sortBy])

  const loadCategories = async () => {
    try {
      const fetchedCategories = await communitySkillsApi.getCategories()
      setCategories(fetchedCategories)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadSkills = async () => {
    setLoading(true)
    try {
      const { skills: fetchedSkills } = await communitySkillsApi.getPublicSkills({
        category: selectedCategory || undefined,
        sort_by: sortBy,
        limit: 50,
      })
      setSkills(fetchedSkills)
    } catch (error) {
      console.error('Failed to load skills:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleImportSkill = async (skill: PublicSkill) => {
    try {
      await communitySkillsApi.importSkill(skill.id)
      alert(`Successfully imported "${skill.name}" to your library!`)
      setSelectedSkill(null)
    } catch (error) {
      console.error('Failed to import skill:', error)
      alert('Failed to import skill. Please try again.')
    }
  }

  const handleForkSkill = async (skill: PublicSkill) => {
    const forkName = prompt(`Enter a name for your forked skill:`, `${skill.name} (My Version)`)
    if (!forkName) return

    try {
      await communitySkillsApi.forkSkill(skill.id, forkName)
      alert(`Successfully forked "${skill.name}" as "${forkName}"!`)
      setSelectedSkill(null)
    } catch (error) {
      console.error('Failed to fork skill:', error)
      alert('Failed to fork skill. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Skill Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover and install community-created automation skills
        </p>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search skills..."
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
          <option value="popular">Most Popular</option>
          <option value="trending">Trending</option>
          <option value="top_rated">Top Rated</option>
          <option value="recent">Recently Added</option>
        </select>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            selectedCategory === ''
              ? 'bg-accent/15 text-accent'
              : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              selectedCategory === category.id
                ? 'bg-accent/15 text-accent'
                : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
            )}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {loading ? 'Loading...' : `${filteredSkills.length} skill${filteredSkills.length !== 1 ? 's' : ''} found`}
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : filteredSkills.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No skills found matching your criteria.</p>
          <Button
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('')
            }}
            variant="outline"
            className="mt-4"
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onViewDetails={setSelectedSkill}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
          onImport={handleImportSkill}
          onFork={handleForkSkill}
        />
      )}
    </div>
  )
}
