'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Users, Plus, Copy, CheckCircle, Clock, AlertCircle, Calendar, UserPlus } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  slogan: string | null;
  description: string | null;
  inviteCode: string;
  myRole: string;
  mySubjects: string[];
  members: Array<{
    id: string;
    role: string;
    subjects: string[];
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
  tasks: Array<{
    id: string;
    title: string;
    phase: string;
    category: string;
    status: string;
    dueDate: string | null;
  }>;
}

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 팀 생성 폼 상태
  const [newTeam, setNewTeam] = useState({
    name: '',
    slogan: '',
    description: '',
    subjects: [] as string[]
  });

  // 팀 가입 폼 상태
  const [joinData, setJoinData] = useState({
    inviteCode: '',
    subjects: [] as string[]
  });

  const subjectOptions = [
    '국어', '영어', '수학', '과학', '사회', '정보', '미술', '음악', '체육', '기술가정'
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchTeams();
    }
  }, [status, router]);

  const fetchTeams = async () => {
    try {
      const response = await axios.get('/api/teams');
      setTeams(response.data.teams);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    try {
      const response = await axios.post('/api/teams', newTeam);
      setTeams([...teams, response.data.team]);
      setShowCreateModal(false);
      setNewTeam({ name: '', slogan: '', description: '', subjects: [] });
    } catch (error) {
      console.error('Failed to create team:', error);
      alert('팀 생성에 실패했습니다.');
    }
  };

  const joinTeam = async () => {
    try {
      const response = await axios.post('/api/teams/join', joinData);
      setTeams([...teams, response.data.team]);
      setShowJoinModal(false);
      setJoinData({ inviteCode: '', subjects: [] });
    } catch (error: any) {
      console.error('Failed to join team:', error);
      alert(error.response?.data?.error || '팀 가입에 실패했습니다.');
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTaskStats = (tasks: Team['tasks']) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const pending = tasks.filter(t => t.status === 'PENDING').length;
    return { total, completed, inProgress, pending };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">팀 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">내 팀 관리</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                팀 참가
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 팀 만들기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {teams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 팀이 없습니다</h3>
            <p className="text-gray-600 mb-6">새로운 팀을 만들거나 초대 코드로 팀에 참가하세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => {
              const stats = getTaskStats(team.tasks);
              return (
                <div
                  key={team.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/teams/${team.id}`)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{team.name}</h3>
                        {team.slogan && (
                          <p className="text-sm text-gray-600 italic mt-1">"{team.slogan}"</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        team.myRole === 'leader' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {team.myRole === 'leader' ? '팀장' : '팀원'}
                      </span>
                    </div>

                    {/* Team Members */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">팀원 ({team.members.length}명)</p>
                      <div className="flex -space-x-2">
                        {team.members.slice(0, 4).map((member) => (
                          <div
                            key={member.id}
                            className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium"
                            title={member.user.name || member.user.email}
                          >
                            {(member.user.name || member.user.email)[0].toUpperCase()}
                          </div>
                        ))}
                        {team.members.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium">
                            +{team.members.length - 4}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Task Stats */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">전체 작업</span>
                        <span className="font-medium">{stats.total}개</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          완료 {stats.completed}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-yellow-600" />
                          진행중 {stats.inProgress}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-gray-400" />
                          대기 {stats.pending}
                        </span>
                      </div>
                    </div>

                    {/* Invite Code (for leaders) */}
                    {team.myRole === 'leader' && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">초대 코드</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyInviteCode(team.inviteCode);
                            }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedCode === team.inviteCode ? '복사됨!' : '복사'}
                          </button>
                        </div>
                        <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                          {team.inviteCode}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">새 팀 만들기</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  팀 이름 *
                </label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 청해 탐험대"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  팀 슬로건
                </label>
                <input
                  type="text"
                  value={newTeam.slogan}
                  onChange={(e) => setNewTeam({ ...newTeam, slogan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 깨끗한 바다를 위하여!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  팀 설명
                </label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="우리 팀이 하고자 하는 프로젝트에 대해 설명해주세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  나의 융합 과목 (2개 이상)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {subjectOptions.map((subject) => (
                    <label key={subject} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTeam.subjects.includes(subject)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTeam({ ...newTeam, subjects: [...newTeam.subjects, subject] });
                          } else {
                            setNewTeam({ ...newTeam, subjects: newTeam.subjects.filter(s => s !== subject) });
                          }
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{subject}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={createTeam}
                disabled={!newTeam.name || newTeam.subjects.length < 2}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                팀 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">팀 참가하기</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  초대 코드 *
                </label>
                <input
                  type="text"
                  value={joinData.inviteCode}
                  onChange={(e) => setJoinData({ ...joinData, inviteCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="초대 코드를 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  나의 융합 과목 (2개 이상)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {subjectOptions.map((subject) => (
                    <label key={subject} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={joinData.subjects.includes(subject)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setJoinData({ ...joinData, subjects: [...joinData.subjects, subject] });
                          } else {
                            setJoinData({ ...joinData, subjects: joinData.subjects.filter(s => s !== subject) });
                          }
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{subject}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={joinTeam}
                disabled={!joinData.inviteCode || joinData.subjects.length < 2}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                팀 참가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}