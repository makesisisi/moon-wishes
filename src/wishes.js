import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const isLive = Boolean(url && key);
const supabase = isLive ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
const storageKey = 'moon-wishes-preview-v1';

function readLocal() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || []; }
  catch { return []; }
}

export function createWishStore() {
  if (!isLive) return {
    async load() { const items = readLocal(); return { items, total: items.length }; },
    async send({ content, nickname }) {
      const previous = readLocal();
      if (previous[0] && Date.now() - new Date(previous[0].created_at).getTime() < 15000) throw new Error('稍等 15 秒，再寄出下一句祝福。');
      const wish = { id: `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`, content, nickname, created_at: new Date().toISOString() };
      localStorage.setItem(storageKey, JSON.stringify([wish, ...previous].slice(0, 80)));
      return wish;
    },
    subscribe() { return () => {}; },
  };

  return {
    async load() {
      const { data, count, error } = await supabase.from('wishes').select('id,nickname,content,created_at', { count: 'exact' }).eq('status', 'approved').order('created_at', { ascending: false }).limit(80);
      if (error) throw error;
      return { items: data, total: count || 0 };
    },
    async send({ content, nickname }) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }
      const { data, error } = await supabase.from('wishes').insert({ content, nickname }).select('id,nickname,content,created_at').single();
      if (error) {
        if (error.message?.includes('15 seconds')) throw new Error('稍等 15 秒，再寄出下一句祝福。');
        throw error;
      }
      return data;
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
