import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function AreaLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Área reservada', headerTitle: 'Área reservada' }} />
      <Stack.Screen name="biblioteca/index" options={{ title: 'Biblioteca', headerTitle: 'Biblioteca' }} />
      <Stack.Screen name="biblioteca/[categoria]" options={{ title: 'Contenido', headerTitle: 'Contenido' }} />
      <Stack.Screen name="biblioteca/carpeta/[code]" options={{ title: 'Carpeta', headerTitle: 'Carpeta' }} />
      <Stack.Screen name="cuerpos" options={{ title: 'Cuerpos', headerTitle: 'Cuerpos' }} />
      <Stack.Screen name="cuerpos/[id]" options={{ title: 'Cuerpo', headerTitle: 'Cuerpo' }} />
      <Stack.Screen
        name="tesoreria"
        options={{ title: 'Resumen Estado de Cuentas', headerTitle: 'Resumen Estado de Cuentas' }}
      />
      <Stack.Screen
        name="tesoreria/planilla/[cuerpoId]"
        options={{ title: 'Planilla del cuerpo', headerTitle: 'Planilla del cuerpo' }}
      />
      <Stack.Screen name="contacto/index" options={{ title: 'Contáctenos', headerTitle: 'Contáctenos' }} />
      <Stack.Screen
        name="contacto/mis-mensajes"
        options={{ title: 'Mis consultas', headerTitle: 'Mis consultas' }}
      />
      <Stack.Screen name="contacto/[id]" options={{ title: 'Consulta', headerTitle: 'Tu consulta' }} />
      <Stack.Screen name="cambio-contrasena" options={{ title: 'Cambio de contraseña', headerTitle: 'Cambio de contraseña' }} />
      <Stack.Screen name="tramites/index" options={{ title: 'Trámites', headerTitle: 'Trámites' }} />
      <Stack.Screen name="tramites/mis-solicitudes" options={{ title: 'Mis Solicitudes', headerTitle: 'Mis Solicitudes' }} />
      <Stack.Screen name="tramites/nuevo/[tipo]" options={{ title: 'Nuevo trámite', headerTitle: 'Nuevo trámite' }} />
      <Stack.Screen name="admin/index" options={{ title: 'Administración', headerTitle: 'Administración' }} />
      <Stack.Screen name="admin/accesos" options={{ title: 'Registro de accesos', headerTitle: 'Registro de accesos' }} />
      <Stack.Screen name="admin/hermanos" options={{ title: 'Hermanos', headerTitle: 'Hermanos' }} />
      <Stack.Screen name="admin/cuerpos" options={{ title: 'Cuerpos', headerTitle: 'Cuerpos' }} />
      <Stack.Screen name="admin/orientes" options={{ title: 'Otros Orientes', headerTitle: 'Otros Orientes' }} />
      <Stack.Screen name="admin/biblioteca/index" options={{ title: 'Biblioteca', headerTitle: 'Biblioteca' }} />
      <Stack.Screen name="admin/tesoreria/index" options={{ title: 'Estados de cuenta', headerTitle: 'Estados de cuenta' }} />
      <Stack.Screen name="admin/tesoreria/cuerpo/[id]" options={{ title: 'Logia', headerTitle: 'Estado de cuenta' }} />
      <Stack.Screen
        name="admin/resumen-estado-cuentas"
        options={{ title: 'Resumen Estado de Cuentas', headerTitle: 'Resumen Estado de Cuentas' }}
      />
      <Stack.Screen name="admin/cuerpos/nuevo" options={{ title: 'Nuevo cuerpo', headerTitle: 'Nuevo cuerpo' }} />
      <Stack.Screen name="admin/cuerpos/editar/[id]" options={{ title: 'Editar cuerpo', headerTitle: 'Editar cuerpo' }} />
      <Stack.Screen name="admin/orientes/nuevo" options={{ title: 'Nuevo Oriente', headerTitle: 'Nuevo Oriente' }} />
      <Stack.Screen name="admin/orientes/editar/[id]" options={{ title: 'Editar Oriente', headerTitle: 'Editar Oriente' }} />
      <Stack.Screen name="admin/hermanos/nuevo" options={{ title: 'Nuevo hermano', headerTitle: 'Nuevo hermano' }} />
      <Stack.Screen name="admin/tramites/index" options={{ title: 'Solicitudes', headerTitle: 'Solicitudes (trámites)' }} />
      <Stack.Screen name="admin/tramites/[id]" options={{ title: 'Detalle', headerTitle: 'Solicitud' }} />
      <Stack.Screen
        name="admin/contacto/index"
        options={{ title: 'Mensajes', headerTitle: 'Mensajes de contacto' }}
      />
      <Stack.Screen name="admin/contacto/[id]" options={{ title: 'Responder', headerTitle: 'Mensaje' }} />
    </Stack>
  );
}
