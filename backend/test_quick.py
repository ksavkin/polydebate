"""
Quick test of debate with 5 working models (non-interactive)
"""
import requests
import json

BASE_URL = "http://localhost:5001/api"

print("=" * 60)
print("QUICK DEBATE TEST - 5 MODELS")
print("=" * 60)

# 1. Get market
print("\n1. Getting market...")
response = requests.get(f"{BASE_URL}/markets")
markets = response.json().get('markets', [])
market_id = markets[1].get('id')
print(f"   ✓ Using: {markets[0].get('question')}")

# 2. Create debate
print("\n2. Creating debate with 5 models...")
payload = {
    "market_id": market_id,
    "model_ids": [
        "openrouter/sherlock-dash-alpha",
        "openrouter/sherlock-think-alpha",
        "kwaipilot/kat-coder-pro:free",
        "nvidia/nemotron-nano-12b-v2-vl:free",
        "nvidia/nemotron-nano-9b-v2:free"
    ],
    "rounds": 1
}

response = requests.post(f"{BASE_URL}/debate/start", json=payload)
debate_data = response.json()
debate_id = debate_data.get('debate_id')
print(f"   ✓ Debate created: {debate_id}")

# 3. Stream debate
print("\n3. Streaming debate...")
print("-" * 60)

response = requests.get(
    f"{BASE_URL}/debate/{debate_id}/stream",
    stream=True,
    headers={"Accept": "text/event-stream"},
    timeout=180
)

messages_count = 0
for line in response.iter_lines():
    if line:
        decoded = line.decode('utf-8')
        if decoded.startswith('event:'):
            event_type = decoded.split(':', 1)[1].strip()
        elif decoded.startswith('data:'):
            data = decoded.split(':', 1)[1].strip()
            try:
                data_json = json.loads(data)
                if event_type == 'message':
                    messages_count += 1
                    model_name = data_json.get('model_name')
                    content = data_json.get('text', '')
                    print(f"✓ Message #{messages_count} from {model_name}")
                    print(f"  {content[:150]}...")
                    print()
                elif event_type == 'error':
                    model_name = data_json.get('model_name')
                    error = data_json.get('error')
                    print(f"❌ Error from {model_name}: {error}")
                elif event_type == 'debate_complete':
                    print(f"🎉 Debate completed! Total messages: {data_json.get('total_messages')}")
            except:
                pass

print("-" * 60)

# 4. Final check
print("\n4. Final verification...")
response = requests.get(f"{BASE_URL}/debate/{debate_id}")
final_data = response.json()

print(f"   Status: {final_data.get('status')}")
print(f"   Messages: {len(final_data.get('messages', []))}")

print("\n" + "=" * 60)
if len(final_data.get('messages', [])) == 5:
    print("✅ SUCCESS! All 5 models responded!")
else:
    print(f"⚠️  Only {len(final_data.get('messages', []))}/5 models responded")
print("=" * 60)
