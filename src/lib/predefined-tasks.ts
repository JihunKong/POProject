// Pure Ocean 프로젝트의 사전 정의된 작업 템플릿
export const predefinedTasks = [
  {
    category: 'Step 1: 문제 발견',
    tasks: [
      {
        title: '브레인스토밍 & 문제 정의',
        description: '팀원들과 함께 해양 관련 문제를 브레인스토밍하고 구체적으로 정의',
        priority: 'high' as const,
        phase: '문제 발견' as const,
        checklist: [
          '브레인스토밍 세션 진행',
          '문제 목록 작성',
          '우선순위 투표',
          '최종 문제 선정',
          'SDGs 연결점 찾기'
        ]
      },
      {
        title: '현장 조사 계획',
        description: '선정된 문제에 대한 현장 조사 계획 수립',
        priority: 'high' as const,
        phase: '문제 발견' as const,
        checklist: [
          '조사 지역 선정',
          '조사 일정 수립',
          '필요 장비 목록 작성',
          '안전 수칙 확인',
          '조사 양식 준비'
        ]
      }
    ]
  },
  {
    category: 'Step 2: 원인 분석',
    tasks: [
      {
        title: '근본 원인 분석',
        description: '5 Why 기법을 활용한 문제의 근본 원인 파악',
        priority: 'high' as const,
        phase: '원인 분석' as const,
        checklist: [
          '5 Why 분석 세션',
          '원인-결과 다이어그램 작성',
          '이해관계자 맵핑',
          '핵심 원인 도출',
          '원인별 영향도 평가'
        ]
      },
      {
        title: '데이터 수집 및 분석',
        description: '문제와 관련된 정량적/정성적 데이터 수집',
        priority: 'medium' as const,
        phase: '원인 분석' as const,
        checklist: [
          '필요 데이터 정의',
          '데이터 수집 방법 결정',
          '설문조사/인터뷰 진행',
          '데이터 정리 및 시각화',
          '인사이트 도출'
        ]
      }
    ]
  },
  {
    category: 'Step 3: 해결책 구상',
    tasks: [
      {
        title: '아이디어 발산',
        description: '다양한 해결 방안 브레인스토밍',
        priority: 'high' as const,
        phase: '해결책 구상' as const,
        checklist: [
          '아이디어 브레인스토밍',
          'SCAMPER 기법 적용',
          '벤치마킹 사례 조사',
          '아이디어 분류 및 정리',
          '실현 가능성 평가'
        ]
      },
      {
        title: '프로토타입 설계',
        description: '선정된 해결책의 프로토타입 설계',
        priority: 'medium' as const,
        phase: '해결책 구상' as const,
        checklist: [
          '핵심 기능 정의',
          '스케치/와이어프레임 작성',
          '필요 자원 목록 작성',
          '제작 일정 수립',
          'MVP 정의'
        ]
      }
    ]
  },
  {
    category: 'Step 4: 실행 계획',
    tasks: [
      {
        title: '실행 로드맵 작성',
        description: '프로젝트 실행을 위한 상세 계획 수립',
        priority: 'high' as const,
        phase: '실행 계획' as const,
        checklist: [
          '단계별 목표 설정',
          '타임라인 작성',
          '역할 분담 확정',
          '예산 계획 수립',
          '리스크 관리 계획'
        ]
      },
      {
        title: '파트너십 구축',
        description: '프로젝트 성공을 위한 협력 기관/전문가 섭외',
        priority: 'medium' as const,
        phase: '실행 계획' as const,
        checklist: [
          '필요 파트너 리스트업',
          '연락처 확보',
          '협력 제안서 작성',
          '미팅 일정 조율',
          'MOU 체결'
        ]
      }
    ]
  },
  {
    category: 'Step 5: 실행',
    tasks: [
      {
        title: '프로토타입 제작',
        description: '계획된 해결책의 실제 구현',
        priority: 'high' as const,
        phase: '실행' as const,
        checklist: [
          '재료/도구 준비',
          '제작 진행',
          '중간 점검',
          '수정/보완',
          '완성도 점검'
        ]
      },
      {
        title: '파일럿 테스트',
        description: '소규모 실험을 통한 효과 검증',
        priority: 'high' as const,
        phase: '실행' as const,
        checklist: [
          '테스트 계획 수립',
          '참가자 모집',
          '테스트 진행',
          '피드백 수집',
          '개선사항 도출'
        ]
      }
    ]
  },
  {
    category: 'Step 6: 평가',
    tasks: [
      {
        title: '성과 측정',
        description: '프로젝트의 정량적/정성적 성과 평가',
        priority: 'high' as const,
        phase: '평가' as const,
        checklist: [
          'KPI 측정',
          '목표 달성도 평가',
          '수혜자 피드백 수집',
          '팀원 자체 평가',
          '개선점 도출'
        ]
      },
      {
        title: '학습 정리',
        description: '프로젝트를 통해 얻은 교훈과 인사이트 정리',
        priority: 'medium' as const,
        phase: '평가' as const,
        checklist: [
          '성공 요인 분석',
          '실패 요인 분석',
          '핵심 학습 포인트 정리',
          '향후 개선 방안 도출',
          '팀 회고 진행'
        ]
      }
    ]
  },
  {
    category: 'Step 7: 공유',
    tasks: [
      {
        title: '발표 자료 제작',
        description: '프로젝트 결과 공유를 위한 프레젠테이션 준비',
        priority: 'high' as const,
        phase: '공유' as const,
        checklist: [
          '스토리라인 구성',
          'PPT 디자인',
          '시연 영상 제작',
          '발표 대본 작성',
          '리허설 진행'
        ]
      },
      {
        title: '성과 확산 계획',
        description: '프로젝트 성과를 지속/확대하기 위한 계획',
        priority: 'medium' as const,
        phase: '공유' as const,
        checklist: [
          'SNS 홍보 계획',
          '언론 보도자료 작성',
          '확산 전략 수립',
          '후속 프로젝트 기획',
          '네트워크 구축'
        ]
      }
    ]
  }
];

// 작업 카테고리 목록
export const taskCategories = [
  { value: 'Step 1: 문제 발견', label: 'Step 1: 문제 발견', icon: '🔍' },
  { value: 'Step 2: 원인 분석', label: 'Step 2: 원인 분석', icon: '🔬' },
  { value: 'Step 3: 해결책 구상', label: 'Step 3: 해결책 구상', icon: '💡' },
  { value: 'Step 4: 실행 계획', label: 'Step 4: 실행 계획', icon: '📋' },
  { value: 'Step 5: 실행', label: 'Step 5: 실행', icon: '🚀' },
  { value: 'Step 6: 평가', label: 'Step 6: 평가', icon: '📊' },
  { value: 'Step 7: 공유', label: 'Step 7: 공유', icon: '🌍' }
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