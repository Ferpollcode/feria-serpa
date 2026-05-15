import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { createDemoState, normalizeState } from "../src/utils.js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const state = normalizeState(createDemoState());

const { error } = await supabase.from("app_state").upsert({
  key: "feria-serpa",
  data: state,
  updated_at: new Date().toISOString(),
});

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Estado guardado en Supabase: ${state.users.length} usuarios, ${state.puestos.length} puestos.`);
