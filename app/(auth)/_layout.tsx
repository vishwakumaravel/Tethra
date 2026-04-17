import { Redirect, Stack } from 'expo-router';

import { LoadingView } from '@/components/ui';
import { useAuth } from '@/context/auth';

export default function AuthLayout() {
  const { hasCompletedProfile, isReady, session } = useAuth();

  if (!isReady) {
    return <LoadingView message="Loading your Tethra access..." />;
  }

  if (session) {
    return <Redirect href={hasCompletedProfile ? '/(app)' : '/(onboarding)/profile'} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
