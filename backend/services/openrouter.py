"""
OpenRouter API integration service
"""
import aiohttp
import logging
from typing import List, Dict, Optional
from config import config

logger = logging.getLogger(__name__)


class OpenRouterService:
    """Service for interacting with OpenRouter API"""

    def __init__(self):
        self.base_url = "https://openrouter.ai/api/v1"
        self.api_key = config.OPENROUTER_API_KEY

    async def get_available_models(self, max_price_per_million: float = 0.5) -> Dict:
        """
        Get list of available AI models from OpenRouter

        Args:
            max_price_per_million: Maximum price per 1M tokens (default 0.5)

        Returns:
            Dict with models list and counts
        """
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "HTTP-Referer": config.APP_URL,
                "X-Title": "AI Debate Platform"
            }

            async with session.get(
                f"{self.base_url}/models",
                headers=headers,
                ssl=False,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                response.raise_for_status()
                data = await response.json()

                # Filter and format models
                models = []
                for model in data.get('data', []):
                    # Calculate total price per million tokens
                    pricing = model.get('pricing', {})
                    input_price = float(pricing.get('prompt', 0))
                    output_price = float(pricing.get('completion', 0))
                    total_per_million = (input_price + output_price) * 1_000_000

                    is_free = total_per_million == 0

                    # Filter by price
                    if total_per_million > max_price_per_million and not is_free:
                        continue

                    models.append({
                        'id': model.get('id'),
                        'name': model.get('name', model.get('id')),
                        'provider': self._extract_provider(model.get('id', '')),
                        'description': model.get('description', ''),
                        'pricing': {
                            'input': input_price,
                            'output': output_price,
                            'total_per_million': total_per_million
                        },
                        'is_free': is_free,
                        'context_length': model.get('context_length', 0),
                        'max_output_tokens': model.get('top_provider', {}).get('max_completion_tokens', 4096),
                        'supported': True
                    })

                # Sort: free models first, then by price
                models.sort(key=lambda x: (not x['is_free'], x['pricing']['total_per_million']))

                free_count = sum(1 for m in models if m['is_free'])
                paid_count = len(models) - free_count

                return {
                    'models': models,
                    'total_count': len(models),
                    'free_count': free_count,
                    'paid_count': paid_count
                }

    def _extract_provider(self, model_id: str) -> str:
        """Extract provider name from model ID"""
        parts = model_id.split('/')
        if len(parts) >= 1:
            provider = parts[0]
            # Map common providers to friendly names
            provider_map = {
                'google': 'Google',
                'meta-llama': 'Meta',
                'anthropic': 'Anthropic',
                'openai': 'OpenAI',
                'mistralai': 'Mistral AI',
                'deepseek': 'DeepSeek',
                'qwen': 'Alibaba',
                'cohere': 'Cohere'
            }
            return provider_map.get(provider, provider.title())
        return "Unknown"

    def get_model_info(self, model_id: str) -> Dict:
        """Get model information"""
        # Parse model ID to extract provider and name
        parts = model_id.split('/')
        if len(parts) >= 2:
            provider = parts[0].title()
            model_name = ' '.join(parts[1].split('-')).title()
        else:
            provider = "Unknown"
            model_name = model_id

        return {
            'model_id': model_id,
            'name': model_name,
            'provider': provider
        }

    async def generate_response(
        self,
        model_id: str,
        market_question: str,
        market_description: str,
        context: List[Dict],
        round_num: int
    ) -> Dict:
        """
        Generate AI response for debate

        Args:
            model_id: AI model ID
            market_question: Market question to debate
            market_description: Market description with details
            context: Previous messages in the debate
            round_num: Current round number

        Returns:
            Dict with response content
        """
        # Build system prompt
        system_prompt = f"""You are participating in a structured debate about a prediction market.

Market Question: {market_question}

Market Description: {market_description}

Instructions:
- This is round {round_num} of the debate
- Provide your argument in EXACTLY ONE SENTENCE
- Be concise and substantive
- Make a clear point about the market outcome
- Build upon or respond to previous arguments if applicable"""

        # Build messages array
        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Add context from previous messages
        for msg in context:
            messages.append({
                "role": "assistant",
                "content": f"[{msg['model_name']}]: {msg['text']}"
            })

        # Add user prompt for this round
        if round_num == 1 and not context:
            user_prompt = "Provide your opening argument on this prediction market."
        else:
            user_prompt = f"Provide your argument for round {round_num}, considering the previous discussion."

        messages.append({"role": "user", "content": user_prompt})

        # Make API call to OpenRouter
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "HTTP-Referer": config.APP_URL,
                "X-Title": "AI Debate Platform",
                "Content-Type": "application/json"
            }

            payload = {
                "model": model_id,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 100
            }

            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                ssl=False,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                response.raise_for_status()
                data = await response.json()

                # Log the full response for debugging
                logger.debug(f"OpenRouter response for {model_id}: {data}")

                # Check if response has expected structure
                if 'error' in data:
                    error_msg = data['error'].get('message', str(data['error']))
                    logger.error(f"OpenRouter API error for {model_id}: {error_msg}")
                    raise Exception(f"OpenRouter API error: {error_msg}")

                if 'choices' not in data or not data['choices']:
                    logger.error(f"No choices in response for {model_id}: {data}")
                    raise Exception("OpenRouter returned no choices in response")

                choice = data['choices'][0]
                if 'message' not in choice or 'content' not in choice['message']:
                    logger.error(f"Invalid response structure for {model_id}: {data}")
                    raise Exception("OpenRouter response missing message content")

                content = choice['message']['content']

                if not content:
                    logger.warning(f"Empty content from {model_id}")
                    raise Exception("OpenRouter returned empty content")

                return {
                    'content': content,
                    'model': model_id,
                    'tokens': data.get('usage', {})
                }


# Global instance
openrouter_service = OpenRouterService()
