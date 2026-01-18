'use client'

import { useState, useEffect } from 'react'
import { X, Download, GitFork, Star, Loader2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { RatingStars } from './RatingStars'
import type { PublicSkill, SkillRating } from '@/lib/api/community-skills'
import { communitySkillsApi } from '@/lib/api/community-skills'
import { formatDate } from '@/lib/utils'

interface SkillDetailModalProps {
    skill: PublicSkill
    onClose: () => void
    onImport: (skill: PublicSkill) => Promise<void>
    onFork: (skill: PublicSkill) => Promise<void>
}

export function SkillDetailModal({ skill, onClose, onImport, onFork }: SkillDetailModalProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'ratings'>('overview')
    const [ratings, setRatings] = useState<SkillRating[]>([])
    const [loadingRatings, setLoadingRatings] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Rating form
    const [userRating, setUserRating] = useState(0)
    const [userReview, setUserReview] = useState('')
    const [showRatingForm, setShowRatingForm] = useState(false)

    useEffect(() => {
        if (activeTab === 'ratings') {
            loadRatings()
        }
    }, [activeTab, skill.id])

    const loadRatings = async () => {
        setLoadingRatings(true)
        try {
            const { ratings: fetchedRatings } = await communitySkillsApi.getRatings(skill.id)
            setRatings(fetchedRatings)
        } catch (error) {
            console.error('Failed to load ratings:', error)
        } finally {
            setLoadingRatings(false)
        }
    }

    const handleSubmitRating = async () => {
        if (userRating === 0) return

        setSubmitting(true)
        try {
            await communitySkillsApi.rateSkill(skill.id, userRating, userReview || undefined)
            setShowRatingForm(false)
            setUserRating(0)
            setUserReview('')
            // Reload ratings
            await loadRatings()
        } catch (error) {
            console.error('Failed to submit rating:', error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className="text-5xl">{skill.icon}</div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{skill.name}</h2>
                                <div className="flex items-center gap-3 mt-2">
                                    <RatingStars rating={skill.rating_avg || 0} size="md" showCount count={skill.rating_count || 0} />
                                    <span className="text-sm text-gray-500">•</span>
                                    <span className="text-sm text-gray-500">{skill.import_count || 0} imports</span>
                                    <span className="text-sm text-gray-500">•</span>
                                    <span className="text-sm text-gray-500">{skill.fork_count || 0} forks</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 px-6">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-3 px-1 border-b-2 transition-colors ${activeTab === 'overview'
                                    ? 'border-electric-blue text-electric-blue'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('ratings')}
                            className={`py-3 px-1 border-b-2 transition-colors ${activeTab === 'ratings'
                                    ? 'border-electric-blue text-electric-blue'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Ratings ({skill.rating_count || 0})
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                                <p className="text-gray-600">{skill.description}</p>
                            </div>

                            {/* Tags */}
                            {skill.tags && skill.tags.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {skill.tags.map((tag) => (
                                            <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Category */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Category</h3>
                                <span className="inline-flex items-center px-3 py-1 bg-electric-blue/10 text-electric-blue rounded-full text-sm">
                                    {skill.category}
                                </span>
                            </div>

                            {/* Version */}
                            {skill.version && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Version</h3>
                                    <span className="text-gray-600">{skill.version}</span>
                                </div>
                            )}

                            {/* Created */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Created</h3>
                                <span className="text-gray-600">{formatDate(skill.created_at)}</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ratings' && (
                        <div className="space-y-6">
                            {/* Rate this skill button */}
                            {!showRatingForm && (
                                <Button
                                    onClick={() => setShowRatingForm(true)}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Star className="w-4 h-4 mr-2" />
                                    Rate this skill
                                </Button>
                            )}

                            {/* Rating form */}
                            {showRatingForm && (
                                <Card className="p-4 bg-gray-50">
                                    <h4 className="font-semibold mb-3">Your Rating</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm text-gray-600 mb-2 block">Rating</label>
                                            <RatingStars
                                                rating={userRating}
                                                size="lg"
                                                interactive
                                                onRate={setUserRating}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-600 mb-2 block">Review (optional)</label>
                                            <textarea
                                                value={userReview}
                                                onChange={(e) => setUserReview(e.target.value)}
                                                placeholder="Share your experience with this skill..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-electric-blue"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleSubmitRating}
                                                disabled={userRating === 0 || submitting}
                                                className="flex-1"
                                            >
                                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Rating'}
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setShowRatingForm(false)
                                                    setUserRating(0)
                                                    setUserReview('')
                                                }}
                                                variant="outline"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Ratings list */}
                            {loadingRatings ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-electric-blue" />
                                </div>
                            ) : ratings.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No ratings yet. Be the first to rate!</p>
                            ) : (
                                <div className="space-y-4">
                                    {ratings.map((rating) => (
                                        <Card key={rating.id} className="p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <RatingStars rating={rating.rating} size="sm" />
                                                <span className="text-xs text-gray-500">{formatDate(rating.created_at)}</span>
                                            </div>
                                            {rating.review && <p className="text-gray-700 text-sm">{rating.review}</p>}
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-200 flex gap-3">
                    <Button
                        onClick={() => onImport(skill)}
                        className="flex-1"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Import to Library
                    </Button>
                    <Button
                        onClick={() => onFork(skill)}
                        variant="outline"
                        className="flex-1"
                    >
                        <GitFork className="w-4 h-4 mr-2" />
                        Fork & Customize
                    </Button>
                </div>
            </div>
        </div>
    )
}
