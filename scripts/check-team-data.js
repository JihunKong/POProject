#!/usr/bin/env node

/**
 * Check team data in database
 */

const { PrismaClient } = require('@prisma/client');

async function checkTeamData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 데이터베이스 상태 점검 ===');
    
    // Count all entities
    const teamCount = await prisma.team.count();
    const userCount = await prisma.user.count();
    const conversationCount = await prisma.conversation.count();
    const teamMemberCount = await prisma.teamMember.count();
    const taskCount = await prisma.task.count();
    
    console.log(`팀 개수: ${teamCount}`);
    console.log(`사용자 개수: ${userCount}`);
    console.log(`팀 멤버 개수: ${teamMemberCount}`);
    console.log(`작업 개수: ${taskCount}`);
    console.log(`대화 개수: ${conversationCount}`);
    
    if (teamCount > 0) {
      console.log('\n=== 팀 목록 ===');
      const teams = await prisma.team.findMany({
        include: {
          members: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          },
          progress: true
        }
      });
      
      teams.forEach(team => {
        console.log(`- 팀명: ${team.name}`);
        console.log(`  슬로건: ${team.slogan || '없음'}`);
        console.log(`  멤버: ${team.members.length}명`);
        console.log(`  초대 코드: ${team.inviteCode}`);
        console.log(`  생성일: ${team.createdAt}`);
        console.log('');
      });
    } else {
      console.log('\n❌ 팀 데이터가 없습니다.');
    }
    
    if (userCount > 0) {
      console.log('\n=== 사용자 목록 ===');
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          role: true
        }
      });
      
      users.forEach(user => {
        console.log(`- ${user.name} (${user.email}) - ${user.role}`);
        console.log(`  생성일: ${user.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 데이터베이스 검사 오류:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeamData();