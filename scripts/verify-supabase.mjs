import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const skipRealtime = process.env.SKIP_REALTIME === '1';

if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error('Set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY before running this check.');
}

const client = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const waitFor = (promise, label, timeout = 12_000) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), timeout)),
]);

let userId;
let channel;

try {
  const { data: authData, error: authError } = await client.auth.signInAnonymously();
  if (authError) throw authError;
  userId = authData.user?.id;
  if (!userId) throw new Error('Anonymous sign-in did not return a user.');

  const marker = `deployment-${Date.now()}`;
  let receivedEvent;
  if (!skipRealtime) {
    let resolveSubscribed;
    let rejectSubscribed;
    const subscribed = new Promise((resolve, reject) => {
      resolveSubscribed = resolve;
      rejectSubscribed = reject;
    });
    let resolveEvent;
    receivedEvent = new Promise(resolve => { resolveEvent = resolve; });

    channel = client.channel(`deployment-check-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wishes' }, payload => {
        if (payload.new.content === marker) resolveEvent(payload.new);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') resolveSubscribed();
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          rejectSubscribed(new Error(`Realtime subscription failed: ${status}`));
        }
      });

    await waitFor(subscribed, 'Realtime subscription');
  }

  const { data: inserted, error: insertError } = await client
    .from('wishes')
    .insert({ nickname: '部署测试', content: marker })
    .select('id,nickname,content,created_at')
    .single();
  if (insertError) throw insertError;

  const { data: selected, error: selectError } = await client
    .from('wishes')
    .select('id,content')
    .eq('id', inserted.id)
    .single();
  if (selectError) throw selectError;
  if (selected.content !== marker) throw new Error('Selected row content did not match.');

  const { error: rateLimitError } = await client
    .from('wishes')
    .insert({ nickname: '部署测试', content: `${marker}-second` });
  const rateLimitElapsed = Date.now() - new Date(inserted.created_at).getTime();
  if (!rateLimitError && rateLimitElapsed < 15_000) {
    throw new Error(`The server-side 15-second submission limit was not enforced: ${JSON.stringify(rateLimitError)}`);
  }
  if (rateLimitError && !rateLimitError.message?.includes('15 seconds')) throw rateLimitError;
  const rateLimit = rateLimitError ? true : 'skipped_slow_network';

  const { count: ritualCountBefore, error: ritualCountBeforeError } = await client
    .from('moon_interactions')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'mooncake');
  if (ritualCountBeforeError) throw ritualCountBeforeError;

  const { data: ritual, error: ritualInsertError } = await client
    .from('moon_interactions')
    .insert({ kind: 'mooncake' })
    .select('id,kind,created_at')
    .single();
  if (ritualInsertError) throw ritualInsertError;
  if (ritual.kind !== 'mooncake') throw new Error('Inserted ritual kind did not match.');

  const { error: ritualDuplicateError } = await client
    .from('moon_interactions')
    .insert({ kind: 'mooncake' });
  if (ritualDuplicateError?.code !== '23505') {
    throw new Error('The one-participation-per-ritual rule was not enforced.');
  }

  const { count: ritualCountAfter, error: ritualCountAfterError } = await client
    .from('moon_interactions')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'mooncake');
  if (ritualCountAfterError) throw ritualCountAfterError;
  if (ritualCountAfter !== ritualCountBefore + 1) {
    throw new Error('The ritual count did not increase after insertion.');
  }

  if (!skipRealtime) {
    const realtimeRow = await waitFor(receivedEvent, 'Realtime INSERT event');
    if (realtimeRow.id !== inserted.id) throw new Error('Realtime delivered the wrong row.');
  }

  console.log(JSON.stringify({
    anonymousAuth: true,
    insert: true,
    select: true,
    rituals: true,
    ritualDeduplication: true,
    realtime: skipRealtime ? 'skipped' : true,
    rateLimit,
  }));
} finally {
  if (channel) await client.removeChannel(channel);
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Verification passed, but test-user cleanup failed: ${error.message}`);
  }
}
