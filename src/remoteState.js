import { supabase } from "./supabaseClient.js";
import { normalizeState } from "./utils.js";

const stateTable = "app_state";
const stateKey = "feria-serpa";

export async function loadRemoteState(localState) {
  const normalizedLocalState = normalizeState(localState);
  if (!supabase) return { state: normalizedLocalState, source: "local" };

  const { data, error } = await supabase
    .from(stateTable)
    .select("data")
    .eq("key", stateKey)
    .maybeSingle();

  if (error) throw error;

  if (data?.data) {
    const remoteState = normalizeState(data.data);
    if (JSON.stringify(remoteState) !== JSON.stringify(data.data)) await saveRemoteState(remoteState);
    return { state: remoteState, source: "supabase" };
  }

  await saveRemoteState(normalizedLocalState);
  return { state: normalizedLocalState, source: "local-seeded" };
}

export async function saveRemoteState(state) {
  if (!supabase) return;

  const { error } = await supabase.from(stateTable).upsert({
    key: stateKey,
      data: normalizeState(state),
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export function subscribeToRemoteState(onState) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel("app-state")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: stateTable, filter: `key=eq.${stateKey}` },
      (payload) => {
        if (payload.new?.data) onState(normalizeState(payload.new.data));
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
