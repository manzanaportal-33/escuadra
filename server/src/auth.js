import { supabase, getSupabaseAuthClient, createEphemeralServiceClient } from './supabase.js';

/**
 * Cliente solo para sign-in: nunca el singleton `supabase`, para no acoplar JWT de usuario a las consultas .from().
 */
function getClientForSignIn() {
  return getSupabaseAuthClient() ?? createEphemeralServiceClient();
}

async function fetchCuerpoIdsForProfile(profileId) {
  const { data, error } = await supabase.from('profile_cuerpo').select('cuerpo_id').eq('profile_id', profileId);
  if (error || !data?.length) return [];
  return [...new Set(data.map((r) => r.cuerpo_id))];
}

export async function login(email, password) {
  const authOnly = getClientForSignIn();
  const { data: authData, error: authError } = await authOnly.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (authError || !authData?.user) {
    const msg = authError?.message || 'Credenciales inválidas';
    console.log('[Login] Auth falló:', authError?.message, '| email:', email?.trim?.());
    return { success: false, error: msg };
  }

  let profile = (await supabase
    .from('profiles')
    .select('id, name, apellido, user_level, grado, status')
    .eq('id', authData.user.id)
    .single()).data;

  if (!profile) {
    const meta = authData.user.user_metadata || {};
    const { error: insertError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name: meta.name || meta.full_name || '',
      apellido: meta.apellido || '',
      user_level: 3,
      grado: 0,
      status: 1,
    });
    if (insertError) return { success: false, error: insertError.message || 'Error al crear perfil' };
    profile = (await supabase
      .from('profiles')
      .select('id, name, apellido, user_level, grado, status')
      .eq('id', authData.user.id)
      .single()).data;
  }

  if (!profile) return { success: false, error: 'Perfil no encontrado' };
  if (profile.status !== 1) return { success: false, error: 'Cuenta desactivada' };

  await supabase
    .from('profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', authData.user.id);

  const cuerpo_ids = await fetchCuerpoIdsForProfile(profile.id);

  return {
    success: true,
    data: {
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresAt: authData.session.expires_at,
      user: {
        id: profile.id,
        name: profile.name,
        apellido: profile.apellido,
        email: authData.user.email,
        user_level: profile.user_level,
        grado: profile.grado,
        cuerpo_ids,
        cuerpo_id: cuerpo_ids[0] ?? null,
      },
    },
  };
}

export async function forgotPassword(email, redirectTo) {
  const url = (redirectTo && String(redirectTo).trim()) || undefined;
  const client = getSupabaseAuthClient() ?? createEphemeralServiceClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: url,
  });
  if (error) {
    console.error('[forgotPassword] Supabase error:', error.message, error.status);
    const isRateLimit = /rate limit|too many|429/i.test(error.message);
    const message = isRateLimit
      ? 'Se enviaron demasiados correos. Esperá aproximadamente 1 hora y volvé a intentar.'
      : error.message;
    return { success: false, error: message };
  }
  return { success: true };
}

/** Cambio de contraseña autenticado: verifica la actual con signIn y actualiza con admin API. */
export async function changePassword(userId, email, currentPassword, newPassword) {
  const cur = String(currentPassword ?? '');
  const neu = String(newPassword ?? '');
  if (!cur) return { success: false, error: 'Ingresá tu contraseña actual' };
  if (neu.length < 6) return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' };
  if (cur === neu) return { success: false, error: 'La nueva contraseña debe ser distinta a la actual' };

  const authOnly = getClientForSignIn();
  const { error: signErr } = await authOnly.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password: cur,
  });
  if (signErr) {
    return { success: false, error: 'La contraseña actual no es correcta' };
  }

  const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
    password: neu,
  });
  if (updateErr) {
    return { success: false, error: updateErr.message || 'No se pudo actualizar la contraseña' };
  }
  return { success: true };
}

/** Restablecimiento de contraseña desde el enlace del correo. */
export async function confirmResetPassword(accessToken, newPassword) {
  if (!accessToken || !newPassword || String(newPassword).length < 6) {
    return { success: false, error: 'Token y contraseña (mínimo 6 caracteres) requeridos' };
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user) {
    return { success: false, error: 'Enlace inválido o expirado. Solicitá un nuevo restablecimiento.' };
  }
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: String(newPassword),
  });
  if (updateError) {
    console.log('[confirmResetPassword]', updateError.message);
    return { success: false, error: updateError.message || 'No se pudo actualizar la contraseña' };
  }
  return { success: true };
}

export async function getUserFromToken(accessToken) {
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, apellido, user_level, grado')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  const cuerpo_ids = await fetchCuerpoIdsForProfile(profile.id);
  return { ...profile, cuerpo_ids, cuerpo_id: cuerpo_ids[0] ?? null, email: user.email };
}

/**
 * Refresca la sesión con el refresh_token y devuelve el nuevo access_token y datos de usuario.
 * Requiere SUPABASE_ANON_KEY en .env. Si no está configurado, devuelve null.
 */
export async function refreshSession(refreshToken) {
  if (!refreshToken || typeof refreshToken !== 'string') return null;
  const authClient = getSupabaseAuthClient();
  if (!authClient) return null;
  const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data?.session) return null;
  const session = data.session;
  const profile = (await supabase
    .from('profiles')
    .select('id, name, apellido, user_level, grado')
    .eq('id', session.user.id)
    .single()).data;
  if (!profile) return null;
  const cuerpo_ids = await fetchCuerpoIdsForProfile(profile.id);
  return {
    token: session.access_token,
    refreshToken: session.refresh_token ?? refreshToken,
    expiresAt: session.expires_at,
    user: {
      id: profile.id,
      name: profile.name,
      apellido: profile.apellido,
      email: session.user?.email,
      user_level: profile.user_level,
      grado: profile.grado,
      cuerpo_ids,
      cuerpo_id: cuerpo_ids[0] ?? null,
    },
  };
}
