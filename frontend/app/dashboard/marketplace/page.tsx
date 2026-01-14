'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Input } from '@/components/ui'
import { Search, ShoppingBag, Star, Download, TrendingUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarketplaceSkill {
  id: string
  name: string
  description: string
  author: string
  downloads: number
  rating: number
  price: 'Free' | 'Paid'
  category: string
  icon: string
}

const marketplaceSkills: MarketplaceSkill[] = [
  {
    id: '1',
    name: 'E-commerce Scraper',
    description: 'Extract product data from major e-commerce websites including prices, ratings, and availability.',
    author: 'AutoBrowse Team',
    downloads: 12500,
    rating: 4.8,
    price: 'Free',
    category: 'Shopping',
    icon: '🛒',
  },
  {
    id: '2',
    name: 'LinkedIn Profile Extractor',
    description: 'Automatically extract LinkedIn profile information including work history and connections.',
    author: 'Community Dev',
    downloads: 8300,
    rating: 4.6,
    price: 'Free',
    category: 'Research',
    icon: '💼',
  },
  {
    id: '3',
    name: 'Social Media Monitor',
    description: 'Monitor multiple social media platforms for brand mentions and trending topics.',
    author: 'Pro Automation',
    downloads: 6200,
    rating: 4.5,
    price: 'Paid',
    category: 'Monitoring',
    icon: '📱',
  },
  {
    id: '4',
    name: 'News Aggregator',
    description: 'Collect and summarize news articles from multiple sources based on custom keywords.',
    author: 'AI Labs',
    downloads: 9800,
    rating: 4.7,
    price: 'Free',
    category: 'Research',
    icon: '📰',
  },
  {
    id: '5',
    name: 'Job Board Auto-Apply',
    description: 'Automatically search and apply to jobs matching your criteria across multiple platforms.',
    author: 'Career Tools Inc',
    downloads: 15400,
    rating: 4.9,
    price: 'Paid',
    category: 'Productivity',
    icon: '💼',
  },
  {
    id: '6',
    name: 'Price Tracker',
    description: 'Track prices of products across websites and get notified of discounts.',
    author: 'Savvy Shopper',
    downloads: 22000,
    rating: 4.8,
    price: 'Free',
    category: 'Shopping',
    icon: '💰',
  },
]

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const categories = ['All', 'Shopping', 'Research', 'Monitoring', 'Productivity', 'Automation']

  const filteredSkills = marketplaceSkills.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || activeCategory === skill.category
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Skill Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover and install community-created automation skills
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search marketplace..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category.toLowerCase())}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                activeCategory === category.toLowerCase()
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
              )}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <Card key={skill.id} className="hover:border-accent/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-surface-elevated flex items-center justify-center text-2xl">
                      {skill.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{skill.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">by {skill.author}</p>
                    </div>
                  </div>
                  <Badge variant={skill.price === 'Free' ? 'outline' : 'default'}>
                    {skill.price}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {skill.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {skill.downloads.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    {skill.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated 2d ago
                  </span>
                </div>
                <Button className="w-full" variant={skill.price === 'Free' ? 'default' : 'outline'}>
                  {skill.price === 'Free' ? (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Install
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Purchase - $9.99
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSkills.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No skills found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
    </div>
  )
}
