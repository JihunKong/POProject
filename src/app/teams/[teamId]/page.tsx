import TeamDashboardClient from './TeamDashboardClient';

export default async function TeamDashboardPage({ 
  params 
}: { 
  params: Promise<{ teamId: string }> 
}) {
  const resolvedParams = await params;
  return <TeamDashboardClient teamId={resolvedParams.teamId} />;
}