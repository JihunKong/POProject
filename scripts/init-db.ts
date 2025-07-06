import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌊 Pure-Ocean Project 데이터베이스 초기화 시작...');

  // 기본 교사 계정 생성 (선택사항)
  const teacherEmail = 'teacher@wando.hs.kr';
  
  try {
    const existingTeacher = await prisma.user.findUnique({
      where: { email: teacherEmail }
    });

    if (!existingTeacher) {
      await prisma.user.create({
        data: {
          email: teacherEmail,
          name: '관리자',
          role: 'TEACHER',
        }
      });
      console.log('✅ 기본 교사 계정 생성 완료');
    } else {
      console.log('ℹ️  교사 계정이 이미 존재합니다');
    }

    // 개발 환경에서만 샘플 데이터 생성
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 개발 환경 감지 - 샘플 데이터 생성 중...');
      
      const sampleStudents = [
        { email: 's20240101@wando.hs.kr', name: '김민준', classRoom: '2-1' },
        { email: 's20240102@wando.hs.kr', name: '이서연', classRoom: '2-1' },
        { email: 's20240103@wando.hs.kr', name: '박지호', classRoom: '2-2' },
      ];

      for (const student of sampleStudents) {
        const existing = await prisma.user.findUnique({
          where: { email: student.email }
        });

        if (!existing) {
          await prisma.user.create({
            data: {
              ...student,
              role: 'STUDENT',
              studentId: student.email.split('@')[0],
            }
          });
          console.log(`✅ 샘플 학생 생성: ${student.name}`);
        }
      }
    }

    console.log('🎉 데이터베이스 초기화 완료!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ 데이터베이스 초기화 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });