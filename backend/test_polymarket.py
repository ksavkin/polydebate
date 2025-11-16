"""
Test script for Polymarket service
"""
from services.polymarket import polymarket_service

print("=== Testing Polymarket Service ===\n")

# Test 1: Get markets
print("Test 1: Fetching markets...")
try:
    result = polymarket_service.get_markets(limit=5)
    print(f"✅ Success! Found {len(result['markets'])} markets")

    if result['markets']:
        first_market = result['markets'][0]
        print(f"\nFirst market:")
        print(f"  ID: {first_market['id']}")
        print(f"  Question: {first_market['question']}")
        print(f"  Category: {first_market['category']}")
        print(f"  Volume: {first_market['volume']}")
        print(f"  Outcomes: {len(first_market['outcomes'])}")

        # Save market_id for next test
        test_market_id = first_market['id']
    else:
        print("❌ No markets found")
        test_market_id = None

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    test_market_id = None

print("\n" + "="*50 + "\n")

# Test 2: Get specific market
if test_market_id:
    print(f"Test 2: Fetching market details for {test_market_id}...")
    try:
        market = polymarket_service.get_market(test_market_id)
        print(f"✅ Success!")
        print(f"  Question: {market['question']}")
        print(f"  Description: {market['description'][:100]}..." if len(market['description']) > 100 else f"  Description: {market['description']}")
        print(f"  Market Type: {market['market_type']}")
        print(f"  Outcomes:")
        for outcome in market['outcomes']:
            print(f"    - {outcome['name']}: {outcome['price']} ({int(outcome['price']*100)}%)")
    except Exception as e:
        print(f"❌ Error: {e}")
else:
    print("Test 2: Skipped (no market ID from Test 1)")

print("\n" + "="*50 + "\n")

# Test 3: Get categories
print("Test 3: Fetching categories...")
try:
    categories = polymarket_service.get_categories()
    print(f"✅ Success! Found {len(categories)} categories")

    if categories:
        print("\nCategories:")
        for cat in categories[:5]:  # Show first 5
            print(f"  - {cat['name']} ({cat['market_count']} markets)")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*50)
print("\n✅ Testing complete!")
