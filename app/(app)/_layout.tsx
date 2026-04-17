import { Redirect, Stack } from 'expo-router';

import { LoadingView } from '@/components/ui';
import { useAuth } from '@/context/auth';

export default function SignedInLayout() {
  const { hasCompletedProfile, isReady, session } = useAuth();

  if (!isReady) {
    return <LoadingView message="Restoring your Tethra space..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  if (!hasCompletedProfile) {
    return <Redirect href="/(onboarding)/profile" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
