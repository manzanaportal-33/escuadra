import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export type BibliotecaGridItem = {
  id: number;
  code: string;
  filename: string;
  description?: string;
  is_folder: boolean;
};

type Props = {
  items: BibliotecaGridItem[];
  isAdmin: boolean;
  /** Ruta base para abrir una carpeta (sin barra final). Ej: /area/biblioteca/carpeta o /area/admin/biblioteca */
  folderHrefPrefix: string;
  onOpenFile: (id: number) => void;
  onDelete: (it: BibliotecaGridItem) => void;
};

export function BibliotecaItemsGrid({
  items,
  isAdmin,
  folderHrefPrefix,
  onOpenFile,
  onDelete,
}: Props) {
  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <View key={it.id} style={styles.tileWrap}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.tileTrash}
              onPress={() => onDelete(it)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={17} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.tile}
            onPress={() => {
              if (it.is_folder) {
                router.push(`${folderHrefPrefix}/${it.code}` as any);
              } else {
                onOpenFile(it.id);
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons
              name={it.is_folder ? 'folder-open' : 'document-text'}
              size={34}
              color={it.is_folder ? colors.primaryLight : colors.textSecondary}
            />
            <Text style={styles.tileLabel} numberOfLines={2}>
              {it.filename}
            </Text>
            {!it.is_folder ? (
              <Ionicons name="download-outline" size={14} color={colors.textMuted} style={styles.tileHint} />
            ) : null}
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const TILE = 118;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: 12,
  },
  tileWrap: {
    width: TILE,
    position: 'relative',
  },
  tile: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 108,
    justifyContent: 'flex-start',
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    width: '100%',
  },
  tileHint: { marginTop: 6 },
  tileTrash: {
    position: 'absolute',
    top: 4,
    right: 2,
    zIndex: 2,
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.backgroundElevated + 'ee',
  },
});
