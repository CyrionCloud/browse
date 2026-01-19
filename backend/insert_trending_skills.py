#!/usr/bin/env python3
"""Script to insert trending skills from browser-use marketplace"""

import sys
sys.path.insert(0, '/home/mo/Desktop/SaaS projects/browse/backend')

from app.services.database import DatabaseService

db = DatabaseService()
client = db.get_client()

skills = [
    {
        'name': 'Meta Ads Library Scraper',
        'description': 'Retrieve Meta Ads Library data based on search keywords. Find competitor ads, creative strategies, and advertising insights from Facebook and Instagram.',
        'category': 'lead_generation',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.8,
        'rating_count': 89,
        'import_count': 133,
        'fork_count': 45,
        'prompt_template': 'Search the Meta Ads Library for ads related to: {{keywords}}. Extract ad creative text, images, advertiser name, start date, and platform.',
        'default_config': {'max_results': 50, 'platforms': ['facebook', 'instagram']},
        'tags': ['meta', 'facebook', 'instagram', 'ads', 'marketing']
    },
    {
        'name': 'Google Trends Extractor',
        'description': 'Extracts real-time trending search data from Google Trends based on Country Code.',
        'category': 'research',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.7,
        'rating_count': 76,
        'import_count': 104,
        'fork_count': 38,
        'prompt_template': 'Extract trending searches from Google Trends for country: {{country_code}}.',
        'default_config': {'country_code': 'US', 'count': 20},
        'tags': ['google', 'trends', 'seo', 'market-research']
    },
    {
        'name': 'TikTok Profile Scraper',
        'description': 'Extracts TikTok profile information including follower count, following, likes, bio, and recent video stats.',
        'category': 'social_media',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.6,
        'rating_count': 72,
        'import_count': 101,
        'fork_count': 35,
        'prompt_template': 'Scrape TikTok profile for username: {{username}}. Extract follower count, likes, bio, and videos.',
        'default_config': {'include_videos': True, 'video_count': 10},
        'tags': ['tiktok', 'social-media', 'influencer', 'analytics']
    },
    {
        'name': 'Tech Jobs Navigator',
        'description': 'Fetches real-time tech job listings with advanced filtering by location, salary, and experience level.',
        'category': 'jobs',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.5,
        'rating_count': 28,
        'import_count': 34,
        'fork_count': 12,
        'prompt_template': 'Search for {{job_title}} jobs in {{location}}. Filter by experience and remote.',
        'default_config': {'experience': 'any', 'remote': True},
        'tags': ['jobs', 'tech', 'career', 'remote-work']
    },
    {
        'name': 'YC Company Insights',
        'description': 'Extracts company and founder data, funding status from Y Combinator directory.',
        'category': 'research',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.7,
        'rating_count': 26,
        'import_count': 33,
        'fork_count': 14,
        'prompt_template': 'Search YCombinator for companies in: {{industry}}. Extract founders and funding.',
        'default_config': {'batch': 'any', 'include_linkedin': True},
        'tags': ['ycombinator', 'startups', 'venture-capital', 'founders']
    },
    {
        'name': 'Amazon Product Analyzer',
        'description': 'Returns structured Amazon product details. Get pricing, reviews, ratings, and competitive insights.',
        'category': 'ecommerce',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.4,
        'rating_count': 21,
        'import_count': 26,
        'fork_count': 9,
        'prompt_template': 'Search Amazon for: {{search_query}}. Extract product details and reviews.',
        'default_config': {'count': 20, 'prime_only': False},
        'tags': ['amazon', 'ecommerce', 'product-research', 'pricing']
    },
    {
        'name': 'Instagram Post Extractor',
        'description': 'Retrieves posts from Instagram profiles with captions, engagement metrics, and media URLs.',
        'category': 'social_media',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.5,
        'rating_count': 19,
        'import_count': 24,
        'fork_count': 8,
        'prompt_template': 'Extract posts from Instagram profile: {{username}}.',
        'default_config': {'count': 12, 'include_reels': True},
        'tags': ['instagram', 'social-media', 'content', 'influencer']
    },
    {
        'name': 'YouTube Playlist Analyzer',
        'description': 'Extract video details and metadata from YouTube playlists.',
        'category': 'social_media',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.6,
        'rating_count': 18,
        'import_count': 24,
        'fork_count': 7,
        'prompt_template': 'Analyze YouTube playlist: {{playlist_url}}.',
        'default_config': {'include_descriptions': True},
        'tags': ['youtube', 'video', 'content', 'analytics']
    },
    {
        'name': 'Google Ads Transparency Scraper',
        'description': 'Extracts all ads run by a specific advertiser from Google Ads Transparency Center.',
        'category': 'marketing',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.5,
        'rating_count': 15,
        'import_count': 19,
        'fork_count': 6,
        'prompt_template': 'Search Google Ads Transparency for advertiser: {{advertiser_name}}.',
        'default_config': {'date_range': 'last_30_days'},
        'tags': ['google-ads', 'advertising', 'competitor-analysis']
    },
    {
        'name': 'Flight Deal Hunter',
        'description': 'Finds the cheapest flights with detailed itinerary info and booking URLs.',
        'category': 'travel',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.4,
        'rating_count': 14,
        'import_count': 18,
        'fork_count': 5,
        'prompt_template': 'Search flights from {{origin}} to {{destination}} on {{date}}.',
        'default_config': {'count': 10, 'class': 'economy'},
        'tags': ['travel', 'flights', 'deals', 'booking']
    },
    {
        'name': 'Statista Market Intelligence',
        'description': 'Extracts market data, statistics, and reports from Statista.',
        'category': 'research',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.6,
        'rating_count': 14,
        'import_count': 18,
        'fork_count': 6,
        'prompt_template': 'Search Statista for market data on: {{topic}}.',
        'default_config': {'max_results': 10},
        'tags': ['statista', 'market-research', 'statistics']
    },
    {
        'name': 'LinkedIn Job Scraper',
        'description': 'Extracts job listings from LinkedIn with company info and requirements.',
        'category': 'jobs',
        'is_public': True,
        'author_user_id': '00000000-0000-0000-0000-000000000000',
        'rating_avg': 4.5,
        'rating_count': 45,
        'import_count': 67,
        'fork_count': 22,
        'prompt_template': 'Search LinkedIn jobs for: {{job_title}} in {{location}}.',
        'default_config': {'experience_level': 'any'},
        'tags': ['linkedin', 'jobs', 'career']
    }
]

added = 0
for skill in skills:
    try:
        result = client.table('skills').insert(skill).execute()
        print(f'✓ Added: {skill["name"]}')
        added += 1
    except Exception as e:
        if 'duplicate' in str(e).lower():
            print(f'○ Already exists: {skill["name"]}')
        else:
            print(f'✗ Error: {skill["name"]} - {e}')

print(f'\n✅ Total skills added: {added}')

