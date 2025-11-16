"""Test ElevenLabs API directly"""
import os
import sys
import asyncio
import aiohttp
from dotenv import load_dotenv

load_dotenv()

async def test_elevenlabs():
    api_key = os.getenv("ELEVENLABS_API_KEY")
    print(f"API Key: {api_key[:20]}...")
    print(f"API Key length: {len(api_key)}")

    voice_id = "pNInz6obpgDQGcFmaJgB"  # Adam voice

    async with aiohttp.ClientSession() as session:
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json"
        }

        payload = {
            "text": "Hello, this is a test.",
            "model_id": "eleven_turbo_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True
            }
        }

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        print(f"Calling: {url}")

        try:
            async with session.post(
                url,
                headers=headers,
                json=payload,
                ssl=False,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                print(f"Status: {response.status}")

                if response.status != 200:
                    error_text = await response.text()
                    print(f"Error response: {error_text}")
                else:
                    audio_data = await response.read()
                    print(f"Success! Received {len(audio_data)} bytes of audio")

        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_elevenlabs())
