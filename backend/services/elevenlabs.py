"""
ElevenLabs TTS integration service
"""
import aiohttp
import logging
import os
from typing import Dict, Optional, List
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

        # Available voice IDs to use
        self.available_voices = [
            'DwwuoY7Uz8AP8zrY5TAo',
            'UQoLnPXvf18gaKpLzfb8',
            'flHkNRp1BlvT73UL6gyz',
            'si0svtk05vPEuvwAW93c',
        ]
        
        # Store model-to-voice assignments to ensure consistency within a debate
        self.model_voice_cache = {}

    def get_voice_for_model(self, model_id: str, model_index: Optional[int] = None) -> str:
        """
        Get appropriate voice ID for a model.
        Each model gets a unique voice based on model_id hash, ensuring different voices in debates.
        
        Args:
            model_id: The AI model ID (e.g., 'openai/gpt-4.1-nano')
            model_index: Optional index of the model in the debate (0-3) to ensure unique voices
        
        Returns:
            Voice ID string
        """
        # If model_index is provided, use it directly to assign voices (0-3)
        if model_index is not None and 0 <= model_index < len(self.available_voices):
            voice_id = self.available_voices[model_index % len(self.available_voices)]
            self.model_voice_cache[model_id] = voice_id
            return voice_id
        
        # If we've already assigned a voice to this model, use it (for consistency)
        if model_id in self.model_voice_cache:
            return self.model_voice_cache[model_id]
        
        # Assign voice based on model_id hash for consistent assignment
        import hashlib
        hash_value = int(hashlib.md5(model_id.encode()).hexdigest(), 16)
        voice_id = self.available_voices[hash_value % len(self.available_voices)]
        
        # Cache the assignment
        self.model_voice_cache[model_id] = voice_id
        
        return voice_id
    
    def assign_voices_to_models(self, model_ids: List[str]) -> Dict[str, str]:
        """
        Assign unique voices to a list of models for a debate.
        Ensures each model gets a different voice.
        
        Args:
            model_ids: List of model IDs participating in the debate
        
        Returns:
            Dictionary mapping model_id to voice_id
        """
        assignments = {}
        used_voices = set()
        
        for idx, model_id in enumerate(model_ids):
            # Try to assign voices in order, but skip if already used
            voice_index = idx % len(self.available_voices)
            
            # If this voice is already assigned, find the next available one
            attempts = 0
            while self.available_voices[voice_index] in used_voices and attempts < len(self.available_voices):
                voice_index = (voice_index + 1) % len(self.available_voices)
                attempts += 1
            
            voice_id = self.available_voices[voice_index]
            assignments[model_id] = voice_id
            used_voices.add(voice_id)
            self.model_voice_cache[model_id] = voice_id
        
        return assignments

    async def generate_speech(
        self,
        text: str,
        model_id: str,
        message_id: str,
        model_index: Optional[int] = None
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
            voice_id = self.get_voice_for_model(model_id, model_index=model_index)


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
