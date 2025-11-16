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
        tag_id: Optional[str] = None,
        closed: bool = False
    ) -> Dict:
        """
        Fetch markets from Polymarket

        Args:
            limit: Number of markets to fetch (max 100)
            offset: Pagination offset
            tag_id: Optional category tag filter
            closed: Include closed markets

        Returns:
            Dict with markets list and pagination info
        """
        # Check cache first
        cache_key = f"markets:{limit}:{offset}:{tag_id}:{closed}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result

        params = {
            'limit': min(limit, 100),
            'offset': offset,
            'closed': 'true' if closed else 'false',
            'order': 'id',
            'ascending': 'false'
        }

        if tag_id:
            params['tag_id'] = tag_id

        try:
            response = self.session.get(
                f'{self.base_url}/events',
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            # Transform Polymarket response to our format
            markets = self._transform_markets(data)

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
            market = {
                'id': event.get('id'),
                'question': event.get('title'),
                'description': event.get('description', ''),
                'category': self._get_category_name(event.get('tags', [])),
                'tag_id': event.get('tags', [None])[0] if event.get('tags') else None,
                'outcomes': self._get_outcomes(markets_data),
                'volume': self._format_volume(event.get('volume', 0)),
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
        # Map tag IDs to category names
        category_map = {
            'crypto': 'Crypto',
            'politics': 'Politics',
            'sports': 'Sports',
            'science': 'Science',
            'pop-culture': 'Pop Culture',
            'business': 'Business',
            'technology': 'Technology'
        }

        if not tags:
            return 'Other'

        # Tags can be strings or dicts - handle both
        first_tag = tags[0]
        if isinstance(first_tag, dict):
            first_tag = first_tag.get('label', first_tag.get('id', '')).lower()
        else:
            first_tag = str(first_tag).lower()

        for key, value in category_map.items():
            if key in first_tag:
                return value

        return first_tag.title() if first_tag else 'Other'

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
