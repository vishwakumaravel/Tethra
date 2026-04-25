import { AuthError, Session, User } from '@supabase/supabase-js';
import * as React from 'react';

import { beginAppleSignIn } from '@/lib/apple-auth';
import { trackEvent } from '@/lib/analytics';
import { hasSupabaseCredentials, supabase } from '@/lib/supabase';
import { Database, Profile } from '@/types/database';
import { ProfileFormValues } from '@/validation/forms';

type AuthResult = {
  ok: boolean;
  message?: string;
};

type PhoneAuthResult = AuthResult & {
  normalizedPhone?: string;
};

type AuthContextValue = {
  hasCompletedProfile: boolean;
  isBusy: boolean;
  isConfigured: boolean;
  isReady: boolean;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  saveProfile: (values: ProfileFormValues) => Promise<AuthResult>;
  sendPhoneOtp: (phone: string) => Promise<PhoneAuthResult>;
  signInWithApple: () => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<AuthResult>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

type ProfileUpsert = Database['public']['Tables']['profiles']['Insert'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);

  const syncProfile = React.useCallback(async (user: User | null) => {
    if (!user) {
      setProfile(null);
      return;
    }

    const nextProfile = await loadOrSeedProfile(user);
    setProfile(nextProfile);
  }, []);

  const refreshProfile = React.useCallback(async () => {
    await syncProfile(session?.user ?? null);
  }, [session?.user, syncProfile]);

  React.useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(existingSession);
      await syncProfile(existingSession?.user ?? null);

      if (isMounted) {
        setIsReady(true);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void syncProfile(nextSession?.user ?? null);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    if (!hasSupabaseCredentials) {
      return { ok: false, message: 'Add your Supabase URL and anon key first.' };
    }

    setIsBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsBusy(false);

    if (error) {
      return { ok: false, message: formatAuthError(error) };
    }

    return { ok: true, message: 'Signed in. Routing you forward...' };
  };

  const signUpWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    if (!hasSupabaseCredentials) {
      return { ok: false, message: 'Add your Supabase URL and anon key first.' };
    }

    setIsBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setIsBusy(false);

    if (error) {
      return { ok: false, message: formatAuthError(error) };
    }

    if (data.session?.user) {
      await syncProfile(data.session.user);
      void trackEvent('sign_up_completed', {
        auth_method: 'email',
        surface: 'email_auth',
      });
      return { ok: true, message: 'Account created. Finish your profile next.' };
    }

    return {
      ok: true,
      message: 'Account created. Check your inbox if email confirmation is enabled in Supabase.',
    };
  };

  const sendPhoneOtp = async (phone: string): Promise<PhoneAuthResult> => {
    if (!hasSupabaseCredentials) {
      return { ok: false, message: 'Add your Supabase URL and anon key first.' };
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    setIsBusy(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    });

    setIsBusy(false);

    if (error) {
      return { ok: false, message: formatAuthError(error) };
    }

    return {
      ok: true,
      message: 'Code sent. Enter the 6-digit SMS code to continue.',
      normalizedPhone,
    };
  };

  const verifyPhoneOtp = async (phone: string, token: string): Promise<AuthResult> => {
    if (!hasSupabaseCredentials) {
      return { ok: false, message: 'Add your Supabase URL and anon key first.' };
    }

    setIsBusy(true);

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    setIsBusy(false);

    if (error) {
      return { ok: false, message: formatAuthError(error) };
    }

    return { ok: true, message: 'Phone verified. Routing you forward...' };
  };

  const signInWithApple = async (): Promise<AuthResult> => {
    if (!hasSupabaseCredentials) {
      return { ok: false, message: 'Add your Supabase URL and anon key first.' };
    }

    setIsBusy(true);

    try {
      const appleSignIn = await beginAppleSignIn();

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: appleSignIn.identityToken,
        nonce: appleSignIn.rawNonce,
      });

      if (error) {
        return { ok: false, message: formatAuthError(error) };
      }

      const fullName = [appleSignIn.givenName, appleSignIn.familyName].filter(Boolean).join(' ').trim();

      if (data.user) {
        await seedProfile(data.user, fullName ? { display_name: fullName } : undefined);
        void trackEvent('sign_up_completed', {
          auth_method: 'apple',
          surface: 'apple_auth',
        });
      }

      return { ok: true, message: 'Apple sign-in complete. Routing you forward...' };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Apple sign-in failed.' };
    } finally {
      setIsBusy(false);
    }
  };

  const saveProfile = async (values: ProfileFormValues): Promise<AuthResult> => {
    if (!session?.user) {
      return { ok: false, message: 'You need an authenticated session first.' };
    }

    setIsBusy(true);

    const payload: ProfileUpsert = {
      id: session.user.id,
      display_name: values.displayName.trim(),
      avatar_url: values.avatarUrl?.trim() ? values.avatarUrl.trim() : null,
      partner_status: profile?.partner_status ?? 'unlinked',
    };

    if (session.user.email) {
      payload.email = session.user.email;
    }

    if (session.user.phone) {
      payload.phone = session.user.phone;
    }

    const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select().single();

    setIsBusy(false);

    if (error) {
      return { ok: false, message: error.message };
    }

    setProfile(data);
    return { ok: true, message: 'Profile saved. Welcome to Phase 1.' };
  };

  const signOut = async () => {
    setIsBusy(true);
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setIsBusy(false);
  };

  const value = React.useMemo<AuthContextValue>(
    () => ({
      hasCompletedProfile: Boolean(profile?.display_name?.trim()),
      isBusy,
      isConfigured: hasSupabaseCredentials,
      isReady,
      profile,
      refreshProfile,
      saveProfile,
      sendPhoneOtp,
      session,
      signInWithApple,
      signInWithEmail,
      signOut,
      signUpWithEmail,
      verifyPhoneOtp,
    }),
    [isBusy, isReady, profile, refreshProfile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

async function loadOrSeedProfile(user: User): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  if (error) {
    return null;
  }

  if (!data) {
    return seedProfile(user);
  }

  const needsSync = (user.email && data.email !== user.email) || (user.phone && data.phone !== user.phone);

  if (needsSync) {
    return seedProfile(user);
  }

  return data;
}

async function seedProfile(user: User, extras?: Partial<Profile>): Promise<Profile | null> {
  const payload: ProfileUpsert = {
    id: user.id,
    partner_status: 'unlinked',
  };

  if (user.email) {
    payload.email = user.email;
  }

  if (user.phone) {
    payload.phone = user.phone;
  }

  if (extras?.display_name) {
    payload.display_name = extras.display_name;
  }

  if (extras?.avatar_url) {
    payload.avatar_url = extras.avatar_url;
  }

  const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select().single();

  if (error) {
    return null;
  }

  return data;
}

function formatAuthError(error: AuthError) {
  if (error.message.toLowerCase().includes('invalid login credentials')) {
    return 'Those credentials do not match an existing account.';
  }

  if (error.message.toLowerCase().includes('email not confirmed')) {
    return 'Confirm your email first, then sign in again.';
  }

  return error.message;
}

function normalizePhoneNumber(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    return digits;
  }

  const onlyDigits = digits.replace(/[^\d]/g, '');

  if (onlyDigits.length === 10) {
    return `+1${onlyDigits}`;
  }

  return `+${onlyDigits}`;
}
