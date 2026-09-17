import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';

export type FastifyTyped = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;
