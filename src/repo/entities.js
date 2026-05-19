/**
 * Entities repository.
 *   Future API:  GET    /api/v1/entities?type=…&limit=…
 *                GET    /api/v1/entities/:id
 *                PUT    /api/v1/entities/:id
 *                DELETE /api/v1/entities/:id
 *
 * @typedef {import('@/types').Entity} Entity
 */
import { db } from '@/db/schema';
import { api } from '@/lib/api';
import { tryRemoteThenLocal } from './base';

/**
 * @param {{ type?: string, country?: string, limit?: number }} [opts]
 * @returns {Promise<Entity[]>}
 */
export const list = (opts = {}) =>
  tryRemoteThenLocal(
    async () => {
      let q = db.entities.orderBy('riskScore').reverse();
      const rows = [];
      const limit = opts.limit ?? 1000;
      await q.until(() => rows.length >= limit).each((e) => {
        if (opts.type && e.type !== opts.type) return;
        if (opts.country && e.country !== opts.country) return;
        rows.push(e);
      });
      return rows;
    },
    () => {
      const qs = new URLSearchParams(Object.entries(opts).filter(([, v]) => v != null));
      return api(`/api/v1/entities?${qs}`);
    },
  );

/**
 * @param {string} id
 * @returns {Promise<Entity|undefined>}
 */
export const get = (id) =>
  tryRemoteThenLocal(
    () => db.entities.get(id),
    () => api(`/api/v1/entities/${id}`),
  );

/** @param {Entity} entity */
export const put = (entity) =>
  tryRemoteThenLocal(
    () => db.entities.put(entity),
    () => api(`/api/v1/entities/${entity.id}`, { method: 'PUT', body: JSON.stringify(entity) }),
  );

/** @param {string} id */
export const remove = (id) =>
  tryRemoteThenLocal(
    () => db.entities.delete(id),
    () => api(`/api/v1/entities/${id}`, { method: 'DELETE' }),
  );

/** @returns {Promise<number>} */
export const count = () =>
  tryRemoteThenLocal(
    () => db.entities.count(),
    () => api('/api/v1/entities/count'),
  );
