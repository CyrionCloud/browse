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
            className="p-6 h-full flex flex-col hover:shadow-lg hover:border-accent/50 transition-all cursor-pointer group bg-surface"
            onClick={() => onViewDetails(skill)}
        >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl flex-shrink-0">{skill.icon}</div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground truncate group-hover:text-accent transition-colors">
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
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                {skill.description}
            </p>

            {/* Tags */}
            {skill.tags && skill.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {skill.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 bg-surface-elevated text-muted-foreground text-xs rounded-full border border-border"
                        >
                            {tag}
                        </span>
                    ))}
                    {skill.tags.length > 3 && (
                        <span className="px-2 py-0.5 text-muted-foreground text-xs">
                            +{skill.tags.length - 3}
                        </span>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 pt-3 border-t border-border text-xs text-muted-foreground">
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
                    className="ml-auto flex items-center gap-1 text-accent hover:text-accent/80 transition-colors font-medium"
                >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                </button>
            </div>
        </Card>
    )
}
