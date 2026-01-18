'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Loader2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { SkillCard } from '@/components/skills/SkillCard'
import { SkillDetailModal } from '@/components/skills/SkillDetailModal'
import type { PublicSkill, SkillCategory } from '@/lib/api/community-skills'
import { communitySkillsApi } from '@/lib/api/community-skills'

export default function SkillsMarketplacePage() {
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
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Skills Marketplace</h1>
                <p className="text-gray-600">Discover and import automation skills shared by the community</p>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search skills..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-blue"
                        />
                    </div>

                    {/* Category Filter */}
                    <div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-blue"
                        >
                            <option value="">All Categories</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.icon} {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sort */}
                    <div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-blue"
                        >
                            <option value="popular">Most Popular</option>
                            <option value="trending">Trending</option>
                            <option value="top_rated">Top Rated</option>
                            <option value="recent">Recently Added</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600">
                {loading ? 'Loading...' : `${filteredSkills.length} skill${filteredSkills.length !== 1 ? 's' : ''} found`}
            </div>

            {/* Skills Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-electric-blue" />
                </div>
            ) : filteredSkills.length === 0 ? (
                <Card className="p-8 text-center">
                    <p className="text-gray-500">No skills found matching your criteria.</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
