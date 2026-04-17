import { Redirect } from 'expo-router';

import { LoadingView } from '@/components/ui';
import { useAuth } from '@/context/auth';

export default function IndexRoute() {
  const { hasCompletedProfile, isReady, session } = useAuth();

  if (!isReady) {
    return <LoadingView message="Rebuilding your connection..." />;
  }

  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  if (!hasCompletedProfile) {
    return <Redirect href="/(onboarding)/profile" />;
  }

  return <Redirect href="/(app)" />;
}
