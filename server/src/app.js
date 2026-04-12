import express from 'express';
import cors from 'cors';
import { config, checkEnv } from './config.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import cuerposRoutes from './routes/cuerpos.js';
import groupsRoutes from './routes/groups.js';
import orientesRoutes from './routes/orientes.js';
import tramitesRoutes from './routes/tramites.js';
import bibliotecaRoutes from './routes/biblioteca.js';
import tesoreriaRoutes from './routes/tesoreria.js';
import contactoRoutes from './routes/contacto.js';

checkEnv();

const app = express();

// CORS: desarrollo (localhost) y producción (Vercel u otro origen)
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return cb(null, true);
    return cb(null, true);
  },
};
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/cuerpos', cuerposRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/orientes', orientesRoutes);
app.use('/api/tramites', tramitesRoutes);
app.use('/api/biblioteca', bibliotecaRoutes);
app.use('/api/tesoreria', tesoreriaRoutes);
app.use('/api/contacto', contactoRoutes);
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'SCG33 API' });
});

app.get('/', (req, res) => {
  res.redirect('/api/health');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno' });
});

export { app, config };
