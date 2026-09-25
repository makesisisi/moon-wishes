import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  let resolveSubscribed;
  let rejectSubscribed;
  const subscribed = new Promise((resolve, reject) => {
    resolveSubscribed = resolve;
    rejectSubscribed = reject;
  });
  let resolveEvent;
  const receivedEvent = new Promise(resolve => { resolveEvent = resolve; });

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

  const { data: inserted, error: insertError } = await client
    .from('wishes')
    .insert({ nickname: '部署测试', content: marker })
    .select('id,nickname,content,created_at')
    .single();
  if (insertError) throw insertError;

  const realtimeRow = await waitFor(receivedEvent, 'Realtime INSERT event');
  if (realtimeRow.id !== inserted.id) throw new Error('Realtime delivered the wrong row.');

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
  if (!rateLimitError?.message?.includes('15 seconds')) {
    throw new Error('The server-side 15-second submission limit was not enforced.');
  }

  console.log(JSON.stringify({ anonymousAuth: true, insert: true, select: true, realtime: true, rateLimit: true }));
} finally {
  if (channel) await client.removeChannel(channel);
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Verification passed, but test-user cleanup failed: ${error.message}`);
  }
}
