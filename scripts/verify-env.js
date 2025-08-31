#!/usr/bin/env node
/**
 * 환경 변수 검증 스크립트
 * Pure Ocean Platform의 첨삭 시스템 필수 환경 변수를 확인합니다.
 */

require('dotenv').config();

const required = [
  'DATABASE_URL',
  'UPSTAGE_API_KEY', 
  'GOOGLE_SERVICE_ACCOUNT',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

const optional = [
  'REDIS_URL',
  'ANTHROPIC_API_KEY',
  'ALLOWED_EMAIL_DOMAIN'
];

console.log('🔍 Pure Ocean Platform - 환경 변수 검증');
console.log('=' .repeat(50));

let missingRequired = [];
let allGood = true;

// 필수 환경 변수 검증
console.log('\n📋 필수 환경 변수:');
for (const key of required) {
  const value = process.env[key];
  const status = value ? '✅ 설정됨' : '❌ 누락';
  
  if (!value) {
    missingRequired.push(key);
    allGood = false;
  }
  
  // 민감한 정보는 일부만 표시
  let displayValue = '';
  if (value) {
    if (key.includes('SECRET') || key.includes('KEY')) {
      displayValue = value.length > 20 ? `${value.substring(0, 10)}...` : '[설정됨]';
    } else if (key === 'GOOGLE_SERVICE_ACCOUNT') {
      try {
        const parsed = JSON.parse(value);
        displayValue = `프로젝트: ${parsed.project_id || '알수없음'}`;
      } catch {
        displayValue = '[JSON 파싱 실패]';
      }
    } else {
      displayValue = value;
    }
  }
  
  console.log(`${key}: ${status} ${displayValue}`);
}

// 선택적 환경 변수 검증
console.log('\n🔧 선택적 환경 변수:');
for (const key of optional) {
  const value = process.env[key];
  const status = value ? '✅ 설정됨' : '⚪ 미설정';
  console.log(`${key}: ${status}`);
}

// 특별 검증: Google Service Account JSON 구조
if (process.env.GOOGLE_SERVICE_ACCOUNT) {
  console.log('\n🔐 Google Service Account 검증:');
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    
    for (const field of requiredFields) {
      const hasField = !!serviceAccount[field];
      console.log(`  ${field}: ${hasField ? '✅' : '❌'}`);
      if (!hasField) allGood = false;
    }
    
    console.log(`  클라이언트 이메일: ${serviceAccount.client_email || '없음'}`);
  } catch (error) {
    console.log('  ❌ JSON 파싱 실패');
    allGood = false;
  }
}

// 결과 요약
console.log('\n' + '=' .repeat(50));
if (allGood) {
  console.log('🎉 모든 환경 변수가 올바르게 설정되었습니다!');
  console.log('첨삭 시스템이 정상 작동할 준비가 되었습니다.');
  process.exit(0);
} else {
  console.log('❌ 환경 변수 설정에 문제가 있습니다.');
  
  if (missingRequired.length > 0) {
    console.log('\n누락된 필수 환경 변수:');
    missingRequired.forEach(key => console.log(`- ${key}`));
    
    console.log('\n해결 방법:');
    console.log('1. .env 파일에 누락된 환경 변수 추가');
    console.log('2. GOOGLE_SERVICE_ACCOUNT_SETUP.md 참조');
    console.log('3. PM2 재시작: pm2 restart pure-ocean-app');
  }
  
  process.exit(1);
}