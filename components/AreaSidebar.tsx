import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type MenuItem = {
  label: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const BIBLIOTECA_SUBMENU: { label: string; code: string }[] = [
  { label: 'Libros', code: 'libros' },
  { label: 'Planchas', code: 'planchas' },
];

const SECRETARIA_SUBMENU: { label: string; code: string }[] = [
  { label: 'Boletines', code: 'boletines' },
  { label: 'Comunicados', code: 'comunicados' },
  { label: 'Decretos', code: 'decretos' },
];

const TRAMITES_SUBMENU: { label: string; tipo: string }[] = [
  { label: 'Solicitud de Ingreso', tipo: 'ingreso' },
  { label: 'Solicitud de Re-Ingreso', tipo: 'reingreso' },
  { label: 'Ascenso Troncal', tipo: 'ascenso' },
  { label: 'Dimisión', tipo: 'dimision' },
  { label: 'Pase', tipo: 'pase' },
];

const MENU_ITEMS_BASE: MenuItem[] = [
  { label: 'Cuerpos', href: '/area/cuerpos', icon: 'business' },
  { label: 'Tesorería', href: '/area/tesoreria', icon: 'wallet' },
];

/** Solo hermanos: el admin gestiona contacto en «Mensajes (contacto)». */
const MENU_ITEMS_CONTACTO_HERMANO: MenuItem[] = [
  { label: 'Contáctenos', href: '/area/contacto', icon: 'mail-outline' },
  { label: 'Mis consultas', href: '/area/contacto/mis-mensajes', icon: 'inbox-outline' },
];

const ADMIN_ITEMS: MenuItem[] = [
  { label: 'Hermanos', href: '/area/admin/hermanos', icon: 'people' },
  { label: 'Cuerpos', href: '/area/admin/cuerpos', icon: 'business' },
  { label: 'Mensajes (contacto)', href: '/area/admin/contacto', icon: 'chatbubbles-outline' },
  { label: 'Solicitudes', href: '/area/admin/tramites', icon: 'document-text' },
  { label: 'Otros Orientes', href: '/area/admin/orientes', icon: 'globe' },
  { label: 'Estados de cuenta', href: '/area/admin/tesoreria', icon: 'wallet' },
  {
    label: 'Resumen Estado de Cuentas',
    href: '/area/admin/resumen-estado-cuentas',
    icon: 'stats-chart',
  },
];

const CAMBIO_CONTRASENA: MenuItem = {
  label: 'Cambio de contraseña',
  href: '/area/cambio-contrasena',
  icon: 'key-outline',
};

export function AreaSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.user_level === 1;
  const [bibliotecaOpen, setBibliotecaOpen] = useState(() => {
    const path = pathname.replace(/\/$/, '');
    return path === '/area/biblioteca' || path.startsWith('/area/biblioteca/');
  });
  const [secretariaOpen, setSecretariaOpen] = useState(() => {
    const path = pathname.replace(/\/$/, '');
    return path === '/area/biblioteca' || path.startsWith('/area/biblioteca/');
  });
  const [tramitesOpen, setTramitesOpen] = useState(() => {
    const path = pathname.replace(/\/$/, '');
    return path === '/area/tramites' || path.startsWith('/area/tramites/');
  });

  useEffect(() => {
    const path = pathname.replace(/\/$/, '');
    if (path === '/area/biblioteca' || path.startsWith('/area/biblioteca/')) {
      setBibliotecaOpen(true);
      setSecretariaOpen(true);
    }
    if (path === '/area/tramites' || path.startsWith('/area/tramites/')) {
      setTramitesOpen(true);
    }
  }, [pathname]);

  const isBibliotecaActive = () => {
    const path = pathname.replace(/\/$/, '');
    return path === '/area/biblioteca' || BIBLIOTECA_SUBMENU.some((s) => path === `/area/biblioteca/${s.code}` || path.startsWith(`/area/biblioteca/${s.code}/`));
  };

  const isActive = (href: string) => {
    const path = pathname.replace(/\/$/, '');
    if (href === '/area/biblioteca') {
      return path === '/area/biblioteca' || path.startsWith('/area/biblioteca/');
    }
    return path === href || path.startsWith(href + '/');
  };

  const isSubItemActive = (code: string) => {
    const path = pathname.replace(/\/$/, '');
    return path === `/area/biblioteca/${code}` || path.startsWith(`/area/biblioteca/${code}/`);
  };

  const isSecretariaActive = () => {
    const path = pathname.replace(/\/$/, '');
    return path === '/area/biblioteca' || SECRETARIA_SUBMENU.some((s) => path === `/area/biblioteca/${s.code}` || path.startsWith(`/area/biblioteca/${s.code}/`));
  };

  const isTramitesActive = () => {
    const path = pathname.replace(/\/$/, '');
    return path === '/area/tramites' || path.startsWith('/area/tramites/');
  };

  const isTramitesSubItemActive = (tipo: string) => {
    const path = pathname.replace(/\/$/, '');
    return path === `/area/tramites/nuevo/${tipo}`;
  };

  const isMisSolicitudesActive = () => {
    const path = pathname.replace(/\/$/, '');
    return path === '/area/tramites/mis-solicitudes';
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.menuHeader}>
        <Ionicons
          name={isAdmin ? 'shield-checkmark' : 'grid-outline'}
          size={18}
          color={colors.primaryLight}
        />
        <Text style={styles.menuTitle}>{isAdmin ? 'Administración' : 'Menú del área'}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.areaCard}>
        {/* Biblioteca con submenú */}
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={[styles.item, isBibliotecaActive() && styles.itemActive]}
            onPress={() => setBibliotecaOpen((o) => !o)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="library"
              size={20}
              color={isBibliotecaActive() ? colors.primaryLight : colors.textSecondary}
            />
            <Text
              style={[styles.itemLabel, isBibliotecaActive() && styles.itemLabelActive]}
              numberOfLines={1}
            >
              Biblioteca
            </Text>
            <Ionicons
              name={bibliotecaOpen ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {bibliotecaOpen && (
            <View style={styles.submenu}>
              {BIBLIOTECA_SUBMENU.map((sub) => {
                const active = isSubItemActive(sub.code);
                return (
                  <TouchableOpacity
                    key={sub.code}
                    style={[styles.subItem, active && styles.subItemActive]}
                    onPress={() => router.push(`/area/biblioteca/${sub.code}` as any)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="ellipse"
                      size={6}
                      color={active ? colors.primaryLight : colors.borderLight}
                      style={styles.subBullet}
                    />
                    <Text
                      style={[styles.subItemLabel, active && styles.subItemLabelActive]}
                      numberOfLines={2}
                    >
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Secretaría con submenú */}
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={[styles.item, isSecretariaActive() && styles.itemActive]}
            onPress={() => setSecretariaOpen((o) => !o)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="document-text"
              size={20}
              color={isSecretariaActive() ? colors.primaryLight : colors.textSecondary}
            />
            <Text
              style={[styles.itemLabel, isSecretariaActive() && styles.itemLabelActive]}
              numberOfLines={1}
            >
              Secretaría
            </Text>
            <Ionicons
              name={secretariaOpen ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {secretariaOpen && (
            <View style={styles.submenu}>
              {SECRETARIA_SUBMENU.map((sub) => {
                const active = isSubItemActive(sub.code);
                return (
                  <TouchableOpacity
                    key={sub.code}
                    style={[styles.subItem, active && styles.subItemActive]}
                    onPress={() => router.push(`/area/biblioteca/${sub.code}` as any)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="ellipse"
                      size={6}
                      color={active ? colors.primaryLight : colors.borderLight}
                      style={styles.subBullet}
                    />
                    <Text
                      style={[styles.subItemLabel, active && styles.subItemLabelActive]}
                      numberOfLines={2}
                    >
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Trámites en línea con submenú */}
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={[styles.item, isTramitesActive() && styles.itemActive]}
            onPress={() => setTramitesOpen((o) => !o)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="send"
              size={20}
              color={isTramitesActive() ? colors.primaryLight : colors.textSecondary}
            />
            <Text
              style={[styles.itemLabel, isTramitesActive() && styles.itemLabelActive]}
              numberOfLines={1}
            >
              Trámites en línea
            </Text>
            <Ionicons
              name={tramitesOpen ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {tramitesOpen && (
            <View style={styles.submenu}>
              {!isAdmin && (
                <TouchableOpacity
                  style={[styles.subItem, isMisSolicitudesActive() && styles.subItemActive]}
                  onPress={() => router.push('/area/tramites/mis-solicitudes' as any)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="ellipse"
                    size={6}
                    color={isMisSolicitudesActive() ? colors.primaryLight : colors.borderLight}
                    style={styles.subBullet}
                  />
                  <Text
                    style={[styles.subItemLabel, isMisSolicitudesActive() && styles.subItemLabelActive]}
                    numberOfLines={2}
                  >
                    Mis Solicitudes
                  </Text>
                </TouchableOpacity>
              )}
              {TRAMITES_SUBMENU.map((sub) => {
                const active = isTramitesSubItemActive(sub.tipo);
                return (
                  <TouchableOpacity
                    key={sub.tipo}
                    style={[styles.subItem, active && styles.subItemActive]}
                    onPress={() => router.push(`/area/tramites/nuevo/${sub.tipo}` as any)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="ellipse"
                      size={6}
                      color={active ? colors.primaryLight : colors.borderLight}
                      style={styles.subBullet}
                    />
                    <Text
                      style={[styles.subItemLabel, active && styles.subItemLabelActive]}
                      numberOfLines={2}
                    >
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {(isAdmin ? MENU_ITEMS_BASE : [...MENU_ITEMS_BASE, ...MENU_ITEMS_CONTACTO_HERMANO]).map((item) => {
          const active = isActive(item.href);
          return (
            <TouchableOpacity
              key={`${item.href}-${item.label}`}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => router.push(item.href as any)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? colors.primaryLight : colors.textSecondary}
              />
              <Text
                style={[styles.itemLabel, active && styles.itemLabelActive]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {isAdmin &&
          ADMIN_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <TouchableOpacity
                key={item.href}
                style={[styles.item, active && styles.itemActive]}
                onPress={() => router.push(item.href as any)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={active ? colors.primaryLight : colors.textSecondary}
                />
                <Text
                  style={[styles.itemLabel, active && styles.itemLabelActive]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

        <TouchableOpacity
          style={[styles.item, isActive(CAMBIO_CONTRASENA.href) && styles.itemActive]}
          onPress={() => router.push(CAMBIO_CONTRASENA.href as any)}
          activeOpacity={0.75}
        >
          <Ionicons
            name={CAMBIO_CONTRASENA.icon}
            size={20}
            color={isActive(CAMBIO_CONTRASENA.href) ? colors.primaryLight : colors.textSecondary}
          />
          <Text
            style={[styles.itemLabel, isActive(CAMBIO_CONTRASENA.href) && styles.itemLabelActive]}
            numberOfLines={1}
          >
            {CAMBIO_CONTRASENA.label}
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const SIDEBAR_WIDTH = 288;

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    minWidth: SIDEBAR_WIDTH,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  areaCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  menuGroup: {
    marginBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  itemActive: {
    backgroundColor: colors.primary + '28',
    borderLeftColor: colors.primaryLight,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  itemLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  submenu: {
    marginLeft: 8,
    marginTop: 2,
    marginBottom: 6,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderLight,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  subBullet: {
    marginTop: 1,
  },
  subItemActive: {
    backgroundColor: colors.primary + '20',
    borderLeftColor: colors.primary,
  },
  subItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  subItemLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },
});
