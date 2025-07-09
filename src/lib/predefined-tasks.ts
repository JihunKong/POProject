// Pure Ocean 프로젝트의 사전 정의된 작업 템플릿
export const predefinedTasks = [
  {
    category: '연구',
    tasks: [
      {
        title: '해양 쓰레기 현황 조사',
        description: '지역 해변의 쓰레기 종류와 양을 조사하고 데이터 수집',
        priority: 'high' as const,
        phase: '문제 발견' as const,
        checklist: [
          '조사 지역 선정',
          '조사 방법론 수립',
          '데이터 수집 도구 준비',
          '현장 조사 실시',
          '데이터 정리 및 분석'
        ]
      },
      {
        title: '해양 생태계 영향 분석',
        description: '플라스틱이 해양 생물에 미치는 영향 연구',
        priority: 'high' as const,
        phase: '원인 분석' as const,
        checklist: [
          '문헌 조사',
          '전문가 인터뷰',
          '사례 연구',
          '영향 분석 보고서 작성'
        ]
      }
    ]
  },
  {
    category: '개발',
    tasks: [
      {
        title: '쓰레기 추적 앱 개발',
        description: '해변 쓰레기 발견 및 보고를 위한 모바일 앱 개발',
        priority: 'medium' as const,
        phase: '해결책 구상' as const,
        checklist: [
          '앱 기획서 작성',
          'UI/UX 디자인',
          '프로토타입 개발',
          '사용자 테스트',
          '최종 버전 배포'
        ]
      },
      {
        title: '데이터 시각화 대시보드',
        description: '수집된 해양 쓰레기 데이터를 시각화하는 웹 대시보드',
        priority: 'medium' as const,
        phase: '실행 계획' as const,
        checklist: [
          '데이터 구조 설계',
          '시각화 도구 선택',
          '대시보드 개발',
          '실시간 데이터 연동'
        ]
      }
    ]
  },
  {
    category: '캠페인',
    tasks: [
      {
        title: 'SNS 인식 개선 캠페인',
        description: '해양 보호의 중요성을 알리는 소셜 미디어 캠페인',
        priority: 'medium' as const,
        phase: '실행' as const,
        checklist: [
          '캠페인 메시지 개발',
          '콘텐츠 제작 계획',
          'SNS 채널 운영 전략',
          '인플루언서 협업',
          '효과 측정 지표 설정'
        ]
      },
      {
        title: '해변 정화 행사 기획',
        description: '지역 주민과 함께하는 해변 정화 활동 조직',
        priority: 'high' as const,
        phase: '실행' as const,
        checklist: [
          '행사 일정 및 장소 선정',
          '참가자 모집 계획',
          '필요 물품 준비',
          '안전 대책 수립',
          '사후 평가 계획'
        ]
      }
    ]
  },
  {
    category: '교육',
    tasks: [
      {
        title: '환경 교육 프로그램 개발',
        description: '초중고 학생 대상 해양 환경 교육 커리큘럼',
        priority: 'medium' as const,
        phase: '실행 계획' as const,
        checklist: [
          '교육 목표 설정',
          '연령별 커리큘럼 개발',
          '교육 자료 제작',
          '파일럿 프로그램 운영',
          '피드백 반영 및 개선'
        ]
      }
    ]
  }
];

// 작업 카테고리 목록
export const taskCategories = [
  { value: '연구', label: '연구', icon: '🔬' },
  { value: '개발', label: '개발', icon: '💻' },
  { value: '캠페인', label: '캠페인', icon: '📢' },
  { value: '교육', label: '교육', icon: '📚' }
];

// 프로젝트 단계
export const projectPhases = [
  { value: '문제 발견', label: '문제 발견' },
  { value: '원인 분석', label: '원인 분석' },
  { value: '해결책 구상', label: '해결책 구상' },
  { value: '실행 계획', label: '실행 계획' },
  { value: '실행', label: '실행' },
  { value: '평가', label: '평가' },
  { value: '공유', label: '공유' }
];