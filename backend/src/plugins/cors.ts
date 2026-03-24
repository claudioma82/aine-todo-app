import fp from 'fastify-plugin';
import corsPlugin from '@fastify/cors';
import { FastifyInstance } from 'fastify';

export default fp(async function cors(app: FastifyInstance) {
  await app.register(corsPlugin, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  });
});
