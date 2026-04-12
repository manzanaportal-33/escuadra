/**
 * Nombre de la institución para usar en la app
 */
const TITULO_COMPLETO =
  'Supremo Consejo Grado 33° del Rito Escocés Antiguo y Aceptado para la República Argentina';

export const INSTITUTION = {
  short: 'Supremo Consejo Grado 33°',
  full: TITULO_COMPLETO,
  /** Título principal (header web y login, línea 1) */
  loginHeaderLine1: TITULO_COMPLETO,
  /** Encabezado pantalla de login, línea 2 */
  loginHeaderLine2: 'Fundado el 1° de Septiembre de 1858.',
} as const;
