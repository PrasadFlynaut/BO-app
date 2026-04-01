#!/usr/bin/env python3
"""
Cloudinary Upload Endpoint Test - Specific test for the review request
Tests the POST /api/v1/upload endpoint with test@bo.com credentials
"""

import requests
import json
import io
from PIL import Image

# API Configuration
BASE_URL = "https://mobile-launch-45.preview.emergentagent.com/api"
TEST_EMAIL = "test@bo.com"
TEST_PASSWORD = "Test1234!"

def create_test_image():
    """Create a 1x1 pixel PNG image for testing"""
    img = Image.new('RGB', (1, 1), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes

def test_cloudinary_upload():
    """Test Cloudinary upload with test@bo.com credentials"""
    print("🧪 Testing Cloudinary Upload with test@bo.com credentials...")
    
    # Step 1: Login to get JWT token
    print("\n1. Logging in to get JWT token...")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            headers = {"Authorization": f"Bearer {access_token}"}
            print(f"✅ Login successful, token obtained")
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Login exception: {str(e)}")
        return False
    
    # Step 2: Create a small test image file (1x1 pixel PNG)
    print("\n2. Creating 1x1 pixel PNG test image...")
    test_image = create_test_image()
    print("✅ Test image created")
    
    # Step 3: POST to /api/v1/upload with test image as multipart file upload
    print("\n3. Uploading test image to /api/v1/upload...")
    try:
        files = {'file': ('test_image.png', test_image, 'image/png')}
        response = requests.post(f"{BASE_URL}/v1/upload", files=files, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Upload successful!")
            
            # Step 4: Verify response contains Cloudinary URL
            url = data.get('url', '')
            if 'cloudinary' in url:
                print(f"✅ Response contains Cloudinary URL: {url}")
            else:
                print(f"❌ URL does not contain 'cloudinary': {url}")
                return False
            
            # Step 5: Verify response contains required fields
            required_fields = ['url', 'public_id', 'resource_type', 'format']
            print(f"\n4. Verifying required fields: {required_fields}")
            
            for field in required_fields:
                if field in data:
                    print(f"✅ {field}: {data[field]}")
                else:
                    print(f"❌ Missing field: {field}")
                    return False
            
            print(f"\n📊 Complete response:")
            print(json.dumps(data, indent=2))
            
        else:
            print(f"❌ Upload failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Upload exception: {str(e)}")
        return False
    
    # Step 6: Test upload without auth (should return 401)
    print("\n5. Testing upload without authentication...")
    try:
        test_image = create_test_image()
        files = {'file': ('test_image.png', test_image, 'image/png')}
        response = requests.post(f"{BASE_URL}/v1/upload", files=files)
        
        if response.status_code == 401:
            print("✅ Upload without auth correctly returned 401")
        else:
            print(f"❌ Expected 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Auth test exception: {str(e)}")
        return False
    
    # Step 7: Test upload with non-image file (should return 400)
    print("\n6. Testing upload with non-image file...")
    try:
        text_content = "This is a test text file"
        text_bytes = io.BytesIO(text_content.encode('utf-8'))
        files = {'file': ('test.txt', text_bytes, 'text/plain')}
        response = requests.post(f"{BASE_URL}/v1/upload", files=files, headers=headers)
        
        if response.status_code == 400:
            print("✅ Upload with non-image file correctly returned 400")
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ File type test exception: {str(e)}")
        return False
    
    print("\n🎉 All Cloudinary upload tests passed!")
    return True

if __name__ == "__main__":
    success = test_cloudinary_upload()
    if success:
        print("\n✅ CLOUDINARY UPLOAD TEST: PASSED")
    else:
        print("\n❌ CLOUDINARY UPLOAD TEST: FAILED")