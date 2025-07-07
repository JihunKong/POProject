// 도메인 설정
export const DOMAIN_CONFIG = {
  // 한글 도메인
  korean: '청해.com',
  // Punycode 변환된 도메인
  punycode: 'xn--9t4b11yi5a.com',
  // 프로토콜 포함 전체 URL
  url: 'https://청해.com',
  // 대체 URL (Punycode)
  alternativeUrl: 'https://xn--9t4b11yi5a.com'
};

// 현재 도메인이 우리 도메인인지 확인
export function isOurDomain(hostname: string): boolean {
  return hostname === DOMAIN_CONFIG.korean || 
         hostname === DOMAIN_CONFIG.punycode ||
         hostname === `www.${DOMAIN_CONFIG.korean}` ||
         hostname === `www.${DOMAIN_CONFIG.punycode}`;
}