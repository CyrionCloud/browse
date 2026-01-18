'use client'

import { Card } from '@/components/ui'
import { RatingStars } from './RatingStars'
import type { PublicSkill } from '@/lib/api/community-skills'
import { Download, GitFork, Eye } from 'lucide-react'

interface SkillCardProps {
    skill: PublicSkill
    onViewDetails: (skill: PublicSkill) => void
}

export function SkillCard({ skill, onViewDetails }: SkillCardProps) {
    return (
        <Card
            className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => onViewDetails(skill)}
        >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl flex-shrink-0">{skill.icon}</div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 truncate group-hover:text-electric-blue transition-colors">
                        {skill.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <RatingStars
                            rating={skill.rating_avg || 0}
                            size="sm"
                            showCount
                            count={skill.rating_count || 0}
                        />
                    </div>
                </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                {skill.description}
            </p>

            {/* Tags */}
            {skill.tags && skill.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {skill.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                            {tag}
                        </span>
                    ))}
                    {skill.tags.length > 3 && (
                        <span className="px-2 py-0.5 text-gray-500 text-xs">
                            +{skill.tags.length - 3}
                        </span>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" />
                    <span>{skill.import_count || 0} imports</span>
                </div>
                <div className="flex items-center gap-1">
                    <GitFork className="w-3.5 h-3.5" />
                    <span>{skill.fork_count || 0} forks</span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onViewDetails(skill)
                    }}
                    className="ml-auto flex items-center gap-1 text-electric-blue hover:text-electric-blue/80 transition-colors"
                >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                </button>
            </div>
        </Card>
    )
}
