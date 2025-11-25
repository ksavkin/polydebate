"""
OpenRouter API integration service
"""
import aiohttp
import asyncio
import logging
from typing import List, Dict, Optional
from config import config

logger = logging.getLogger(__name__)


class OpenRouterService:
    """Service for interacting with OpenRouter API"""

    def __init__(self):
        self.base_url = "https://openrouter.ai/api/v1"
        self.api_key = config.OPENROUTER_API_KEY

    async def get_available_models(self, max_price_per_million: float = 15) -> Dict:
        """
        Get list of available AI models from OpenRouter

        Returns whitelisted models filtered by price.

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

                # Get allowed models from config
                allowed_models = set(config.ALLOWED_MODELS)
                logger.info(f"Allowed models whitelist: {allowed_models}")

                # Filter and format models
                models = []
                filtered_by_price = []
                filtered_by_whitelist = 0

                for model in data.get('data', []):
                    model_id = model.get('id', '')

                    # Filter by whitelist
                    if model_id not in allowed_models:
                        filtered_by_whitelist += 1
                        continue

                    # Calculate total price per million tokens
                    pricing = model.get('pricing', {})
                    input_price = float(pricing.get('prompt', 0))
                    output_price = float(pricing.get('completion', 0))
                    total_per_million = (input_price + output_price) * 1_000_000

                    is_free = total_per_million == 0

                    # Filter by price
                    if total_per_million > max_price_per_million and not is_free:
                        filtered_by_price.append({
                            'id': model_id,
                            'price': total_per_million
                        })
                        logger.info(f"Filtered by price: {model_id} (${total_per_million:.2f} per million, max=${max_price_per_million})")
                        continue

                    logger.info(f"Accepted model: {model_id} (${total_per_million:.2f} per million, free={is_free})")

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

                free_count = sum(1 for m in models if m['is_free'])
                paid_count = len(models) - free_count

                logger.info(f"Filtering results: {len(models)} models accepted, {len(filtered_by_price)} filtered by price, {filtered_by_whitelist} filtered by whitelist")
                if filtered_by_price:
                    filtered_names = [f"{item['id']} (${item['price']:.2f})" for item in filtered_by_price]
                    logger.info(f"Models filtered by price (>${max_price_per_million}): {filtered_names}")

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
        outcomes: List[Dict],
        context: List[Dict],
        round_num: int,
        is_final_round: bool = False
    ) -> Dict:
        """
        Generate AI response for debate

        Args:
            model_id: AI model ID
            market_question: Market question to debate
            market_description: Market description with details
            outcomes: Market outcomes with current odds
            context: Previous messages in the debate
            round_num: Current round number

        Returns:
            Dict with response content and predictions
        """
        # Format outcomes for prompt
        outcomes_text = ", ".join([f"{o['name']} (current odds: {o['price']*100:.1f}%)" for o in outcomes])

        # Build system prompt with special instructions for final round
        final_round_instructions = ""
        if is_final_round:
            final_round_instructions = """
- THIS IS THE FINAL ROUND - Make your definitive prediction and final decision
- Synthesize all arguments from the debate to make your most confident prediction
- Your predictions should represent your final stance after considering all perspectives"""

        # Format outcomes as a numbered list for clarity
        outcomes_list = "\n".join([f"{i+1}. {o['name']} (current odds: {o['price']*100:.1f}%)" for i, o in enumerate(outcomes)])
        
        # Create a list of outcome names for reference (exact names to use)
        outcome_names = [o['name'] for o in outcomes]
        outcome_names_json = ", ".join([f'"{name}"' for name in outcome_names])
        
        # Debug: Log what's being sent in the prompt
        logger.info(f"Prompt for {model_id} - Number of outcomes: {len(outcomes)}, Outcome names: {outcome_names}")
        logger.info(f"Outcomes list in prompt:\n{outcomes_list}")
        
        # Create example predictions JSON with actual outcome names
        example_predictions = "{" + ", ".join([f'"{name}": 0.00' for name in outcome_names[:3]]) + (f', ... (include ALL {len(outcomes)} outcomes)' if len(outcomes) > 3 else '') + "}"
        
        system_prompt = f"""You are participating in a structured debate about a prediction market.

Market Question: {market_question}

Market Description: {market_description}

CRITICAL: You MUST provide predictions for ALL outcomes listed below. Use the EXACT outcome names as shown - do NOT create new names or use generic names like "Artist A", "Outcome 1", "An emerging artist", etc.

Required Outcomes (you MUST predict for ALL {len(outcomes)} of these):
{outcomes_list}

EXACT outcome names to use in your predictions JSON (COPY THESE EXACTLY - DO NOT MODIFY):
{outcome_names_json}

WARNING: If you create new outcome names or use generic names instead of the exact names above, your response will be invalid. You MUST use the exact names from the list above.

Instructions:
- This is round {round_num} of the debate{final_round_instructions}
- You MUST respond with VALID JSON in this exact format:
{{
  "argument": "Your 1-2 sentence argument here",
  "predictions": {example_predictions}
}}

CRITICAL REQUIREMENTS - READ CAREFULLY:
1. Your argument should be concise and substantive (1-2 sentences max)
2. You MUST provide predictions for ALL {len(outcomes)} outcomes listed above - NO EXCEPTIONS
3. You MUST use the EXACT outcome names as shown above - copy them exactly, character by character
4. DO NOT use generic names like "Artist A", "Outcome 1", "Option A", etc. - use the actual names from the list
5. DO NOT add new outcomes that are not in the list above
6. DO NOT remove or skip any outcomes from the list above
7. Predictions must be numbers (can include decimals up to 2 decimal places) that sum to exactly 100.00
8. Use specific predictions like 33.21, 55.42, or 10.20 (up to 2 decimal places, no % sign in JSON)
9. All predictions must sum to exactly 100.00 (account for rounding)
10. Base your predictions on your analysis and the current discussion
11. Build upon or respond to previous arguments and predictions if applicable - you can agree, disagree, or adjust based on what others have said
12. If previous messages show predictions from other models, you can reference them and explain why you agree or disagree with their assessment
13. Return ONLY valid JSON, no additional text before or after

Example of correct format (using actual outcome names):
{{
  "argument": "Based on current trends, I predict...",
  "predictions": {{"{outcome_names[0] if outcome_names else 'Outcome1'}": 25.5, "{outcome_names[1] if len(outcome_names) > 1 else 'Outcome2'}": 30.25, ... (include ALL {len(outcomes)} outcomes)}}
}}"""

        # Build messages array
        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Add context from previous messages
        # Include outcome list reminder in EVERY context message to reinforce it
        for msg in context:
            outcome_reminder_in_context = f"\n\n[CRITICAL REMINDER: You MUST use these EXACT outcome names in your predictions JSON - copy them exactly: {outcome_names_json}. DO NOT create new names or use generic names like 'Artist A', 'Outcome 1', etc.]"
            
            # Include predictions if available
            predictions_text = ""
            if msg.get('predictions'):
                predictions = msg['predictions']
                # Format predictions nicely: "Outcome1: 25.5%, Outcome2: 30.25%, ..."
                predictions_list = [f"{name}: {value}%" for name, value in sorted(predictions.items(), key=lambda x: x[1], reverse=True)]
                predictions_text = f"\n\nPredictions: {', '.join(predictions_list)}"
            
            messages.append({
                "role": "assistant",
                "content": f"[{msg['model_name']}]: {msg['text']}{predictions_text}{outcome_reminder_in_context}"
            })

        # Add user prompt for this round - include outcome list as reminder
        outcomes_reminder = f"\n\nRemember: You must provide predictions for ALL {len(outcomes)} outcomes using these EXACT names: {outcome_names_json}"
        
        if round_num == 1 and not context:
            user_prompt = f"Provide your opening argument on this prediction market.{outcomes_reminder}"
        elif is_final_round:
            user_prompt = f"This is the final round. After considering all the arguments and predictions presented in this debate, provide your final prediction and conclusive statement on the market outcome.{outcomes_reminder}"
        else:
            user_prompt = f"Provide your argument for round {round_num}, considering the previous discussion. You can respond to other models' arguments and predictions, explaining why you agree or disagree with their assessments.{outcomes_reminder}"

        messages.append({"role": "user", "content": user_prompt})

        # Make API call to OpenRouter
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "HTTP-Referer": config.APP_URL,
                "X-Title": "AI Debate Platform",
                "Content-Type": "application/json"
            }

            # Calculate max_tokens based on number of outcomes
            # Formula: base (argument + JSON overhead) + (outcomes * tokens per outcome)
            # Base: ~200 tokens for argument (1-2 sentences) + JSON structure (~50 tokens)
            # Per outcome: ~20 tokens per prediction entry ("name": 12.34,)
            # Add 50% buffer for safety
            base_tokens = 250
            tokens_per_outcome = 25
            calculated_max = base_tokens + (len(outcomes) * tokens_per_outcome)
            # Add 50% buffer and round up to nearest 100
            max_tokens = int((calculated_max * 1.5) // 100 * 100 + 100)
            # Set minimum of 1000 and maximum of 4000 (to avoid hitting model limits)
            max_tokens = max(1000, min(max_tokens, 4000))
            
            logger.info(f"Setting max_tokens to {max_tokens} for {len(outcomes)} outcomes (calculated: {calculated_max})")
            
            payload = {
                "model": model_id,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": max_tokens
            }

            # Retry logic for rate limit errors
            max_retries = 3
            retry_delay = 2  # Start with 2 seconds
            last_exception = None
            data = None
            
            for attempt in range(max_retries):
                try:
                    async with session.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=payload,
                        ssl=False,
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as response:
                        # Check for rate limit (429) specifically
                        if response.status == 429:
                            if attempt < max_retries - 1:
                                retry_after = int(response.headers.get('Retry-After', retry_delay))
                                wait_time = max(retry_after, retry_delay * (2 ** attempt))
                                logger.warning(f"Rate limit (429) for {model_id}, attempt {attempt + 1}/{max_retries}. Retrying after {wait_time}s...")
                                await asyncio.sleep(wait_time)
                                continue
                            else:
                                # Last attempt failed, raise the error
                                response.raise_for_status()
                        
                        response.raise_for_status()
                        data = await response.json()
                        break  # Success, exit retry loop
                        
                except aiohttp.ClientResponseError as e:
                    if e.status == 429 and attempt < max_retries - 1:
                        retry_after = int(e.headers.get('Retry-After', retry_delay)) if hasattr(e, 'headers') else retry_delay
                        wait_time = max(retry_after, retry_delay * (2 ** attempt))
                        logger.warning(f"Rate limit (429) for {model_id}, attempt {attempt + 1}/{max_retries}. Retrying after {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        last_exception = e
                        continue
                    else:
                        # Not a retryable error or out of retries
                        raise
                except Exception as e:
                    # Non-HTTP errors, don't retry
                    raise
            else:
                # All retries exhausted
                if last_exception:
                    raise last_exception
                raise Exception(f"Failed to get response from {model_id} after {max_retries} attempts")

            # Log the full response for debugging
            logger.debug(f"OpenRouter response for {model_id}: {data}")

            # Validate data is not None
            if data is None:
                logger.error(f"OpenRouter returned None response for {model_id}")
                raise Exception("OpenRouter returned None response")

            # Check if response has expected structure
            if 'error' in data and data['error'] is not None:
                # Handle error object (could be dict or string)
                if isinstance(data['error'], dict):
                    error_msg = data['error'].get('message', str(data['error']))
                else:
                    error_msg = str(data['error'])
                logger.error(f"OpenRouter API error for {model_id}: {error_msg}")
                raise Exception(f"OpenRouter API error: {error_msg}")

            if 'choices' not in data or not data['choices']:
                logger.error(f"No choices in response for {model_id}: {data}")
                raise Exception("OpenRouter returned no choices in response")

            # Validate choices is a list and not empty
            if not isinstance(data['choices'], list) or len(data['choices']) == 0:
                logger.error(f"Invalid choices structure for {model_id}: {data}")
                raise Exception("OpenRouter returned invalid choices structure")

            choice = data['choices'][0]
            if not isinstance(choice, dict) or 'message' not in choice:
                logger.error(f"Invalid choice structure for {model_id}: {choice}")
                raise Exception("OpenRouter returned invalid choice structure")
            
            message = choice['message']
            if message is None or not isinstance(message, dict):
                logger.error(f"Invalid message structure (None or not dict) for {model_id}: {message}")
                raise Exception("OpenRouter returned invalid message structure")
            
            if 'content' not in message:
                logger.error(f"Message missing content for {model_id}: {message}")
                raise Exception("OpenRouter response missing message content")

            content = message['content']

            if not content:
                logger.warning(f"Empty content from {model_id}")
                raise Exception("OpenRouter returned empty content")

            # Parse JSON response
            import json
            import re

            try:
                # Try to extract JSON from response (may be wrapped in markdown)
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                if json_match:
                    json_text = json_match.group(1)
                else:
                    # Try to find raw JSON
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        json_text = json_match.group(0)
                    else:
                        # No JSON found, treat as plain text
                        logger.warning(f"No JSON found in response from {model_id}, using plain text")
                        # Create default predictions (equal distribution)
                        return {
                            'content': content,
                            'predictions': {},
                            'model': model_id,
                            'tokens': data.get('usage', {})
                        }

                parsed = json.loads(json_text)

                # Extract argument and predictions
                argument = parsed.get('argument', content)
                predictions = parsed.get('predictions', {})

                # Validate predictions sum to 100
                if predictions and sum(predictions.values()) != 100:
                    logger.warning(f"Predictions from {model_id} don't sum to 100: {predictions}")
                    # Normalize to 100
                    total = sum(predictions.values())
                    if total > 0:
                        # Use proper rounding to avoid truncation errors
                        normalized = {k: round(v * 100 / total) for k, v in predictions.items()}
                        # Adjust for rounding errors to ensure sum equals 100
                        diff = 100 - sum(normalized.values())
                        if diff != 0:
                            # Add/subtract difference to the largest value
                            max_key = max(normalized.items(), key=lambda x: x[1])[0]
                            normalized[max_key] += diff
                        predictions = normalized

                return {
                    'content': argument,
                    'predictions': predictions,
                    'model': model_id,
                    'tokens': data.get('usage', {})
                }

            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON from {model_id}: {e}, using plain text")
                return {
                    'content': content,
                    'predictions': {},
                    'model': model_id,
                    'tokens': data.get('usage', {})
                }


# Global instance
openrouter_service = OpenRouterService()
