import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const isLive = Boolean(url && key);
const supabase = isLive ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
const storageKey = 'moon-wishes-preview-v1';
const ritualStorageKey = 'moon-wishes-rituals-v1';

function readLocal() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || []; }
  catch { return []; }
}

function readLocalRituals() {
  try { return JSON.parse(localStorage.getItem(ritualStorageKey)) || []; }
  catch { return []; }
}

export function createWishStore() {
  if (!isLive) return {
    async load() { const items = readLocal(); return { items, total: items.length }; },
    async loadRituals() {
      const joined = readLocalRituals();
      return {
        counts: {
          mooncake: joined.includes('mooncake') ? 1 : 0,
          moonwatch: joined.includes('moonwatch') ? 1 : 0,
        },
        joined,
      };
    },
    async send({ content, nickname }) {
      const previous = readLocal();
      if (previous[0] && Date.now() - new Date(previous[0].created_at).getTime() < 15000) throw new Error('稍等 15 秒，再寄出下一句祝福。');
      const wish = { id: `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`, content, nickname, created_at: new Date().toISOString() };
      localStorage.setItem(storageKey, JSON.stringify([wish, ...previous].slice(0, 80)));
      return wish;
    },
    async sendRitual(kind) {
      const joined = readLocalRituals();
      if (joined.includes(kind)) return { kind, duplicate: true };
      localStorage.setItem(ritualStorageKey, JSON.stringify([...joined, kind]));
      return { kind, duplicate: false };
    },
    subscribe() { return () => {}; },
  };

  async function ensureSession() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (session) return session;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.session;
  }

  return {
    async load() {
      const { data, count, error } = await supabase.from('wishes').select('id,nickname,content,created_at', { count: 'exact' }).eq('status', 'approved').order('created_at', { ascending: false }).limit(80);
      if (error) throw error;
      return { items: data, total: count || 0 };
    },
    async loadRituals() {
      const kinds = ['mooncake', 'moonwatch'];
      const results = await Promise.all(kinds.map(kind => supabase
        .from('moon_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('kind', kind)));
      const problem = results.find(result => result.error)?.error;
      if (problem) throw problem;
      return {
        counts: Object.fromEntries(kinds.map((kind, index) => [kind, results[index].count || 0])),
        joined: readLocalRituals(),
      };
    },
    async send({ content, nickname }) {
      await ensureSession();
      const { data, error } = await supabase.from('wishes').insert({ content, nickname }).select('id,nickname,content,created_at').single();
      if (error) {
        if (error.message?.includes('15 seconds')) throw new Error('稍等 15 秒，再寄出下一句祝福。');
        throw error;
      }
      return data;
    },
    async sendRitual(kind) {
      await ensureSession();
      const { data, error } = await supabase
        .from('moon_interactions')
        .insert({ kind })
        .select('id,kind,created_at')
        .single();
      if (error?.code === '23505') {
        const joined = new Set(readLocalRituals());
        joined.add(kind);
        localStorage.setItem(ritualStorageKey, JSON.stringify([...joined]));
        return { kind, duplicate: true };
      }
      if (error) throw error;
      const joined = new Set(readLocalRituals());
      joined.add(kind);
      localStorage.setItem(ritualStorageKey, JSON.stringify([...joined]));
      return { ...data, duplicate: false };
    },
    subscribe(onWish, onConnected, onDisconnected) {
      const channel = supabase.channel('moon-wishes-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wishes' }, payload => {
        if (payload.new.status === 'approved') onWish(payload.new);
      }).subscribe(status => {
        if (status === 'SUBSCRIBED') onConnected?.();
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onDisconnected?.();
      });
      return () => { supabase.removeChannel(channel); };
    },
  };
}
