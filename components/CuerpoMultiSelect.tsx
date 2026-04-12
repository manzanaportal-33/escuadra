import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export type CuerpoOption = { id: number; sigla: string; cuerpo: string };

type Props = {
  cuerpos: CuerpoOption[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
};

const LIST_MAX_HEIGHT = 280;

export function CuerpoMultiSelect({ cuerpos, selectedIds, onSelectionChange }: Props) {
  const [q, setQ] = useState('');

  const sorted = useMemo(
    () => [...cuerpos].sort((a, b) => a.sigla.localeCompare(b.sigla, 'es', { sensitivity: 'base' })),
    [cuerpos]
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return sorted;
    return sorted.filter(
      (c) =>
        c.sigla.toLowerCase().includes(t) ||
        (c.cuerpo && c.cuerpo.toLowerCase().includes(t))
    );
  }, [sorted, q]);

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const resumenSiglas = useMemo(() => {
    const set = new Set(selectedIds);
    return cuerpos
      .filter((c) => set.has(c.id))
      .sort((a, b) => a.sigla.localeCompare(b.sigla, 'es', { sensitivity: 'base' }))
      .map((c) => c.sigla)
      .join(', ');
  }, [cuerpos, selectedIds]);

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.search}
        value={q}
        onChangeText={setQ}
        placeholder="Buscar por sigla o nombre…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.summary} numberOfLines={2}>
        {selectedIds.length === 0
          ? 'Ninguno seleccionado.'
          : `${selectedIds.length} seleccionado(s)${resumenSiglas ? `: ${resumenSiglas}` : ''}`}
      </Text>
      <View style={styles.listBox}>
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {filtered.length === 0 ? (
            <Text style={styles.empty}>No hay coincidencias.</Text>
          ) : (
            filtered.map((c) => {
              const on = selectedIds.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.row, on && styles.rowActive]}
                  onPress={() => toggle(c.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={on ? colors.primaryLight : colors.textMuted}
                    style={styles.rowIcon}
                  />
                  <View style={styles.rowText}>
                    <Text style={[styles.sigla, on && styles.siglaActive]} numberOfLines={1}>
                      {c.sigla || '—'}
                    </Text>
                    <Text style={styles.nombre} numberOfLines={2}>
                      {c.cuerpo || ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  search: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summary: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 8,
    lineHeight: 18,
  },
  listBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
  listScroll: {
    maxHeight: LIST_MAX_HEIGHT,
  },
  listContent: {
    paddingVertical: 4,
  },
  empty: {
    padding: 16,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowActive: {
    backgroundColor: colors.primary + '18',
  },
  rowIcon: { marginRight: 10 },
  rowText: { flex: 1, minWidth: 0 },
  sigla: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  siglaActive: { color: colors.primaryLight },
  nombre: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});
