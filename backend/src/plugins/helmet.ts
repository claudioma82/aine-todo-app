import fp from 'fastify-plugin';
import helmetPlugin from '@fastify/helmet';
import { FastifyInstance } from 'fastify';

export default fp(async function helmet(app: FastifyInstance) {
  await app.register(helmetPlugin);
});
