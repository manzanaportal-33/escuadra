// Configuración del HTML raíz para web (Expo Router)
import { ScrollViewStyleReset } from 'expo-router/html';
import { colors } from '@/theme/colors';
import { INSTITUTION } from '@/theme/institution';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>{INSTITUTION.short} - Área reservada</title>
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root { height: 100%; margin: 0; }
              body { background-color: ${colors.background}; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
