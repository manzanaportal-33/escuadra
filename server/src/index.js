import { app, config } from './app.js';

app.listen(config.port, '0.0.0.0', () => {
  console.log(`SCG33 API escuchando en http://localhost:${config.port}`);
  console.log(`   (red: http://<tu-IP>:${config.port} para celular físico)`);
});
