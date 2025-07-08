'use client';

import { useState } from 'react';
import { Brain, Heart, Lightbulb, Target, Users, Zap, ChevronRight, ChevronLeft } from 'lucide-react';

interface PersonalityTestProps {
  onComplete: (profile: {
    strengths: string[];
    weaknesses: string[];
    interests: string[];
    personality: {
      type: string;
      traits: string[];
    };
  }) => void;
  onClose: () => void;
}

const QUESTIONS = [
  {
    id: 'work_style',
    question: '프로젝트를 할 때 나는...',
    options: [
      { value: 'leader', label: '팀을 이끌고 방향을 제시하는 편이다', trait: 'leadership' },
      { value: 'supporter', label: '다른 사람을 도와주고 지원하는 편이다', trait: 'support' },
      { value: 'creator', label: '혼자서 집중해서 만드는 편이다', trait: 'independent' },
      { value: 'analyzer', label: '자료를 분석하고 정리하는 편이다', trait: 'analytical' }
    ]
  },
  {
    id: 'problem_solving',
    question: '문제를 해결할 때 나는...',
    options: [
      { value: 'creative', label: '창의적이고 새로운 방법을 시도한다', trait: 'creative' },
      { value: 'systematic', label: '체계적으로 단계별로 접근한다', trait: 'systematic' },
      { value: 'collaborative', label: '다른 사람과 협력해서 해결한다', trait: 'collaborative' },
      { value: 'research', label: '자료를 찾고 연구해서 해결한다', trait: 'research' }
    ]
  },
  {
    id: 'interest_area',
    question: '가장 관심 있는 분야는?',
    options: [
      { value: 'tech', label: '기술/프로그래밍', interest: '기술' },
      { value: 'design', label: '디자인/시각화', interest: '디자인' },
      { value: 'research', label: '조사/분석', interest: '연구' },
      { value: 'communication', label: '발표/소통', interest: '소통' }
    ]
  }
];

const STRENGTHS = [
  '리더십', '창의성', '분석력', '소통능력', '기획력', 
  '문서작성', '발표', '디자인', '프로그래밍', '자료조사',
  '협업', '시간관리', '문제해결', '비판적사고', '인내심'
];

const WEAKNESSES = [
  '시간관리', '발표', '리더십', '세부작업', '장기집중',
  '즉흥대응', '비판수용', '마감압박', '혼자작업', '팀워크'
];

const INTERESTS = [
  '해양생물', '환경보호', '기후변화', '재활용', '신재생에너지',
  'AI/기술', '예술/디자인', '교육/캠페인', '정책/법률', '과학실험'
];

export default function PersonalityTest({ onComplete, onClose }: PersonalityTestProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([]);
  const [selectedWeaknesses, setSelectedWeaknesses] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers({ ...answers, [questionId]: answer });
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    }
  };

  const toggleSelection = (item: string, list: string[], setter: (items: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const completeTest = () => {
    // 성격 유형 분석
    const traits = Object.values(answers).map((a: any) => a.trait).filter(Boolean);
    const interests = Object.values(answers).map((a: any) => a.interest).filter(Boolean);
    
    let personalityType = 'Balanced';
    if (traits.includes('leadership')) personalityType = 'Leader';
    else if (traits.includes('creative')) personalityType = 'Creator';
    else if (traits.includes('analytical')) personalityType = 'Analyst';
    else if (traits.includes('collaborative')) personalityType = 'Collaborator';

    onComplete({
      strengths: selectedStrengths,
      weaknesses: selectedWeaknesses,
      interests: [...selectedInterests, ...interests],
      personality: {
        type: personalityType,
        traits
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-500" />
            팀 프로필 설정
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>진행률</span>
            <span>{Math.round(((step + 1) / (QUESTIONS.length + 3)) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${((step + 1) / (QUESTIONS.length + 3)) * 100}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        {step < QUESTIONS.length && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">{QUESTIONS[step].question}</h3>
            <div className="space-y-3">
              {QUESTIONS[step].options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(QUESTIONS[step].id, option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    answers[QUESTIONS[step].id]?.value === option.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Strengths Selection */}
        {step === QUESTIONS.length && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              내가 잘하는 것들 (3개 이상 선택)
            </h3>
            <p className="text-sm text-gray-600 mb-4">프로젝트에서 자신 있게 할 수 있는 것들을 선택해주세요</p>
            <div className="flex flex-wrap gap-2">
              {STRENGTHS.map((strength) => (
                <button
                  key={strength}
                  onClick={() => toggleSelection(strength, selectedStrengths, setSelectedStrengths)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    selectedStrengths.includes(strength)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {strength}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses Selection */}
        {step === QUESTIONS.length + 1 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Target className="w-5 h-5 text-red-500" />
              개선하고 싶은 것들 (2개 이상 선택)
            </h3>
            <p className="text-sm text-gray-600 mb-4">도움을 받고 싶거나 성장하고 싶은 부분을 선택해주세요</p>
            <div className="flex flex-wrap gap-2">
              {WEAKNESSES.map((weakness) => (
                <button
                  key={weakness}
                  onClick={() => toggleSelection(weakness, selectedWeaknesses, setSelectedWeaknesses)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    selectedWeaknesses.includes(weakness)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {weakness}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Interests Selection */}
        {step === QUESTIONS.length + 2 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              관심 분야 (3개 이상 선택)
            </h3>
            <p className="text-sm text-gray-600 mb-4">Pure Ocean 프로젝트에서 다루고 싶은 주제를 선택해주세요</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleSelection(interest, selectedInterests, setSelectedInterests)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    selectedInterests.includes(interest)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </button>
          
          {step < QUESTIONS.length + 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step < QUESTIONS.length && !answers[QUESTIONS[step]?.id]) ||
                (step === QUESTIONS.length && selectedStrengths.length < 3) ||
                (step === QUESTIONS.length + 1 && selectedWeaknesses.length < 2)
              }
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={completeTest}
              disabled={selectedInterests.length < 3}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              프로필 완성
            </button>
          )}
        </div>
      </div>
    </div>
  );
}