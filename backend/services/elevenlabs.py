"""
ElevenLabs TTS integration service
"""
import aiohttp
import logging
import os
from typing import Dict, Optional
from config import config

logger = logging.getLogger(__name__)


class ElevenLabsService:
    """Service for text-to-speech using ElevenLabs API"""

    def __init__(self):
        self.base_url = "https://api.elevenlabs.io/v1"
        self.api_key = config.ELEVENLABS_API_KEY
        if self.api_key:
            # Log first few chars for debugging (don't log full key)
            logger.info(f"ElevenLabs API key configured: {self.api_key[:10]}...")
        else:
            logger.warning("ElevenLabs API key not found in environment variables")

        # Map model names to different voices for variety
        self.voice_map = {
            'default': 'pNInz6obpgDQGcFmaJgB',  # Adam - deep, calm
            'google': '21m00Tcm4TlvDq8ikWAM',   # Rachel - soft, warm
            'deepseek': 'AZnzlk1XvdvUeBnXmlld',  # Domi - strong, confident
            'meta': 'EXAVITQu4vr4xnSDxMaL',      # Bella - gentle
            'anthropic': 'ErXwobaYiN019PkySvjV',  # Antoni - well-rounded
            'openai': 'MF3mGyEYCl7XYWbV9V6O',    # Elli - youthful
            'mistral': 'TxGEqnHWrfWFTfGW9XjX',   # Josh - deep
            'qwen': 'VR6AewLTigWG4xSOukaG',      # Arnold - crisp
            'cohere': 'pqHfZKP75CvOlQylNhV4',    # Bill - documentary
        }

    def get_voice_for_model(self, model_id: str) -> str:
        """Get appropriate voice ID for a model"""
        # Extract provider from model ID
        provider = model_id.split('/')[0].lower() if '/' in model_id else 'default'

        # Return mapped voice or default
        return self.voice_map.get(provider, self.voice_map['default'])

    async def generate_speech(
        self,
        text: str,
        model_id: str,
        message_id: str
    ) -> Dict:
        """
        Generate speech audio from text

        Args:
            text: Text to convert to speech
            model_id: Model ID to determine voice
            message_id: Unique message ID for audio file naming

        Returns:
            Dict with audio file path and metadata
        """
        if not self.api_key:
            logger.warning("ElevenLabs API key not configured, skipping audio generation")
            return {
                'audio_url': None,
                'audio_duration': 0,
                'voice_id': None,
                'error': 'API key not configured'
            }

        try:
            voice_id = self.get_voice_for_model(model_id)


            # Truncate text if too long (ElevenLabs has character limits)
            max_chars = 500
            if len(text) > max_chars:
                text = text[:max_chars] + "..."
                logger.info(f"Truncated text to {max_chars} characters for TTS")

            async with aiohttp.ClientSession() as session:
                headers = {
                    "xi-api-key": self.api_key,
                    "Content-Type": "application/json"
                }

                payload = {
                    "text": text,
                    "model_id": "eleven_turbo_v2",  # Fast turbo model
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                        "style": 0.0,
                        "use_speaker_boost": True
                    }
                }

                url = f"{self.base_url}/text-to-speech/{voice_id}"
                logger.info(f"Calling ElevenLabs API: {url}")

                async with session.post(
                    url,
                    headers=headers,
                    json=payload,
                    ssl=False,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    logger.info(f"Response status: {response.status}")
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"API error response: {error_text}")
                    response.raise_for_status()

                    # Save audio file
                    audio_data = await response.read()
                    audio_path = os.path.join(config.AUDIO_DIR, f"{message_id}.mp3")

                    with open(audio_path, 'wb') as f:
                        f.write(audio_data)

                    # Estimate duration (rough estimate: ~150 words per minute)
                    word_count = len(text.split())
                    estimated_duration = (word_count / 150) * 60  # in seconds

                    logger.info(f"Generated audio for message {message_id}: {len(audio_data)} bytes")

                    return {
                        'audio_url': f"/api/audio/{message_id}.mp3",
                        'audio_duration': round(estimated_duration, 1),
                        'voice_id': voice_id,
                        'audio_file_size': len(audio_data)
                    }

        except aiohttp.ClientResponseError as e:
            logger.error(f"ElevenLabs API error: {e.status} - {e.message}")
            if hasattr(e, 'message') and e.message:
                logger.error(f"Error details: {e.message}")
            if e.status == 401:
                logger.error("ElevenLabs API returned 401 - Check your API key in .env file (ELEVENLABS_API_KEY). This usually means: 1) Invalid API key, 2) Quota exceeded, or 3) Wrong API key is being used.")
                return {
                    'audio_url': None,
                    'audio_duration': 0,
                    'voice_id': voice_id,
                    'error': 'Invalid API key or quota exceeded - check ELEVENLABS_API_KEY in .env'
                }
            elif e.status == 429:
                return {
                    'audio_url': None,
                    'audio_duration': 0,
                    'voice_id': voice_id,
                    'error': 'Rate limit exceeded'
                }
            else:
                return {
                    'audio_url': None,
                    'audio_duration': 0,
                    'voice_id': voice_id,
                    'error': f'API error: {e.status}'
                }
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            return {
                'audio_url': None,
                'audio_duration': 0,
                'voice_id': None,
                'error': str(e)
            }


# Global instance
elevenlabs_service = ElevenLabsService()
