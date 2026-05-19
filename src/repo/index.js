/**
 * Repository facade. Consume from features/hooks via:
 *   import { entitiesRepo, auditRepo } from '@/repo';
 *
 * Each repo conforms to: list, get, put, remove (where applicable).
 */
export * as entitiesRepo from './entities';
export * as auditRepo from './audit';
