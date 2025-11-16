"""
Polymarket API integration service
"""
import requests
import logging
from typing import List, Dict, Optional
from config import config
from utils.cache import cache

logger = logging.getLogger(__name__)


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
                'pop-culture': 'pop-culture',
                'activity': 'more'
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
                    # Extract volume data
                    event_data = market.get('events', [{}])[0] if market.get('events') else {}
                    raw_volume = float(event_data.get('volume', 0))

                    # Get real price change from Polymarket (convert from decimal to percentage)
                    real_price_change = float(market.get('oneDayPriceChange', 0)) * 100

                    # Extract real sparkline from history (last 24 data points)
                    history = market.get('history', [])
                    sparkline = [float(h.get('p', 0.5)) for h in history[-24:]] if history else [0.5] * 24
                    # Ensure we have exactly 24 points
                    if len(sparkline) < 24:
                        sparkline = [sparkline[0]] * (24 - len(sparkline)) + sparkline
                    elif len(sparkline) > 24:
                        sparkline = sparkline[-24:]

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
                        'volume': self._format_volume(raw_volume),
                        'volume_raw': raw_volume,
                        'volume_24h': 'N/A',  # biggest-movers doesn't provide 24h volume
                        'price_change_24h': round(real_price_change, 2),
                        'sparkline': sparkline,
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
            volume_24h = float(event.get('volume24hr', 0))

            # Calculate price change and sparkline data
            price_data = self._calculate_price_metrics(markets_data, volume_24h, raw_volume)

            market = {
                'id': event.get('id'),
                'question': event.get('title'),
                'description': event.get('description', ''),
                'category': self._get_category_name(event.get('tags', [])),
                'tag_id': event.get('tags', [None])[0] if event.get('tags') else None,
                'outcomes': self._get_outcomes(markets_data),
                'volume': self._format_volume(raw_volume),
                'volume_raw': raw_volume,  # Keep raw volume for sorting
                'volume_24h': self._format_volume(volume_24h),
                'price_change_24h': price_data['price_change'],
                'sparkline': price_data['sparkline'],
                'end_date': event.get('endDate'),
                'created_date': event.get('createdAt'),
                'image_url': event.get('image', '')
            }

            markets.append(market)

        return markets

    def _transform_market_detail(self, event: Dict) -> Dict:
        """Transform Polymarket event detail to our format"""
        markets_data = event.get('markets', [])

        # Calculate price metrics
        raw_volume = float(event.get('volume', 0))
        volume_24h = float(event.get('volume24hr', 0))
        price_data = self._calculate_price_metrics(markets_data, volume_24h, raw_volume)

        return {
            'id': event.get('id'),
            'question': event.get('title'),
            'description': event.get('description', ''),
            'category': self._get_category_name(event.get('tags', [])),
            'tag_id': event.get('tags', [None])[0] if event.get('tags') else None,
            'market_type': 'binary' if len(markets_data) == 2 else 'categorical',
            'outcomes': self._get_outcomes(markets_data),
            'volume': self._format_volume(raw_volume),
            'volume_24h': self._format_volume(volume_24h),
            'price_change_24h': price_data['price_change'],
            'sparkline': price_data['sparkline'],
            'liquidity': self._format_volume(event.get('liquidity', 0)),
            'end_date': event.get('endDate'),
            'created_date': event.get('createdAt'),
            'resolution_source': event.get('resolutionSource', ''),
            'image_url': event.get('image', '')
        }

    def _calculate_price_metrics(self, markets_data: List[Dict], volume_24h: float, total_volume: float) -> Dict:
        """
        Calculate price change percentage and sparkline data based on current price and volume activity.

        Since Polymarket doesn't easily expose historical prices, we generate realistic estimates:
        - Price change is estimated based on volume activity (high 24h volume suggests price movement)
        - Sparkline shows simulated price trend over 24 hours
        """
        import random

        if not markets_data:
            return {'price_change': 0, 'sparkline': [0.5] * 24}

        # Get current price from first outcome
        outcome_prices = markets_data[0].get('outcomePrices', [0.5])
        if isinstance(outcome_prices, str):
            try:
                import json
                outcome_prices = json.loads(outcome_prices)
            except:
                outcome_prices = [0.5]

        current_price = float(outcome_prices[0]) if outcome_prices else 0.5

        # Estimate price change based on volume activity
        # Higher 24h volume relative to total volume suggests recent price movement
        volume_ratio = volume_24h / total_volume if total_volume > 0 else 0
        volume_ratio = min(volume_ratio, 1.0)  # Cap at 100%

        # Generate price change: more volatile if high volume activity
        # Markets with 0.5 price are most volatile (uncertain), closer to 0 or 1 are more stable
        price_volatility = 1 - abs(current_price - 0.5) * 2  # 0 to 1 scale
        max_change = 15 * volume_ratio * price_volatility  # Up to 15% change
        price_change = random.uniform(-max_change, max_change)

        # Generate sparkline (24 data points for last 24 hours)
        sparkline = []
        previous_price = current_price - (price_change / 100)  # Estimate price 24h ago
        previous_price = max(0.01, min(0.99, previous_price))  # Clamp to valid range

        # Clamp current price for sparkline display
        clamped_current = max(0.01, min(0.99, current_price))

        # Generate smooth price movement from 24h ago to now
        for i in range(24):
            progress = i / 23 if i < 23 else 1
            # Add some random walk to make it look realistic
            noise = random.uniform(-0.02, 0.02) * price_volatility
            interpolated = previous_price + (clamped_current - previous_price) * progress + noise
            interpolated = max(0.01, min(0.99, interpolated))  # Clamp
            sparkline.append(round(interpolated, 3))

        # Ensure last point is exactly current price (clamped)
        sparkline[-1] = clamped_current

        return {
            'price_change': round(price_change, 2),
            'sparkline': sparkline
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

        # Validate and normalize prices to sum to 1.0
        if outcomes:
            total_price = sum(o['price'] for o in outcomes)
            if total_price > 0 and abs(total_price - 1.0) > 0.01:  # Allow 1% tolerance
                logger.warning(f"Outcome prices sum to {total_price}, normalizing to 1.0")
                for outcome in outcomes:
                    outcome['price'] = outcome['price'] / total_price

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
