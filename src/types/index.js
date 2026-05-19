/**
 * Shared domain typedefs. Import for IDE autocomplete:
 *   /** @typedef {import('@/types').Entity} Entity *\/
 */

/**
 * @typedef {'person'|'organization'|'account'|'transaction'|'location'|'device'} EntityType
 */

/**
 * @typedef {Object} Entity
 * @property {string} id           ULID-like string
 * @property {EntityType} type
 * @property {string} name
 * @property {number} riskScore    0-100
 * @property {string[]} tags
 * @property {string} [country]    ISO-3166 alpha-2
 * @property {number} [lat]
 * @property {number} [lng]
 * @property {Record<string, any>} attrs   Type-specific attributes
 * @property {number} createdAt    epoch ms
 * @property {number} updatedAt    epoch ms
 */

/**
 * @typedef {Object} Relationship
 * @property {string} id
 * @property {string} sourceId
 * @property {string} targetId
 * @property {'transacts_with'|'owns'|'controls'|'communicates_with'|'co_located'|'shares_device'} kind
 * @property {number} weight       0-1
 * @property {number} firstSeen
 * @property {number} lastSeen
 */

/**
 * @typedef {Object} EventRecord
 * @property {string} id
 * @property {'transaction'|'login'|'wire'|'alert'|'access'|'kyc_check'} kind
 * @property {string} [entityId]
 * @property {string} [counterpartyId]
 * @property {number} ts           epoch ms
 * @property {number} [amount]
 * @property {string} [currency]
 * @property {'info'|'warning'|'critical'} severity
 * @property {string} description
 * @property {Record<string, any>} [meta]
 */

/**
 * @typedef {Object} AuditLog
 * @property {string} id
 * @property {string} userId
 * @property {string} action
 * @property {string} [target]
 * @property {Record<string, any>} [details]
 * @property {number} ts
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} roleId
 * @property {number} createdAt
 */

/**
 * @typedef {'view_entities'|'view_relationships'|'view_events'|'view_audit'|'edit_entities'|'manage_users'|'manage_roles'|'export_data'|'open_investigations'} Permission
 */

/**
 * @typedef {Object} Role
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {Permission[]} permissions
 * @property {boolean} system   true for built-in roles
 */

/**
 * @typedef {Object} Investigation
 * @property {string} id
 * @property {string} title
 * @property {'open'|'reviewing'|'closed'} status
 * @property {string} ownerId
 * @property {string[]} entityIds
 * @property {number} progress   0-100
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} DataSource
 * @property {string} id
 * @property {string} name
 * @property {'wire_feed'|'core_banking'|'kyc'|'sanctions'|'device_intel'|'open_source'} kind
 * @property {number} recordCount
 * @property {number} lastSync
 * @property {'healthy'|'degraded'|'offline'} status
 */

/**
 * @typedef {Object} Anomaly
 * @property {string} id
 * @property {string} entityId
 * @property {string} reason
 * @property {number} score        0-100
 * @property {'low'|'medium'|'high'|'critical'} severity
 * @property {number} detectedAt
 */

export {};
