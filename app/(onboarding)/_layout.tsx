import { Redirect, Stack } from 'expo-router';

import { LoadingView } from '@/components/ui';
import { useAuth } from '@/context/auth';

export default function OnboardingLayout() {
  const { hasCompletedProfile, isReady, session } = useAuth();

  if (!isReady) {
    return <LoadingView message="Preparing your setup..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  if (hasCompletedProfile) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
