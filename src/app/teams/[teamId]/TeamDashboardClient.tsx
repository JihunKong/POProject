'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Plus, Calendar, Search, LayoutGrid,
  List, BarChart3, Brain
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  slogan: string | null;
  description: string | null;
  projectGoal: string | null;
  members: TeamMember[];
}

interface TeamMember {
  id: string;
  role: string;
  subjects: string[];
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  phase: string;
  category: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: string | null;
  assignedTo: string[];
  assignees: TeamMember[];
  createdAt: string;
  updatedAt: string;
}


type ViewMode = 'board' | 'list' | 'timeline';

const PHASES = [
  { id: 'day1', name: 'Day 1: 문제 정의', color: 'bg-purple-100 text-purple-800' },
  { id: 'day2', name: 'Day 2: 아이디어 도출', color: 'bg-blue-100 text-blue-800' },
  { id: 'day3', name: 'Day 3: 프로토타입', color: 'bg-green-100 text-green-800' },
  { id: 'day4', name: 'Day 4: 테스트 및 개선', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'day5', name: 'Day 5: 발표 준비', color: 'bg-orange-100 text-orange-800' }
];

const CATEGORIES = [
  { id: 'research', name: '조사/연구', icon: '🔍' },
  { id: 'design', name: '디자인/기획', icon: '🎨' },
  { id: 'development', name: '개발/제작', icon: '⚙️' },
  { id: 'documentation', name: '문서화', icon: '📝' },
  { id: 'presentation', name: '발표 준비', icon: '🎤' }
];

export default function TeamDashboardClient({ teamId }: { teamId: string }) {
  useSession();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [loading, setLoading] = useState(true);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleRecommendation, setShowRoleRecommendation] = useState(false);
  const [roleRecommendations, setRoleRecommendations] = useState<string>('');

  // 새 작업 폼 상태
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    phase: 'day1',
    category: 'research',
    dueDate: '',
    assignedTo: [] as string[]
  });

  const fetchTeamData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/teams/${teamId}`);
      setTeam(response.data.team);
    } catch (error) {
      console.error('Failed to fetch team:', error);
    }
  }, [teamId]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await axios.get(`/api/teams/${teamId}/tasks`);
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
      fetchTasks();
    }
  }, [teamId, fetchTeamData, fetchTasks]);

  const createTask = async () => {
    try {
      const response = await axios.post(`/api/teams/${teamId}/tasks`, newTask);
      setTasks([...tasks, response.data.task]);
      setShowNewTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        phase: 'day1',
        category: 'research',
        dueDate: '',
        assignedTo: []
      });
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await axios.patch(`/api/teams/${teamId}/tasks/${taskId}`, { status });
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: status as Task['status'] } : task
      ));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as Task['status'];
    
    updateTaskStatus(draggableId, newStatus);
  };

  const getRoleRecommendations = async () => {
    try {
      setShowRoleRecommendation(true);
      const response = await axios.post(`/api/teams/${teamId}/recommend-roles`);
      setRoleRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Failed to get role recommendations:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getTasksByStatus = (status: Task['status']) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const getTasksByPhase = (phase: string) => {
    return filteredTasks.filter(task => task.phase === phase);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/teams')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← 팀 목록
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{team?.name}</h1>
                {team?.slogan && (
                  <p className="text-sm text-gray-600 italic">&ldquo;{team.slogan}&rdquo;</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={getRoleRecommendations}
                className="flex items-center gap-2 px-4 py-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100"
              >
                <Brain className="w-4 h-4" />
                AI 역할 추천
              </button>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                새 작업
              </button>
            </div>
          </div>

          {/* View Mode & Filters */}
          <div className="flex justify-between items-center py-3 border-t">
            <div className="flex items-center gap-4">
              {/* View Mode Selector */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('board')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 inline mr-1" />
                  보드
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <List className="w-4 h-4 inline mr-1" />
                  리스트
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-1" />
                  타임라인
                </button>
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="all">모든 카테고리</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="작업 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Team Members */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">팀원:</span>
              <div className="flex -space-x-2">
                {team?.members.map((member) => (
                  <div
                    key={member.id}
                    className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium"
                    title={`${member.user.name || member.user.email} (${member.subjects.join(', ')})`}
                  >
                    {(member.user.name || member.user.email)[0].toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Board View */}
        {viewMode === 'board' && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-3 gap-6">
              {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                <div key={status} className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700">
                      {status === 'PENDING' && '📋 대기중'}
                      {status === 'IN_PROGRESS' && '🚀 진행중'}
                      {status === 'COMPLETED' && '✅ 완료'}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {getTasksByStatus(status as Task['status']).length}
                    </span>
                  </div>
                  
                  <Droppable droppableId={status}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-3 min-h-[200px]"
                      >
                        {getTasksByStatus(status as Task['status']).map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowTaskDetail(true);
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                                  <span className="text-xs px-2 py-1 rounded bg-gray-100">
                                    {CATEGORIES.find(c => c.id === task.category)?.icon}
                                  </span>
                                </div>
                                
                                {task.description && (
                                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between">
                                  <div className="flex -space-x-1">
                                    {task.assignees.slice(0, 3).map((assignee) => (
                                      <div
                                        key={assignee.id}
                                        className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border border-white"
                                      >
                                        {(assignee.user.name || assignee.user.email)[0].toUpperCase()}
                                      </div>
                                    ))}
                                    {task.assignees.length > 3 && (
                                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium border border-white">
                                        +{task.assignees.length - 3}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {task.dueDate && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(task.dueDate).toLocaleDateString('ko-KR')}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    PHASES.find(p => p.id === task.phase)?.color
                                  }`}>
                                    {PHASES.find(p => p.id === task.phase)?.name}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg shadow">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    단계
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    담당자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마감일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskDetail(true);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        PHASES.find(p => p.id === task.phase)?.color
                      }`}>
                        {PHASES.find(p => p.id === task.phase)?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm">
                        {CATEGORIES.find(c => c.id === task.category)?.icon} {CATEGORIES.find(c => c.id === task.category)?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex -space-x-1">
                        {task.assignees.map((assignee) => (
                          <div
                            key={assignee.id}
                            className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border border-white"
                            title={assignee.user.name || assignee.user.email}
                          >
                            {(assignee.user.name || assignee.user.email)[0].toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={task.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task.id, e.target.value);
                        }}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="PENDING">대기중</option>
                        <option value="IN_PROGRESS">진행중</option>
                        <option value="COMPLETED">완료</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-6">
              {PHASES.map((phase) => (
                <div key={phase.id} className="border-l-4 border-gray-300 pl-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-lg font-semibold px-3 py-1 rounded-full ${phase.color}`}>
                      {phase.name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {getTasksByPhase(phase.id).length} 작업
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getTasksByPhase(phase.id).map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskDetail(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status === 'COMPLETED' ? '완료' :
                             task.status === 'IN_PROGRESS' ? '진행중' : '대기'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{CATEGORIES.find(c => c.id === task.category)?.icon} {CATEGORIES.find(c => c.id === task.category)?.name}</span>
                          {task.dueDate && (
                            <span>{new Date(task.dueDate).toLocaleDateString('ko-KR')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">새 작업 만들기</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  작업명 *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 해양 오염 원인 조사"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="작업에 대한 상세 설명을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    단계 *
                  </label>
                  <select
                    value={newTask.phase}
                    onChange={(e) => setNewTask({ ...newTask, phase: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PHASES.map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리 *
                  </label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  마감일
                </label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자
                </label>
                <div className="space-y-2">
                  {team?.members.map((member) => (
                    <label key={member.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTask.assignedTo.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTask({ ...newTask, assignedTo: [...newTask.assignedTo, member.id] });
                          } else {
                            setNewTask({ ...newTask, assignedTo: newTask.assignedTo.filter(id => id !== member.id) });
                          }
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">
                        {member.user.name || member.user.email}
                        <span className="text-xs text-gray-500 ml-1">
                          ({member.subjects.join(', ')})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={createTask}
                disabled={!newTask.title}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                작업 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">{selectedTask.title}</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-2 py-1 rounded-full ${
                    PHASES.find(p => p.id === selectedTask.phase)?.color
                  }`}>
                    {PHASES.find(p => p.id === selectedTask.phase)?.name}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span>
                    {CATEGORIES.find(c => c.id === selectedTask.category)?.icon} {CATEGORIES.find(c => c.id === selectedTask.category)?.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowTaskDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {selectedTask.description && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">설명</h3>
                <p className="text-gray-600">{selectedTask.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-medium mb-2">상태</h3>
                <select
                  value={selectedTask.status}
                  onChange={(e) => {
                    updateTaskStatus(selectedTask.id, e.target.value);
                    setSelectedTask({ ...selectedTask, status: e.target.value as Task['status'] });
                  }}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="PENDING">📋 대기중</option>
                  <option value="IN_PROGRESS">🚀 진행중</option>
                  <option value="COMPLETED">✅ 완료</option>
                </select>
              </div>

              <div>
                <h3 className="font-medium mb-2">마감일</h3>
                <p className="text-gray-600">
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString('ko-KR') : '미정'}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-medium mb-2">담당자</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTask.assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
                      {(assignee.user.name || assignee.user.email)[0].toUpperCase()}
                    </div>
                    <span className="text-sm">
                      {assignee.user.name || assignee.user.email}
                      <span className="text-xs text-gray-500 ml-1">
                        ({assignee.subjects.join(', ')})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>생성일: {new Date(selectedTask.createdAt).toLocaleDateString('ko-KR')}</span>
                <span>•</span>
                <span>수정일: {new Date(selectedTask.updatedAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Recommendation Modal */}
      {showRoleRecommendation && roleRecommendations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">AI 역할 추천</h2>
              <button
                onClick={() => setShowRoleRecommendation(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">{roleRecommendations}</div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowRoleRecommendation(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}