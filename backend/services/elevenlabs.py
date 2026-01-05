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
            logger.debug(f"ElevenLabs API key configured: {self.api_key[:10]}...")
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
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "audio/mpeg",
                    "Accept-Language": "en-US,en;q=0.9"
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
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    logger.info(f"Response status: {response.status}")
                    
                    # Handle voice limit error (400) by trying a fallback voice
                    if response.status == 400:
                        error_text = await response.text()
                        logger.error(f"API error response: {error_text}")
                        
                        if 'voice_limit_reached' in error_text:
                            logger.warning(f"Voice limit reached for {voice_id}, trying fallback voice")
                            # Try using the first available voice as fallback
                            fallback_voice_id = self.available_voices[0]
                            logger.info(f"Retrying with fallback voice: {fallback_voice_id}")
                            
                            # Retry with fallback voice (headers already have User-Agent from above)
                            fallback_url = f"{self.base_url}/text-to-speech/{fallback_voice_id}"
                            async with session.post(
                                fallback_url,
                                headers=headers,
                                json=payload,
                                timeout=aiohttp.ClientTimeout(total=30)
                            ) as fallback_response:
                                logger.info(f"Fallback response status: {fallback_response.status}")
                                if fallback_response.status == 200:
                                    # Success with fallback voice
                                    audio_data = await fallback_response.read()
                                    audio_path = os.path.join(config.AUDIO_DIR, f"{message_id}.mp3")
                                    
                                    with open(audio_path, 'wb') as f:
                                        f.write(audio_data)
                                    
                                    word_count = len(text.split())
                                    estimated_duration = (word_count / 150) * 60
                                    
                                    logger.info(f"Generated audio with fallback voice for message {message_id}: {len(audio_data)} bytes")
                                    
                                    return {
                                        'audio_url': f"/api/audio/{message_id}.mp3",
                                        'audio_duration': round(estimated_duration, 1),
                                        'voice_id': fallback_voice_id,
                                        'audio_file_size': len(audio_data),
                                        'used_fallback': True
                                    }
                                else:
                                    # Fallback also failed - will be caught by exception handler
                                    fallback_error = await fallback_response.text()
                                    logger.error(f"Fallback voice also failed: {fallback_error}")
                                    fallback_response.raise_for_status()
                    
                    # Handle quota exceeded error (401) - return gracefully without audio
                    if response.status == 401:
                        error_text = await response.text()
                        logger.error(f"API error response: {error_text}")
                        
                        if 'quota_exceeded' in error_text:
                            logger.warning(f"ElevenLabs quota exceeded - audio generation skipped for message {message_id}")
                            return {
                                'audio_url': None,
                                'audio_duration': 0,
                                'voice_id': voice_id,
                                'error': 'ElevenLabs quota exceeded - please add credits to your account'
                            }
                    
                    # For non-200 responses (other than handled 400/401), raise error
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"API error response: {error_text}")
                        response.raise_for_status()

                    # Success - save audio file
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
            error_message = str(e.message) if hasattr(e, 'message') and e.message else ''
            if error_message:
                logger.error(f"Error details: {error_message}")
            
            if e.status == 401:
                # Check if it's quota exceeded or invalid API key
                if 'quota_exceeded' in error_message.lower():
                    logger.error("ElevenLabs quota exceeded - please add credits to your account")
                    return {
                        'audio_url': None,
                        'audio_duration': 0,
                        'voice_id': voice_id,
                        'error': 'ElevenLabs quota exceeded - please add credits to your account'
                    }
                else:
                    logger.error("ElevenLabs API returned 401 - Check your API key in .env file (ELEVENLABS_API_KEY). This usually means: 1) Invalid API key, 2) Quota exceeded, or 3) Wrong API key is being used.")
                    return {
                        'audio_url': None,
                        'audio_duration': 0,
                        'voice_id': voice_id,
                        'error': 'Invalid API key - check ELEVENLABS_API_KEY in .env'
                    }
            elif e.status == 429:
                return {
                    'audio_url': None,
                    'audio_duration': 0,
                    'voice_id': voice_id,
                    'error': 'Rate limit exceeded'
                }
            elif e.status == 400:
                # Check if it's a voice limit error
                error_text = str(e.message) if hasattr(e, 'message') else ''
                if 'voice_limit_reached' in error_text:
                    logger.warning(f"Voice limit reached for {voice_id}, audio generation skipped")
                    return {
                        'audio_url': None,
                        'audio_duration': 0,
                        'voice_id': voice_id,
                        'error': 'Voice limit reached - using fallback voice failed'
                    }
                else:
                    return {
                        'audio_url': None,
                        'audio_duration': 0,
                        'voice_id': voice_id,
                        'error': f'API error: {e.status}'
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
