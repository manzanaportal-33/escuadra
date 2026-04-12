import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPath } from '@/config/api';

const AUTH_KEY = 'escuadra_user_session';
const TOKEN_KEY = 'escuadra_token';
const REFRESH_KEY = 'escuadra_refresh_token';

export type User = {
  id: string;
  email: string;
  name: string;
  apellido: string;
  nombre: string; // name + apellido para mostrar
  user_level: number;
  grado: number;
  /** Primer cuerpo (compatibilidad); preferir `cuerpo_ids`. */
  cuerpo_id: number | null;
  cuerpo_ids: number[];
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  /** Refresca la sesión con el refresh_token. Devuelve el nuevo access_token o null si falla. */
  refreshSession: () => Promise<string | null>;
  /** Trae perfil actual desde la API (grado, nivel, etc.) y actualiza estado + almacenamiento local. */
  syncUserProfile: () => Promise<void>;
  /**
   * fetch con token; si responde 401 "Token inválido o expirado" intenta refresh y reintenta una vez.
   * Si el refresh falla hace logout y lanza error con message 'SESSION_EXPIRED' (no mostrar mensaje, ya redirige a login).
   */
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function buildUser(apiUser: {
  id: string;
  email: string;
  name: string;
  apellido: string;
  user_level: number;
  grado: number;
  cuerpo_id: number | null;
  cuerpo_ids?: number[] | null;
}): User {
  const rawIds = Array.isArray(apiUser.cuerpo_ids) ? apiUser.cuerpo_ids : [];
  const cuerpo_ids = [...new Set(rawIds.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))];
  const cuerpo_id =
    apiUser.cuerpo_id != null && apiUser.cuerpo_id !== ''
      ? Number(apiUser.cuerpo_id)
      : cuerpo_ids[0] ?? null;
  return {
    ...apiUser,
    cuerpo_id: Number.isInteger(cuerpo_id) ? cuerpo_id : null,
    cuerpo_ids,
    nombre: [apiUser.name, apiUser.apellido].filter(Boolean).join(' ').trim() || apiUser.email,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStoredSession = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored && storedToken) {
        const parsed = JSON.parse(stored) as Omit<User, 'nombre'> & { name: string; apellido: string };
        setUser(buildUser(parsed as unknown as Parameters<typeof buildUser>[0]));
        setToken(storedToken);
      } else {
        setUser(null);
        setToken(null);
      }
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncUserProfile = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!storedToken) return;
      const res = await fetch(apiPath('/api/users/me'), {
        headers: { Authorization: `Bearer ${storedToken}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id) return;
      const userToStore = buildUser({
        id: data.id,
        email: typeof data.email === 'string' ? data.email : '',
        name: data.name ?? '',
        apellido: data.apellido ?? '',
        user_level: data.user_level ?? 3,
        grado: data.grado != null && data.grado !== '' ? Number(data.grado) : 0,
        cuerpo_id: data.cuerpo_id ?? null,
        cuerpo_ids: Array.isArray(data.cuerpo_ids) ? data.cuerpo_ids : null,
      });
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userToStore));
      setUser(userToStore);
    } catch {
      /* ignorar: sin red o token inválido */
    }
  }, []);

  useEffect(() => {
    loadStoredSession();
  }, [loadStoredSession]);

  /** Tras restaurar token (o login), alinear grado con la base por si cambió mientras la app estaba cerrada. */
  useEffect(() => {
    if (token) void syncUserProfile();
  }, [token, syncUserProfile]);

  /** Al volver a primer plano, actualizar perfil por si el admin lo cambió en servidor. */
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void syncUserProfile();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [syncUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim || !password) {
      return { ok: false, error: 'Ingresá email y contraseña' };
    }
    try {
      const res = await fetch(apiPath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrim, password }),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const serverMessage = typeof data?.error === 'string' ? data.error : null;
        return { ok: false, error: serverMessage || 'Usuario o contraseña incorrectos' };
      }
      const apiUser = data.user;
      const newToken = data.token;
      const newRefreshToken = data.refreshToken;
      if (!apiUser || !newToken) {
        return { ok: false, error: 'Respuesta inválida del servidor' };
      }
      const userToStore = buildUser({
        id: apiUser.id,
        email: apiUser.email ?? emailTrim,
        name: apiUser.name ?? '',
        apellido: apiUser.apellido ?? '',
        user_level: apiUser.user_level ?? 3,
        grado: apiUser.grado ?? 0,
        cuerpo_id: apiUser.cuerpo_id ?? null,
        cuerpo_ids: Array.isArray(apiUser.cuerpo_ids) ? apiUser.cuerpo_ids : null,
      });
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      if (newRefreshToken) await AsyncStorage.setItem(REFRESH_KEY, newRefreshToken);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userToStore));
      setToken(newToken);
      setUser(userToStore);
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error de conexión';
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('failed')) {
        return {
          ok: false,
          error: 'No se pudo conectar a la API. ¿Está encendida? Revisá EXPO_PUBLIC_API_URL en .env.',
        };
      }
      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
      if (!refreshToken) return null;
      const res = await fetch(apiPath('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) return null;
      const userToStore = data.user
        ? buildUser({
            id: data.user.id,
            email: data.user.email ?? '',
            name: data.user.name ?? '',
            apellido: data.user.apellido ?? '',
            user_level: data.user.user_level ?? 3,
            grado: data.user.grado ?? 0,
            cuerpo_id: data.user.cuerpo_id ?? null,
            cuerpo_ids: Array.isArray(data.user.cuerpo_ids) ? data.user.cuerpo_ids : null,
          })
        : null;
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      if (data.refreshToken) await AsyncStorage.setItem(REFRESH_KEY, data.refreshToken);
      if (userToStore) await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userToStore));
      setToken(data.token);
      if (userToStore) setUser(userToStore);
      return data.token;
    } catch {
      return null;
    }
  }, []);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const getToken = () => token;
      const doFetch = (t: string | null) =>
        fetch(url, {
          cache: 'no-store',
          ...options,
          headers: {
            ...options.headers,
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
        });
      let res = await doFetch(getToken());
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        const isTokenError =
          typeof data?.error === 'string' &&
          (data.error.includes('Token inválido') || data.error.includes('expirado'));
        if (isTokenError) {
          const newToken = await refreshSession();
          if (newToken) {
            res = await doFetch(newToken);
            return res;
          }
          await logout();
          throw new Error('SESSION_EXPIRED');
        }
      }
      return res;
    },
    [token, refreshSession, logout]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshSession,
        syncUserProfile,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
