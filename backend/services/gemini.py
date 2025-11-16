"""
Gemini API integration service for AI summarization
"""
import google.generativeai as genai
import logging
from typing import Dict, List, Optional
from config import config

logger = logging.getLogger(__name__)


class GeminiService:
    """Service for interacting with Google Gemini API"""

    def __init__(self):
        """Initialize Gemini API client"""
        if config.GEMINI_API_KEY:
            genai.configure(api_key=config.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(config.GEMINI_MODEL)
            logger.info(f"Gemini API initialized successfully with model: {config.GEMINI_MODEL}")
        else:
            self.model = None
            logger.warning("Gemini API key not configured - summarization will not be available")

    def generate_debate_summary(
        self,
        market_question: str,
        market_description: str,
        outcomes: List[Dict],
        messages: List[Dict],
        models: List[Dict]
    ) -> Optional[Dict]:
        """
        Generate comprehensive summary of debate using Gemini

        Args:
            market_question: The prediction market question
            market_description: Market description
            outcomes: List of market outcomes (e.g., [{"name": "Yes", "price": 0.45}])
            messages: List of all debate messages
            models: List of participating AI models

        Returns:
            Dict with summary structure or None if Gemini not available
        """
        if not self.model:
            logger.warning("Gemini not configured - returning None")
            return None

        try:
            # Build context for Gemini
            prompt = self._build_summary_prompt(
                market_question,
                market_description,
                outcomes,
                messages,
                models
            )

            # Generate summary
            logger.info("Requesting debate summary from Gemini...")
            response = self.model.generate_content(prompt)

            if not response or not response.text:
                logger.error("Empty response from Gemini")
                return None

            logger.info(f"Received summary from Gemini: {len(response.text)} chars")

            # Parse response into structured format
            summary = self._parse_summary_response(response.text, messages, models, outcomes)

            return summary

        except Exception as e:
            logger.error(f"Failed to generate Gemini summary: {type(e).__name__}: {str(e)}")
            return None

    def _build_summary_prompt(
        self,
        market_question: str,
        market_description: str,
        outcomes: List[Dict],
        messages: List[Dict],
        models: List[Dict]
    ) -> str:
        """Build prompt for Gemini to generate debate summary"""

        # Format outcomes
        outcomes_text = ", ".join([f"{o['name']} ({o['price']*100:.1f}%)" for o in outcomes])

        # Format models
        models_text = ", ".join([m['model_name'] for m in models])

        # Format messages by model
        messages_by_model = {}
        for msg in messages:
            model_name = msg['model_name']
            if model_name not in messages_by_model:
                messages_by_model[model_name] = []
            messages_by_model[model_name].append(msg)

        transcript = ""
        for model_name, msgs in messages_by_model.items():
            transcript += f"\n## {model_name}\n\n"
            for msg in msgs:
                round_num = msg['round']
                text = msg['text']
                predictions = msg.get('predictions', {})
                pred_text = ", ".join([f"{k}: {v}%" for k, v in predictions.items()])

                transcript += f"**Round {round_num}:** {text}\n"
                if pred_text:
                    transcript += f"*Predictions: {pred_text}*\n"
                transcript += "\n"

        prompt = f"""You are analyzing an AI debate about a prediction market question.

**Market Question:** {market_question}

**Market Description:** {market_description}

**Outcomes:** {outcomes_text}

**Participating AI Models:** {models_text}

**Full Debate Transcript:**
{transcript}

Please provide a comprehensive analysis in the following JSON format:

{{
  "overall": "A 2-3 sentence summary of the entire debate and its key findings",
  "agreements": [
    "List of key points where all models agreed",
    "Each as a separate string"
  ],
  "disagreements": [
    {{
      "topic": "Topic of disagreement",
      "positions": {{
        "Model Name 1": "Their position description",
        "Model Name 2": "Their position description"
      }}
    }}
  ],
  "consensus": "Overall consensus statement about the likely outcome and confidence level",
  "model_rationales": [
    {{
      "model": "Model Name",
      "final_prediction": {{"Outcome1": percentage, "Outcome2": percentage}},
      "rationale": "Why this model reached this conclusion",
      "key_arguments": ["Key argument 1", "Key argument 2", "Key argument 3"]
    }}
  ]
}}

IMPORTANT:
- Return ONLY valid JSON, no additional text
- Base analysis on actual debate content
- Be specific and cite actual arguments from the transcript
- Extract final predictions from the last round of each model
- Identify real agreements and disagreements, not generic ones
"""

        return prompt

    def _parse_summary_response(
        self,
        response_text: str,
        messages: List[Dict],
        models: List[Dict],
        outcomes: List[Dict]
    ) -> Dict:
        """Parse Gemini response into structured summary"""
        import json
        import re

        try:
            # Try to extract JSON from response
            # Sometimes Gemini wraps JSON in markdown code blocks
            json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group(1)
            else:
                # Try to find raw JSON
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    json_text = json_match.group(0)
                else:
                    json_text = response_text

            summary = json.loads(json_text)

            # Validate structure
            required_keys = ['overall', 'agreements', 'disagreements', 'consensus', 'model_rationales']
            for key in required_keys:
                if key not in summary:
                    logger.warning(f"Missing key '{key}' in Gemini response, adding default")
                    if key == 'overall':
                        summary[key] = "Debate summary not available."
                    elif key == 'consensus':
                        summary[key] = "No clear consensus reached."
                    else:
                        summary[key] = []

            return summary

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini JSON response: {e}")
            logger.error(f"Response text: {response_text[:500]}...")

            # Return fallback structure
            return {
                'overall': response_text[:500] if response_text else "Summary generation failed.",
                'agreements': [],
                'disagreements': [],
                'consensus': "Unable to determine consensus.",
                'model_rationales': [
                    {
                        'model': model['model_name'],
                        'final_prediction': self._extract_final_prediction(model['model_id'], messages, outcomes),
                        'rationale': "Analysis not available.",
                        'key_arguments': []
                    }
                    for model in models
                ]
            }

    def _extract_final_prediction(
        self,
        model_id: str,
        messages: List[Dict],
        outcomes: List[Dict]
    ) -> Dict[str, int]:
        """Extract final prediction from last message of a model"""
        # Find last message from this model
        final_messages = [m for m in messages if m['model_id'] == model_id]
        if not final_messages:
            # Return equal distribution if no messages
            if not outcomes:
                return {}
            # Distribute 100 evenly, handling remainders
            num_outcomes = len(outcomes)
            equal_share = 100 // num_outcomes
            remainder = 100 % num_outcomes
            result = {}
            for i, outcome in enumerate(outcomes):
                # Give remainder to first outcomes
                result[outcome['name']] = equal_share + (1 if i < remainder else 0)
            return result

        last_message = final_messages[-1]
        predictions = last_message.get('predictions', {})

        if predictions:
            return predictions

        # Return equal distribution as fallback
        equal_share = 100 // len(outcomes) if outcomes else 0
        return {o['name']: equal_share for o in outcomes}


# Global instance
gemini_service = GeminiService()
