import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

/**
 * Cliente con **service_role** solo para DB, Storage y Auth Admin.
 * No usar aquí `signInWithPassword`: dejaría sesión de usuario y PostgREST aplicaría RLS
 * (con clave anon verías solo tu propio perfil en listados como GET /api/users).
 */
export const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Cliente efímero con service_role solo para login si no hay anon key (misma clave que arriba,
 * pero instancia distinta para no mezclar sesión con el singleton `supabase`).
 */
export function createEphemeralServiceClient() {
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente anon: login (signInWithPassword), refresh, reset password. Nueva instancia por llamada. */
export function getSupabaseAuthClient() {
  if (!config.supabase.anonKey) return null;
  return createClient(config.supabase.url, config.supabase.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
