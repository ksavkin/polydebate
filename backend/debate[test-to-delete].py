#!/usr/bin/env python3
"""
AI Model Debate Script using OpenRouter
Allows users to input a topic and watch different AI models debate it.
"""

import os
import requests
from typing import List, Dict
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class AIDebate:
    def __init__(self, api_key: str = None):
        """Initialize the debate with OpenRouter API credentials."""
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable must be set")

        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Debate Platform",
            "Content-Type": "application/json"
        }

        # Define different models with distinct personalities
        self.debaters = [
            {
                "name": "Google: Gemma 3 27B (free)",
                "model": "google/gemma-3-27b-it:free",
                "personality": "You are a thoughtful, balanced debater who considers multiple perspectives. Be concise and direct - keep responses to 2-4 sentences max.",
                "color": "\033[94m"  # Blue
            },
            {
                "name": "OpenAI: gpt-oss-20b (free)",
                "model": "openai/gpt-oss-20b:free",
                "personality": "You are an analytical debater who focuses on logical reasoning and evidence. Be concise and direct - keep responses to 2-4 sentences max.",
                "color": "\033[92m"  # Green
            },
            {
                "name": "Mistral: Mistral 7B Instruct (free)",
                "model": "mistralai/mistral-7b-instruct:free",
                "personality": "You are a creative thinker who brings innovative perspectives and challenges conventional wisdom. Be concise and direct - keep responses to 2-4 sentences max.",
                "color": "\033[93m"  # Yellow
            }
        ]

        self.debate_history: List[Dict] = []
        self.reset_color = "\033[0m"

    def get_model_response(self, model: str, system_prompt: str, user_prompt: str, max_tokens: int = 200) -> str:
        """Get a response from a specific model via OpenRouter."""
        try:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": max_tokens,
                "temperature": 0.7
            }

            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=60
            )
            response.raise_for_status()

            data = response.json()
            return data['choices'][0]['message']['content']

        except requests.exceptions.RequestException as e:
            return f"Error getting response: {str(e)}"
        except KeyError as e:
            return f"Error parsing response: {str(e)}"

    def format_debate_context(self) -> str:
        """Format the debate history for context."""
        if not self.debate_history:
            return "This is the beginning of the debate."

        context = "Here's what has been said so far:\n\n"
        for entry in self.debate_history:
            context += f"{entry['debater']}: {entry['response']}\n\n"
        return context

    def conduct_debate(self, topic: str, rounds: int = 3):
        """Conduct a multi-round debate on the given topic."""
        print(f"\n{'='*80}")
        print(f"DEBATE TOPIC: {topic}")
        print(f"{'='*80}\n")
        print("Participants:")
        for debater in self.debaters:
            print(f"  {debater['color']}- {debater['name']}{self.reset_color}")
        print()

        for round_num in range(1, rounds + 1):
            print(f"\n{'-'*80}")
            print(f"ROUND {round_num}")
            print(f"{'-'*80}\n")

            for debater in self.debaters:
                # Build the prompt with context
                context = self.format_debate_context()

                if round_num == 1:
                    user_prompt = f"""Topic for debate: {topic}

Provide your opening argument in 2-4 concise sentences. Be direct and impactful."""
                else:
                    user_prompt = f"""Topic for debate: {topic}

{context}

Respond to the points made above in 2-4 concise sentences. Be direct and add new perspectives."""

                system_prompt = f"""{debater['personality']}

You are participating in a debate with other AI models. Make sharp, focused points that challenge ideas constructively.

CRITICAL: Keep responses SHORT - maximum 2-4 sentences. No lengthy explanations."""

                # Get response
                print(f"{debater['color']}{debater['name']}:{self.reset_color}")
                response = self.get_model_response(
                    debater['model'],
                    system_prompt,
                    user_prompt
                )
                print(f"{response}\n")

                # Store in history
                self.debate_history.append({
                    "debater": debater['name'],
                    "response": response,
                    "round": round_num
                })

                # Small delay to avoid rate limiting
                time.sleep(1)

        print(f"\n{'='*80}")
        print("DEBATE CONCLUDED")
        print(f"{'='*80}\n")

    def save_debate(self, filename: str = None):
        """Save the debate transcript to a file."""
        if not filename:
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = f"debate_{timestamp}.txt"

        filepath = os.path.join(os.path.dirname(__file__), filename)

        with open(filepath, 'w') as f:
            f.write("AI MODEL DEBATE TRANSCRIPT\n")
            f.write("="*80 + "\n\n")

            current_round = 0
            for entry in self.debate_history:
                if entry['round'] != current_round:
                    current_round = entry['round']
                    f.write(f"\nROUND {current_round}\n")
                    f.write("-"*80 + "\n\n")

                f.write(f"{entry['debater']}:\n")
                f.write(f"{entry['response']}\n\n")

        print(f"Debate transcript saved to: {filepath}")


def main():
    """Main function to run the debate."""
    print("\n" + "="*80)
    print("AI MODEL DEBATE PLATFORM")
    print("="*80)
    print("\nThis tool allows different AI models to debate a topic of your choice.")
    print("Each model has a distinct personality and approach to the discussion.\n")

    # Get topic from user
    topic = input("Enter the debate topic: ").strip()

    if not topic:
        print("No topic provided. Exiting.")
        return

    # Get number of rounds
    try:
        rounds_input = input("Enter number of debate rounds (default 3): ").strip()
        rounds = int(rounds_input) if rounds_input else 3
        rounds = max(1, min(rounds, 10))  # Limit between 1-10 rounds
    except ValueError:
        rounds = 3
        print("Invalid input. Using default of 3 rounds.")

    # Check for API key
    if not os.environ.get("OPENROUTER_API_KEY"):
        print("\nError: OPENROUTER_API_KEY environment variable not set.")
        print("Please set it in a .env file or export it:")
        print("  export OPENROUTER_API_KEY='your-api-key'")
        print("\nGet your API key at: https://openrouter.ai/keys")
        return

    try:
        # Create debate instance and run
        debate = AIDebate()
        debate.conduct_debate(topic, rounds)

        # Ask if user wants to save
        save = input("\nWould you like to save the debate transcript? (y/n): ").strip().lower()
        if save == 'y':
            filename = input("Enter filename (press Enter for auto-generated name): ").strip()
            debate.save_debate(filename if filename else None)

    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return


if __name__ == "__main__":
    main()
