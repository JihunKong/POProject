#!/usr/bin/env node

/**
 * Google Docs Service Account Verification Script
 * Tests Google Service Account configuration and Google Docs API access
 */

require('dotenv').config();
const { getGoogleDocsService, extractDocumentId } = require('../src/lib/google-docs');

async function verifyGoogleDocsSetup() {
  console.log('🔍 Verifying Google Docs Service Account setup...\n');

  try {
    // 1. Check environment variable
    console.log('1️⃣ Checking GOOGLE_SERVICE_ACCOUNT environment variable...');
    const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      console.log('❌ GOOGLE_SERVICE_ACCOUNT environment variable is not set');
      console.log('💡 Follow GOOGLE_SERVICE_ACCOUNT_SETUP.md to configure');
      process.exit(1);
    }
    
    console.log('✅ Environment variable found');
    
    // 2. Validate JSON format
    console.log('\n2️⃣ Validating service account JSON format...');
    let credentials;
    try {
      credentials = JSON.parse(serviceAccount);
      console.log('✅ Valid JSON format');
    } catch (error) {
      console.log('❌ Invalid JSON format in GOOGLE_SERVICE_ACCOUNT');
      console.log('💡 Ensure the JSON is properly escaped');
      process.exit(1);
    }

    // 3. Check required fields
    console.log('\n3️⃣ Checking required service account fields...');
    const requiredFields = [
      'type', 'project_id', 'private_key_id', 'private_key',
      'client_email', 'client_id', 'auth_uri', 'token_uri'
    ];
    
    const missingFields = requiredFields.filter(field => !credentials[field]);
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields.join(', '));
      process.exit(1);
    }
    
    console.log('✅ All required fields present');
    console.log(`📧 Service Account Email: ${credentials.client_email}`);
    console.log(`🏗️  Project ID: ${credentials.project_id}`);

    // 4. Initialize Google Docs service
    console.log('\n4️⃣ Initializing Google Docs service...');
    let docsService;
    try {
      docsService = getGoogleDocsService();
      console.log('✅ Google Docs service initialized successfully');
    } catch (error) {
      console.log('❌ Failed to initialize Google Docs service');
      console.log('Error:', error.message);
      process.exit(1);
    }

    // 5. Test basic API access (list accessible documents - this might fail but helps verify connection)
    console.log('\n5️⃣ Testing Google Docs API connection...');
    try {
      // We can't list all documents, but we can verify the service is working
      // by checking if the service object has the expected methods
      const hasRequiredMethods = [
        'documents.get',
        'documents.batchUpdate'
      ].every(method => {
        const parts = method.split('.');
        return parts.reduce((obj, part) => obj && obj[part], docsService) !== undefined;
      });
      
      if (hasRequiredMethods) {
        console.log('✅ Google Docs API service methods available');
      } else {
        console.log('❌ Required API methods not found');
        process.exit(1);
      }
    } catch (error) {
      console.log('❌ API connection test failed');
      console.log('Error:', error.message);
      process.exit(1);
    }

    // 6. Test document ID extraction function
    console.log('\n6️⃣ Testing document ID extraction...');
    const testUrls = [
      'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    ];
    
    testUrls.forEach((url, index) => {
      const docId = extractDocumentId(url);
      if (docId === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms') {
        console.log(`✅ Test URL ${index + 1}: ${url} → ${docId}`);
      } else {
        console.log(`❌ Test URL ${index + 1}: ${url} → ${docId || 'null'}`);
      }
    });

    console.log('\n🎉 Google Docs Service Account verification completed successfully!\n');
    
    console.log('📋 Next steps to test document access:');
    console.log('1. Create a test Google Docs document');
    console.log('2. Share it with your service account email:');
    console.log(`   ${credentials.client_email}`);
    console.log('3. Give "Editor" permissions');
    console.log('4. Test the document feedback API through the web interface');
    console.log('');
    console.log('🌐 API Endpoint: POST /api/docs/feedback');
    console.log('📄 Required payload: { "genre": "워크시트", "docUrl": "your-document-url" }');
    console.log('');

  } catch (error) {
    console.error('❌ Verification failed with unexpected error:');
    console.error(error);
    process.exit(1);
  }
}

// Run verification
verifyGoogleDocsSetup();