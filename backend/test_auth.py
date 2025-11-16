"""
Test script for authentication system
Run this to verify the auth system is working correctly
"""
import requests
import time
import json

BASE_URL = "http://localhost:5000"


def print_response(title, response):
    """Pretty print response"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
    print(f"{'='*60}\n")


def test_health():
    """Test health endpoint"""
    print("\n🏥 Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/api/health")
    print_response("Health Check", response)
    return response.status_code == 200


def test_signup_flow():
    """Test complete signup flow"""
    print("\n📝 Testing signup flow...")

    # Test data
    email = f"test_{int(time.time())}@example.com"
    name = "Test User"

    # Step 1: Request signup code
    print(f"\n1️⃣ Requesting signup code for {email}...")
    response = requests.post(
        f"{BASE_URL}/api/auth/signup/request-code",
        json={"email": email, "name": name}
    )
    print_response("Signup Code Request", response)

    if response.status_code != 200:
        print("❌ Failed to request signup code")
        return None

    # Get code from console (you'll need to check the server console)
    print("\n⚠️  Check your server console for the verification code!")
    code = input("Enter the verification code: ")

    # Step 2: Verify code and create account
    print(f"\n2️⃣ Verifying code and creating account...")
    response = requests.post(
        f"{BASE_URL}/api/auth/signup/verify-code",
        json={"email": email, "name": name, "code": code}
    )
    print_response("Signup Verification", response)

    if response.status_code == 201:
        data = response.json()
        token = data['data']['token']
        print(f"✅ Signup successful! Token: {token[:20]}...")
        return {"email": email, "token": token}
    else:
        print("❌ Signup failed")
        return None


def test_login_flow(email):
    """Test complete login flow"""
    print("\n🔐 Testing login flow...")

    # Step 1: Request login code
    print(f"\n1️⃣ Requesting login code for {email}...")
    response = requests.post(
        f"{BASE_URL}/api/auth/login/request-code",
        json={"email": email}
    )
    print_response("Login Code Request", response)

    if response.status_code != 200:
        print("❌ Failed to request login code")
        return None

    # Get code from console
    print("\n⚠️  Check your server console for the verification code!")
    code = input("Enter the verification code: ")

    # Step 2: Verify code and login
    print(f"\n2️⃣ Verifying code and logging in...")
    response = requests.post(
        f"{BASE_URL}/api/auth/login/verify-code",
        json={"email": email, "code": code}
    )
    print_response("Login Verification", response)

    if response.status_code == 200:
        data = response.json()
        token = data['data']['token']
        print(f"✅ Login successful! Token: {token[:20]}...")
        return token
    else:
        print("❌ Login failed")
        return None


def test_protected_endpoints(token):
    """Test protected endpoints"""
    print("\n🔒 Testing protected endpoints...")

    headers = {"Authorization": f"Bearer {token}"}

    # Test GET /me
    print("\n1️⃣ Getting current user info...")
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    print_response("Get Current User", response)

    if response.status_code != 200:
        print("❌ Failed to get user info")
        return False

    # Test PUT /me
    print("\n2️⃣ Updating user profile...")
    response = requests.put(
        f"{BASE_URL}/api/auth/me",
        headers=headers,
        json={"name": "Updated Test User"}
    )
    print_response("Update User Profile", response)

    if response.status_code == 200:
        print("✅ Protected endpoints working!")
        return True
    else:
        print("❌ Failed to update profile")
        return False


def test_error_cases():
    """Test error handling"""
    print("\n⚠️  Testing error cases...")

    # Test 1: Invalid email
    print("\n1️⃣ Testing invalid email...")
    response = requests.post(
        f"{BASE_URL}/api/auth/signup/request-code",
        json={"email": "invalid-email", "name": "Test"}
    )
    print_response("Invalid Email Test", response)

    # Test 2: Missing fields
    print("\n2️⃣ Testing missing fields...")
    response = requests.post(
        f"{BASE_URL}/api/auth/signup/request-code",
        json={"email": "test@example.com"}  # Missing name
    )
    print_response("Missing Fields Test", response)

    # Test 3: Invalid code
    print("\n3️⃣ Testing invalid verification code...")
    response = requests.post(
        f"{BASE_URL}/api/auth/signup/verify-code",
        json={"email": "test@example.com", "name": "Test", "code": "000000"}
    )
    print_response("Invalid Code Test", response)

    # Test 4: No auth token
    print("\n4️⃣ Testing protected endpoint without token...")
    response = requests.get(f"{BASE_URL}/api/auth/me")
    print_response("No Token Test", response)

    # Test 5: Invalid token
    print("\n5️⃣ Testing protected endpoint with invalid token...")
    response = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": "Bearer invalid-token"}
    )
    print_response("Invalid Token Test", response)

    print("\n✅ Error handling tests completed")


def main():
    """Run all tests"""
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║     PolyDebate Authentication System Test Suite           ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
    """)

    print("📋 Prerequisites:")
    print("   1. Server is running at http://localhost:5000")
    print("   2. EMAIL_SERVICE is set to 'mock' in .env")
    print("   3. Server console is visible to see verification codes")
    print("\n" + "="*60 + "\n")

    input("Press Enter to start testing...")

    # Test 1: Health check
    if not test_health():
        print("\n❌ Health check failed. Is the server running?")
        return

    # Test 2: Signup flow
    user_data = test_signup_flow()
    if not user_data:
        print("\n❌ Signup flow failed")
        return

    # Test 3: Protected endpoints
    if not test_protected_endpoints(user_data['token']):
        print("\n❌ Protected endpoints failed")
        return

    # Test 4: Login flow
    token = test_login_flow(user_data['email'])
    if not token:
        print("\n❌ Login flow failed")
        return

    # Test 5: Error cases
    test_error_cases()

    # Summary
    print(f"""
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║                  ✅ All Tests Passed!                      ║
    ║                                                            ║
    ║  Your authentication system is working correctly!         ║
    ║                                                            ║
    ║  Next steps:                                               ║
    ║  1. Configure Gmail SMTP for production                    ║
    ║  2. Customize email templates                              ║
    ║  3. Set a strong JWT_SECRET_KEY                            ║
    ║  4. Review the AUTH_README.md for deployment               ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
    """)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏸️  Tests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
