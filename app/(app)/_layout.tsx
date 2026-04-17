import { Redirect, Stack } from 'expo-router';

import { LoadingView } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useRelationship } from '@/context/relationship';

export default function SignedInLayout() {
  const { hasCompletedProfile, isReady, session } = useAuth();
  const { isLoading } = useRelationship();

  if (!isReady) {
    return <LoadingView message="Restoring your Tethra space..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  if (!hasCompletedProfile) {
    return <Redirect href="/(onboarding)/profile" />;
  }

  if (isLoading) {
    return <LoadingView message="Checking your relationship state..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
