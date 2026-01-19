-- Migration: Add trending skills from browser-use marketplace
-- Run this in Supabase SQL Editor

-- Insert trending marketplace skills
INSERT INTO skills (
    id,
    name,
    description,
    category,
    is_public,
    author_user_id,
    average_rating,
    ratings_count,
    import_count,
    fork_count,
    prompt_template,
    default_config,
    tags
) VALUES
-- 1. Meta Ads Library (133 clones - most popular)
(
    gen_random_uuid(),
    'Meta Ads Library Scraper',
    'Retrieve Meta Ads Library data based on search keywords. Find competitor ads, creative strategies, and advertising insights from Facebook and Instagram.',
    'lead_generation',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.8,
    89,
    133,
    45,
    'Search the Meta Ads Library for ads related to: {{keywords}}. Extract ad creative text, images, advertiser name, start date, and platform (Facebook/Instagram).',
    '{"max_results": 50, "platforms": ["facebook", "instagram"]}',
    ARRAY['meta', 'facebook', 'instagram', 'ads', 'marketing', 'competitor-analysis']
),
-- 2. Google Trends Extractor (104 clones)
(
    gen_random_uuid(),
    'Google Trends Extractor',
    'Extracts real-time trending search data from Google Trends based on Country Code. Get insights on what people are searching for right now.',
    'research',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.7,
    76,
    104,
    38,
    'Extract trending searches from Google Trends for country: {{country_code}}. Return the top {{count}} trending topics with their search volume and related queries.',
    '{"country_code": "US", "count": 20, "category": "all"}',
    ARRAY['google', 'trends', 'seo', 'market-research', 'analytics']
),
-- 3. TikTok Profile Scraper (101 clones)
(
    gen_random_uuid(),
    'TikTok Profile Scraper',
    'Extracts TikTok profile information including follower count, following, likes, bio, and recent video stats. Perfect for influencer research.',
    'social_media',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.6,
    72,
    101,
    35,
    'Scrape TikTok profile for username: {{username}}. Extract follower count, following count, total likes, bio, verified status, and last 10 videos with engagement metrics.',
    '{"include_videos": true, "video_count": 10}',
    ARRAY['tiktok', 'social-media', 'influencer', 'analytics', 'engagement']
),
-- 4. Tech Jobs with Stapply Map (34 clones)
(
    gen_random_uuid(),
    'Tech Jobs Navigator',
    'Fetches real-time tech job listings with advanced filtering by location, salary, experience level, and tech stack. Aggregates from multiple job boards.',
    'jobs',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.5,
    28,
    34,
    12,
    'Search for {{job_title}} jobs in {{location}}. Filter by: experience level {{experience}}, salary range {{salary_range}}, remote: {{remote}}. Return job title, company, salary, requirements, and apply link.',
    '{"experience": "any", "remote": true, "salary_range": "any"}',
    ARRAY['jobs', 'tech', 'career', 'remote-work', 'hiring']
),
-- 5. YCombinator Company Details (33 clones)
(
    gen_random_uuid(),
    'YC Company Insights',
    'Extracts company and founder data, funding status, and LinkedIn profiles from Y Combinator directory. Great for startup research and investor outreach.',
    'research',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.7,
    26,
    33,
    14,
    'Search YCombinator directory for companies in: {{industry}} from batch: {{batch}}. Extract company name, founders, funding stage, description, website, and founder LinkedIn profiles.',
    '{"batch": "any", "industry": "any", "include_linkedin": true}',
    ARRAY['ycombinator', 'startups', 'venture-capital', 'founders', 'research']
),
-- 6. Amazon Product Fetcher (26 clones)
(
    gen_random_uuid(),
    'Amazon Product Analyzer',
    'Returns structured Amazon product details based on search queries. Get pricing, reviews, ratings, and competitive insights.',
    'ecommerce',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.4,
    21,
    26,
    9,
    'Search Amazon for: {{search_query}}. Extract product name, price, rating, review count, Prime eligibility, seller info, and product ASIN for the top {{count}} results.',
    '{"count": 20, "sort_by": "relevance", "prime_only": false}',
    ARRAY['amazon', 'ecommerce', 'product-research', 'pricing', 'reviews']
),
-- 7. Instagram Profile Posts (24 clones)
(
    gen_random_uuid(),
    'Instagram Post Extractor',
    'Retrieves a specified number of posts from any given Instagram profile. Get captions, engagement metrics, and media URLs.',
    'social_media',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.5,
    19,
    24,
    8,
    'Extract the last {{count}} posts from Instagram profile: {{username}}. Include caption, like count, comment count, post date, and media type for each post.',
    '{"count": 12, "include_reels": true}',
    ARRAY['instagram', 'social-media', 'content', 'influencer', 'engagement']
),
-- 8. YouTube Playlist Scraper (24 clones)
(
    gen_random_uuid(),
    'YouTube Playlist Analyzer',
    'Automated tool to extract video details and metadata from YouTube playlists. Perfect for content research and competitor analysis.',
    'social_media',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.6,
    18,
    24,
    7,
    'Analyze YouTube playlist: {{playlist_url}}. Extract all video titles, view counts, like counts, duration, upload dates, and channel info.',
    '{"include_descriptions": true, "include_thumbnails": false}',
    ARRAY['youtube', 'video', 'content', 'analytics', 'research']
),
-- 9. Google Ads Transparency (19 clones)
(
    gen_random_uuid(),
    'Google Ads Transparency Scraper',
    'Extracts all ads run by a specific advertiser from Google Ads Transparency Center. Uncover competitor advertising strategies.',
    'marketing',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.5,
    15,
    19,
    6,
    'Search Google Ads Transparency Center for advertiser: {{advertiser_name}}. Extract all active ads with creative text, format, date range, and targeting regions.',
    '{"date_range": "last_30_days", "ad_format": "all"}',
    ARRAY['google-ads', 'advertising', 'competitor-analysis', 'marketing', 'ppc']
),
-- 10. Cheap Flight Finder (18 clones)
(
    gen_random_uuid(),
    'Flight Deal Hunter',
    'Finds the cheapest flights using Aviasales with detailed itinerary info and booking URLs. Perfect for travel planning and deal hunting.',
    'travel',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.4,
    14,
    18,
    5,
    'Search for flights from {{origin}} to {{destination}} on {{date}}. Find the {{count}} cheapest options with airline, departure time, duration, stops, and booking link.',
    '{"count": 10, "class": "economy", "direct_only": false}',
    ARRAY['travel', 'flights', 'deals', 'booking', 'planning']
),
-- 11. Statista Data Scraper (18 clones)
(
    gen_random_uuid(),
    'Statista Market Intelligence',
    'Extracts comprehensive market data, statistics, and reports from Statista. Get industry insights and research data.',
    'research',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.6,
    14,
    18,
    6,
    'Search Statista for market data on: {{topic}}. Extract statistics, charts data, source information, and publication dates for the most relevant results.',
    '{"max_results": 10, "include_forecasts": true}',
    ARRAY['statista', 'market-research', 'statistics', 'data', 'industry']
),
-- 12. YouTube Filmography (18 clones)
(
    gen_random_uuid(),
    'YouTube Creator Filmography',
    'Retrieves the full filmography and video history for any YouTube creator. Analyze content strategy and performance over time.',
    'social_media',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.5,
    13,
    18,
    5,
    'Get complete video history for YouTube channel: {{channel_url}}. Extract all video titles, publish dates, view counts, and engagement metrics sorted by date.',
    '{"sort_by": "date", "include_shorts": true}',
    ARRAY['youtube', 'content-creator', 'video', 'analytics', 'history']
),
-- 13. Ashby Job Scraper (16 clones)
(
    gen_random_uuid(),
    'Ashby ATS Job Scraper',
    'Retrieves all open job postings from companies using the Ashby ATS. Great for finding startup jobs.',
    'jobs',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.3,
    12,
    16,
    4,
    'Scrape job listings from Ashby careers page: {{company_url}}. Extract job title, department, location, job type, and full job description.',
    '{"include_description": true}',
    ARRAY['jobs', 'ashby', 'ats', 'startups', 'career']
),
-- 14. Linktree Profile Scraper (14 clones)
(
    gen_random_uuid(),
    'Linktree Profile Extractor',
    'Extracts link-in-bio profile data and destination links from Linktree pages. Discover all the links someone shares.',
    'social_media',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.2,
    11,
    14,
    3,
    'Scrape Linktree profile: {{linktree_url}}. Extract profile name, bio, profile image, and all links with their titles and destination URLs.',
    '{"follow_redirects": true}',
    ARRAY['linktree', 'links', 'bio', 'social-media', 'influencer']
),
-- 15. Facebook Group Scraper (14 clones)
(
    gen_random_uuid(),
    'Facebook Group Insights',
    'Extracts posts, comments, and group information from public Facebook groups. Great for community research and trend analysis.',
    'social_media',
    true,
    '00000000-0000-0000-0000-000000000000',
    4.3,
    10,
    14,
    4,
    'Scrape public Facebook group: {{group_url}}. Extract the last {{count}} posts with content, author, reactions, comments, and post date.',
    '{"count": 20, "include_comments": true, "comment_limit": 10}',
    ARRAY['facebook', 'groups', 'community', 'social-media', 'research']
)
ON CONFLICT (id) DO NOTHING;

-- Display confirmation
SELECT 'Successfully added ' || COUNT(*) || ' new marketplace skills' as result
FROM skills
WHERE author_user_id = '00000000-0000-0000-0000-000000000000'
AND is_public = true;
