"""
Polymarket API integration service
"""
import requests
from typing import List, Dict, Optional
from config import config
from utils.cache import cache


class PolymarketService:
    """Service for interacting with Polymarket Gamma API"""

    def __init__(self):
        self.base_url = config.POLYMARKET_API_URL
        self.session = requests.Session()

    def get_markets(
        self,
        limit: int = 100,
        offset: int = 0,
        category: Optional[str] = None,
        tag_id: Optional[str] = None,
        closed: bool = False
    ) -> Dict:
        """
        Fetch markets from Polymarket

        Args:
            limit: Number of markets to fetch (max 100)
            offset: Pagination offset
            category: Optional category slug filter (e.g., "politics", "sports")
            tag_id: Optional specific tag ID filter
            closed: Include closed markets

        Returns:
            Dict with markets list and pagination info
        """
        # Check cache first
        cache_key = f"markets:{limit}:{offset}:{category}:{tag_id}:{closed}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result

        # Check if this is trending/breaking/new (special categories)
        is_breaking = category and category.lower() == 'breaking'
        is_trending = category and category.lower() == 'trending'
        is_new = category and category.lower() == 'new'

        # Base parameters for all categories
        # All categories use: active=true, frequency=all (no closed filter), sort by 24hr volume
        params = {
            'limit': min(limit, 100),
            'offset': offset,
            'archived': 'false',
            'active': 'true',
            'ascending': 'false'
        }

        # Set sort order based on category
        if is_new:
            # New: sort by newest (ID descending)
            params['order'] = 'id'
        else:
            # All other categories: sort by 24hr volume
            params['order'] = 'volume24hr'

        # Don't set closed filter - show all frequencies (both open and closed markets) for all categories

        # Use tag_slug for category filtering (Polymarket's native approach)
        if category and not is_breaking and not is_trending and not is_new:
            # Map our category names to Polymarket tag slugs
            category_slug_map = {
                'politics': 'politics',
                'sports': 'sports',
                'crypto': 'crypto',
                'business': 'business',
                'science': 'science',
                'technology': 'technology',
                'finance': 'finance',
                'ai': 'ai',
                'world': 'world',
                'geopolitics': 'geopolitics',
                'global-elections': 'global-elections',
                'elections': 'global-elections',
                'economy': 'economy',
                'earnings': 'earnings',
                'culture': 'pop-culture',
                'pop-culture': 'pop-culture'
            }

            tag_slug = category_slug_map.get(category.lower())
            if tag_slug:
                params['tag_slug'] = tag_slug

        # If specific tag_id is provided, use it instead
        if tag_id:
            params['tag_id'] = tag_id

        try:
            # Use different endpoints based on category
            if is_breaking:
                # Breaking uses biggest-movers API (markets with largest price changes)
                response = self.session.get(
                    'https://polymarket.com/api/biggest-movers',
                    timeout=10
                )
                response.raise_for_status()
                biggest_movers_data = response.json()

                # Transform biggest-movers data directly (it already has market info)
                markets = []
                for market in biggest_movers_data.get('markets', [])[:limit]:
                    transformed_market = {
                        'id': market.get('id'),
                        'question': market.get('question'),
                        'description': '',
                        'category': 'Breaking',
                        'tag_id': None,
                        'outcomes': [
                            {
                                'name': 'Yes',
                                'slug': market.get('clobTokenIds', [''])[0] if market.get('clobTokenIds') else '',
                                'price': float(market.get('outcomePrices', [0.5])[0]) if market.get('outcomePrices') else 0.5,
                                'shares': '0'
                            },
                            {
                                'name': 'No',
                                'slug': market.get('clobTokenIds', ['', ''])[1] if len(market.get('clobTokenIds', [])) > 1 else '',
                                'price': float(market.get('outcomePrices', [0.5, 0.5])[1]) if len(market.get('outcomePrices', [])) > 1 else 0.5,
                                'shares': '0'
                            }
                        ],
                        'volume': self._format_volume(market.get('events', [{}])[0].get('volume', 0) if market.get('events') else 0),
                        'end_date': None,
                        'created_date': None,
                        'image_url': market.get('image', '')
                    }
                    markets.append(transformed_market)

                # Return early for breaking
                result = {
                    'markets': markets,
                    'total': len(markets),
                    'offset': offset,
                    'limit': limit,
                    'has_more': False
                }
                cache.set(cache_key, result, ttl=config.CACHE_MARKETS_TTL)
                return result

            elif is_trending or is_new:
                # Trending and New use simple /events endpoint
                # Trending: sorted by 24h volume
                # New: sorted by newest (ID descending)
                response = self.session.get(
                    f'{self.base_url}/events',
                    params=params,
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()  # Returns array directly
            else:
                # For regular categories, use /events/pagination for better filtering
                response = self.session.get(
                    f'{self.base_url}/events/pagination',
                    params=params,
                    timeout=10
                )
                response.raise_for_status()
                response_data = response.json()
                data = response_data.get('data', [])  # Extract data array

            # Transform Polymarket response to our format
            markets = self._transform_markets(data)

            # Remove volume_raw from all markets (internal field only)
            for m in markets:
                m.pop('volume_raw', None)

            result = {
                'markets': markets,
                'total': len(markets),
                'offset': offset,
                'limit': limit,
                'has_more': len(markets) == limit
            }

            # Cache the result
            cache.set(cache_key, result, ttl=config.CACHE_MARKETS_TTL)

            return result

        except requests.exceptions.RequestException as e:
            raise Exception(f"Polymarket API error: {str(e)}")

    def get_market(self, market_id: str) -> Dict:
        """
        Fetch specific market details

        Args:
            market_id: Market ID from Polymarket

        Returns:
            Dict with market details
        """
        # Check cache first
        cache_key = f"market:{market_id}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result

        try:
            response = self.session.get(
                f'{self.base_url}/events/{market_id}',
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            market = self._transform_market_detail(data)

            # Cache the result
            cache.set(cache_key, market, ttl=config.CACHE_MARKET_DETAILS_TTL)

            return market

        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None and e.response.status_code == 404:
                raise Exception(f"Market not found: {market_id}")
            raise Exception(f"Polymarket API error: {str(e)}")

    def get_categories(self) -> List[Dict]:
        """
        Fetch available categories/tags

        Returns:
            List of category dictionaries
        """
        # Check cache first
        cache_key = "categories:all"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result

        try:
            # Get tags from Polymarket
            response = self.session.get(
                f'{self.base_url}/tags',
                timeout=10
            )
            response.raise_for_status()
            tags = response.json()

            categories = self._transform_categories(tags)

            # Cache the result
            cache.set(cache_key, categories, ttl=config.CACHE_CATEGORIES_TTL)

            return categories

        except requests.exceptions.RequestException as e:
            raise Exception(f"Polymarket API error: {str(e)}")

    def _transform_markets(self, data: List[Dict]) -> List[Dict]:
        """Transform Polymarket events to our market format"""
        markets = []

        for event in data:
            # Polymarket events can have multiple markets
            markets_data = event.get('markets', [])

            if not markets_data:
                continue

            # For simplicity, we'll use the event itself as the market
            raw_volume = float(event.get('volume', 0))
            market = {
                'id': event.get('id'),
                'question': event.get('title'),
                'description': event.get('description', ''),
                'category': self._get_category_name(event.get('tags', [])),
                'tag_id': event.get('tags', [None])[0] if event.get('tags') else None,
                'outcomes': self._get_outcomes(markets_data),
                'volume': self._format_volume(raw_volume),
                'volume_raw': raw_volume,  # Keep raw volume for sorting
                'end_date': event.get('endDate'),
                'created_date': event.get('createdAt'),
                'image_url': event.get('image', '')
            }

            markets.append(market)

        return markets

    def _transform_market_detail(self, event: Dict) -> Dict:
        """Transform Polymarket event detail to our format"""
        markets_data = event.get('markets', [])

        return {
            'id': event.get('id'),
            'question': event.get('title'),
            'description': event.get('description', ''),
            'category': self._get_category_name(event.get('tags', [])),
            'tag_id': event.get('tags', [None])[0] if event.get('tags') else None,
            'market_type': 'binary' if len(markets_data) == 2 else 'categorical',
            'outcomes': self._get_outcomes(markets_data),
            'volume': self._format_volume(event.get('volume', 0)),
            'volume_24h': self._format_volume(event.get('volume24hr', 0)),
            'liquidity': self._format_volume(event.get('liquidity', 0)),
            'end_date': event.get('endDate'),
            'created_date': event.get('createdAt'),
            'resolution_source': event.get('resolutionSource', ''),
            'image_url': event.get('image', '')
        }

    def _get_outcomes(self, markets: List[Dict]) -> List[Dict]:
        """Extract outcomes from Polymarket markets"""
        outcomes = []

        for market in markets:
            # Handle outcomePrices - can be array or string
            outcome_prices = market.get('outcomePrices', [0.5])
            if isinstance(outcome_prices, str):
                # Parse string like "[0.5, 0.5]" or just use default
                try:
                    import json
                    outcome_prices = json.loads(outcome_prices)
                except:
                    outcome_prices = [0.5]

            price = float(outcome_prices[0]) if outcome_prices else 0.5

            # Handle clobTokenIds similarly
            token_ids = market.get('clobTokenIds', [''])
            if isinstance(token_ids, str):
                try:
                    import json
                    token_ids = json.loads(token_ids)
                except:
                    token_ids = ['']

            outcome = {
                'name': market.get('groupItemTitle', market.get('question', '')),
                'slug': token_ids[0] if token_ids else '',
                'price': price,
                'shares': str(market.get('volume', 0))
            }
            outcomes.append(outcome)

        return outcomes

    def _get_category_name(self, tags: List[str]) -> str:
        """Extract category name from tags"""
        if not tags:
            return 'Other'

        # Priority categories (checked first)
        priority_map = {
            'breaking': 'Breaking',
            'trending': 'Trending'
        }

        # Main category map
        category_map = {
            'crypto': 'Crypto',
            'politics': 'Politics',
            'sports': 'Sports',
            'science': 'Science',
            'pop-culture': 'Culture',
            'business': 'Business',
            'technology': 'Technology',
            'finance': 'Finance',
            'ai': 'AI',
            'world': 'World',
            'geopolitics': 'Geopolitics',
            'global-elections': "Elections",
            'economy': 'Economy',
            'earnings': 'Earnings'
        }

        # First, check for priority categories (Breaking News)
        for tag in tags:
            if isinstance(tag, dict):
                tag_label = tag.get('label', '').lower()
                tag_slug = tag.get('slug', '').lower()
            else:
                tag_label = str(tag).lower()
                tag_slug = tag_label

            # Check priority categories first
            for key, value in priority_map.items():
                if key == tag_label or key == tag_slug or key in tag_label or key in tag_slug:
                    return value

        # Then search through ALL tags for main categories
        for tag in tags:
            if isinstance(tag, dict):
                tag_label = tag.get('label', '').lower()
                tag_slug = tag.get('slug', '').lower()
            else:
                tag_label = str(tag).lower()
                tag_slug = tag_label

            # Check main categories
            for key, value in category_map.items():
                if key == tag_label or key == tag_slug or key in tag_label or key in tag_slug:
                    return value

        # If no known category found, return the first tag's label
        first_tag = tags[0]
        if isinstance(first_tag, dict):
            return first_tag.get('label', 'Other').title()
        else:
            return str(first_tag).title() if first_tag else 'Other'

    def _transform_categories(self, tags: List[Dict]) -> List[Dict]:
        """Transform Polymarket tags to categories"""
        categories = []

        for tag in tags:
            category = {
                'id': tag.get('id'),
                'name': tag.get('label', tag.get('id', '')),
                'slug': tag.get('slug', tag.get('id', '')),
                'market_count': tag.get('eventCount', 0),
                'icon_url': ''  # Polymarket doesn't provide icons
            }
            categories.append(category)

        return categories

    def _format_volume(self, volume: float) -> str:
        """Format volume to human-readable string"""
        if volume >= 1_000_000:
            return f"{volume / 1_000_000:.1f}M"
        elif volume >= 1_000:
            return f"{volume / 1_000:.1f}K"
        else:
            return str(int(volume))


# Global instance
polymarket_service = PolymarketService()
