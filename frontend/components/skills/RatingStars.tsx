'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

interface RatingStarsProps {
    rating: number
    maxRating?: number
    size?: 'sm' | 'md' | 'lg'
    interactive?: boolean
    onRate?: (rating: number) => void
    showCount?: boolean
    count?: number
}

export function RatingStars({
    rating,
    maxRating = 5,
    size = 'md',
    interactive = false,
    onRate,
    showCount = false,
    count = 0,
}: RatingStarsProps) {
    const [hoverRating, setHoverRating] = useState(0)

    const sizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    }

    const handleClick = (starRating: number) => {
        if (interactive && onRate) {
            onRate(starRating)
        }
    }

    const displayRating = interactive && hoverRating > 0 ? hoverRating : rating

    return (
        <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
                {Array.from({ length: maxRating }, (_, i) => i + 1).map((starNum) => {
                    const filled = starNum <= Math.floor(displayRating)
                    const partialFill = starNum === Math.ceil(displayRating) && displayRating % 1 !== 0

                    return (
                        <button
                            key={starNum}
                            type="button"
                            disabled={!interactive}
                            onClick={() => handleClick(starNum)}
                            onMouseEnter={() => interactive && setHoverRating(starNum)}
                            onMouseLeave={() => interactive && setHoverRating(0)}
                            className={`
                ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                transition-transform
              `}
                        >
                            <Star
                                className={`
                  ${sizes[size]}
                  ${filled ? 'fill-yellow-400 text-yellow-400' : ''}
                  ${partialFill ? 'fill-yellow-400/50 text-yellow-400' : ''}
                  ${!filled && !partialFill ? 'text-gray-300' : ''}
                  transition-colors
                `}
                            />
                        </button>
                    )
                })}
            </div>

            {showCount && count > 0 && (
                <span className="text-sm text-gray-500 ml-1">
                    ({count})
                </span>
            )}

            {interactive && hoverRating > 0 && (
                <span className="text-sm text-gray-600 ml-2">
                    {hoverRating} star{hoverRating !== 1 ? 's' : ''}
                </span>
            )}
        </div>
    )
}
