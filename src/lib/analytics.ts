import { supabase } from '@/lib/supabase';
import { sanitizeAnalyticsProperties } from '@/logic/analytics';
import { AnalyticsEventName, AnalyticsProperties, Json } from '@/types/database';

export async function trackEvent(eventName: AnalyticsEventName, properties: AnalyticsProperties = {}) {
  const safeProperties = sanitizeAnalyticsProperties(properties);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const coupleId = typeof safeProperties.couple_id === 'string' ? safeProperties.couple_id : null;

  await supabase.from('analytics_events').insert({
    couple_id: coupleId,
    event_name: eventName,
    properties: safeProperties as Json,
    user_id: user.id,
  });
}
