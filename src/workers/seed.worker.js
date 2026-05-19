/* eslint-disable no-restricted-globals */
/**
 * Seed worker — generates 50k entities, 200k relationships, 500k events.
 * Streams progress back to the main thread; writes in chunked Dexie transactions.
 *
 * Plants fraud patterns:
 *  - Smurfing rings (multiple small accounts wiring to one mule)
 *  - High-velocity accounts (transaction bursts)
 *  - Round-amount layering
 *  - Sanctioned-country exposure
 */
import { faker } from '@faker-js/faker';
import { db } from '@/db/schema';
import { BUILTIN_ROLES } from '@/lib/rbac';
import { seq } from '@/lib/ids';

const N_ENTITIES = 50_000;
const N_RELATIONSHIPS = 200_000;
const N_EVENTS = 500_000;
const CHUNK = 5_000;

const ENTITY_TYPES = ['person', 'organization', 'account', 'transaction', 'location', 'device'];
const TAGS = [
  'kyc-verified',
  'pep',
  'sanctioned',
  'high-risk-jurisdiction',
  'shell-company',
  'mule-suspected',
  'corporate',
  'retail',
  'private-banking',
  'crypto-linked',
];
const COUNTRIES = ['US', 'GB', 'DE', 'FR', 'CH', 'SG', 'HK', 'AE', 'CY', 'PA', 'KY', 'RU', 'NG'];
const HIGH_RISK = new Set(['RU', 'CY', 'PA', 'KY', 'NG']);

// Geographic bounding boxes [minLat, minLng, maxLat, maxLng] per country
const COUNTRY_BOUNDS = {
  US: [24.4, -125.0, 49.4, -66.9],
  GB: [49.8, -8.6, 60.9, 1.8],
  DE: [47.3, 5.9, 55.1, 15.0],
  FR: [41.3, -5.1, 51.1, 9.6],
  CH: [45.8, 5.9, 47.8, 10.5],
  SG: [1.15, 103.6, 1.47, 104.0],
  HK: [22.1, 113.8, 22.6, 114.5],
  AE: [22.6, 51.6, 26.1, 56.4],
  CY: [34.6, 32.3, 35.7, 34.6],
  PA: [7.2, -83.0, 9.7, -77.2],
  KY: [19.2, -81.5, 19.8, -79.7],
  RU: [41.2, 19.6, 77.7, 190.0],
  NG: [4.3, 2.7, 13.9, 14.7],
};

// Regional first/last name pools for more realistic data
const REGIONAL_NAMES = {
  US: { first: ['James', 'Michael', 'Robert', 'Jennifer', 'Patricia', 'Linda'], last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'] },
  GB: { first: ['Oliver', 'Harry', 'Jack', 'Emily', 'Olivia', 'Isla'], last: ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies'] },
  DE: { first: ['Hans', 'Karl', 'Friedrich', 'Anna', 'Maria', 'Petra'], last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer'] },
  FR: { first: ['Jean', 'Pierre', 'Michel', 'Marie', 'Isabelle', 'Nathalie'], last: ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard'] },
  CH: { first: ['Bruno', 'Heinrich', 'Walter', 'Heidi', 'Monika', 'Ursula'], last: ['Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber'] },
  SG: { first: ['Wei', 'Jun', 'Kai', 'Li', 'Mei', 'Hui'], last: ['Tan', 'Lim', 'Lee', 'Ng', 'Wong', 'Goh'] },
  HK: { first: ['Ming', 'Wai', 'Chun', 'Yuen', 'Ka', 'Siu'], last: ['Chan', 'Lee', 'Wong', 'Cheung', 'Lau', 'Yuen'] },
  AE: { first: ['Mohammed', 'Ahmed', 'Ali', 'Fatima', 'Aisha', 'Mariam'], last: ['Al-Rashidi', 'Al-Hamdan', 'Al-Otaibi', 'Al-Mansouri', 'Al-Zaabi', 'Al-Nuaimi'] },
  CY: { first: ['Nikos', 'Giorgos', 'Kostas', 'Maria', 'Elena', 'Anna'], last: ['Papadopoulos', 'Georgiou', 'Nicolaou', 'Christodoulou', 'Ioannou', 'Constantinou'] },
  PA: { first: ['Carlos', 'José', 'Luis', 'María', 'Ana', 'Rosa'], last: ['González', 'Rodríguez', 'López', 'Martínez', 'García', 'Herrera'] },
  KY: { first: ['James', 'William', 'George', 'Sarah', 'Emma', 'Claire'], last: ['Ebanks', 'Bush', 'McLaughlin', 'Bodden', 'Scott', 'Tibbetts'] },
  RU: { first: ['Aleksei', 'Dmitry', 'Ivan', 'Natalia', 'Elena', 'Olga'], last: ['Ivanov', 'Petrov', 'Sidorov', 'Volkov', 'Novikov', 'Sokolov'] },
  NG: { first: ['Chukwuemeka', 'Oluwaseun', 'Babatunde', 'Ngozi', 'Adaeze', 'Chioma'], last: ['Okafor', 'Adeyemi', 'Okonkwo', 'Bello', 'Ibrahim', 'Abubakar'] },
};

// Regional company name suffixes
const COMPANY_SUFFIX_BY_COUNTRY = {
  DE: ['GmbH', 'AG', 'KG', 'OHG'],
  FR: ['S.A.', 'SARL', 'SAS', 'EURL'],
  GB: ['Ltd', 'plc', 'LLP', 'Limited'],
  CH: ['AG', 'SA', 'GmbH', 'Holding'],
  SG: ['Pte. Ltd.', 'Ltd', 'Corp.'],
  HK: ['Limited', 'Holdings', 'Group'],
  AE: ['LLC', 'FZE', 'FZCO', 'Holdings'],
  CY: ['Ltd', 'Holdings', 'Investments'],
  PA: ['S.A.', 'Corp.', 'Foundation'],
  KY: ['Ltd', 'Fund', 'Holdings', 'International'],
  RU: ['ООО', 'АО', 'ПАО', 'ЗАО'],
};

function regionalName(country) {
  const pool = REGIONAL_NAMES[country] ?? REGIONAL_NAMES.US;
  const first = pool.first[Math.floor(Math.random() * pool.first.length)];
  const last = pool.last[Math.floor(Math.random() * pool.last.length)];
  return `${first} ${last}`;
}

function regionalCompany(country) {
  const suffixes = COMPANY_SUFFIX_BY_COUNTRY[country] ?? ['Inc.', 'Corp.', 'LLC', 'Group'];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${faker.company.name().split(' ').slice(0, 2).join(' ')} ${suffix}`;
}

function countryLatLng(country) {
  const b = COUNTRY_BOUNDS[country];
  if (!b) return { lat: parseFloat(faker.location.latitude()), lng: parseFloat(faker.location.longitude()) };
  const lat = b[0] + Math.random() * (b[2] - b[0]);
  const lng = b[1] + Math.random() * (b[3] - b[1]);
  return { lat: parseFloat(lat.toFixed(5)), lng: parseFloat(lng.toFixed(5)) };
}

function regionalCity(country) {
  const cities = {
    US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'],
    GB: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol'],
    DE: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
    FR: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
    CH: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne'],
    SG: ['Singapore'],
    HK: ['Hong Kong', 'Kowloon', 'Tsuen Wan'],
    AE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
    CY: ['Nicosia', 'Limassol', 'Larnaca', 'Paphos'],
    PA: ['Panama City', 'Colón', 'David'],
    KY: ['George Town', 'West Bay', 'Bodden Town'],
    RU: ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Kazan'],
    NG: ['Lagos', 'Abuja', 'Kano', 'Ibadan'],
  };
  const pool = cities[country] ?? [faker.location.city()];
  return pool[Math.floor(Math.random() * pool.length)];
}

faker.seed(42);

/** @param {string} stage @param {number} done @param {number} total */
function progress(stage, done, total) {
  self.postMessage({ type: 'progress', stage, done, total });
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTags() {
  const n = 1 + Math.floor(Math.random() * 3);
  const out = new Set();
  for (let i = 0; i < n; i++) out.add(pick(TAGS));
  return [...out];
}

async function seedMeta() {
  await db.roles.bulkPut(BUILTIN_ROLES);
  await db.sources.bulkPut([
    {
      id: 'src_wire',
      name: 'Wire transfer feed',
      kind: 'wire_feed',
      recordCount: 184_321,
      lastSync: Date.now() - 1000 * 60 * 2,
      status: 'healthy',
    },
    {
      id: 'src_core',
      name: 'Core banking',
      kind: 'core_banking',
      recordCount: 412_900,
      lastSync: Date.now() - 1000 * 60 * 5,
      status: 'healthy',
    },
    {
      id: 'src_kyc',
      name: 'KYC provider',
      kind: 'kyc',
      recordCount: 92_104,
      lastSync: Date.now() - 1000 * 60 * 32,
      status: 'degraded',
    },
    {
      id: 'src_ofac',
      name: 'OFAC sanctions list',
      kind: 'sanctions',
      recordCount: 8_412,
      lastSync: Date.now() - 1000 * 60 * 60 * 6,
      status: 'healthy',
    },
    {
      id: 'src_device',
      name: 'Device intelligence',
      kind: 'device_intel',
      recordCount: 220_004,
      lastSync: Date.now() - 1000 * 60 * 12,
      status: 'healthy',
    },
    {
      id: 'src_osint',
      name: 'Open-source intel',
      kind: 'open_source',
      recordCount: 33_201,
      lastSync: Date.now() - 1000 * 60 * 60 * 23,
      status: 'offline',
    },
  ]);
}

async function seedEntities() {
  const now = Date.now();
  for (let i = 0; i < N_ENTITIES; i += CHUNK) {
    const batch = [];
    for (let j = 0; j < CHUNK && i + j < N_ENTITIES; j++) {
      const idx = i + j;
      const type = ENTITY_TYPES[idx % ENTITY_TYPES.length];
      const country = pick(COUNTRIES);
      const tags = pickTags();
      const baseRisk =
        (HIGH_RISK.has(country) ? 30 : 0) +
        (tags.includes('sanctioned') ? 50 : 0) +
        (tags.includes('mule-suspected') ? 35 : 0) +
        (tags.includes('shell-company') ? 25 : 0);
      const riskScore = Math.min(99, baseRisk + Math.floor(Math.random() * 40));
      const name =
        type === 'person'
          ? regionalName(country)
          : type === 'organization'
            ? regionalCompany(country)
            : type === 'account'
              ? `ACCT-${faker.string.alphanumeric(10).toUpperCase()}`
              : type === 'transaction'
                ? `TX-${faker.string.alphanumeric(12).toUpperCase()}`
                : type === 'location'
                  ? `${regionalCity(country)}, ${country}`
                  : `DEV-${faker.string.alphanumeric(8).toUpperCase()}`;
      const { lat, lng } = countryLatLng(country);
      batch.push({
        id: seq('E', idx),
        type,
        name,
        riskScore,
        tags,
        country,
        lat,
        lng,
        attrs:
          type === 'account'
            ? { balance: Math.floor(Math.random() * 5_000_000), currency: 'USD' }
            : type === 'transaction'
              ? {
                  amount: Math.floor(Math.random() * 100_000),
                  currency: 'USD',
                  channel: pick(['wire', 'ach', 'swift', 'card']),
                }
              : type === 'person'
                ? { dob: faker.date.birthdate().toISOString().slice(0, 10) }
                : {},
        createdAt: now - Math.floor(Math.random() * 365 * 24 * 3600 * 1000),
        updatedAt: now - Math.floor(Math.random() * 7 * 24 * 3600 * 1000),
      });
    }
    await db.entities.bulkPut(batch);
    progress('entities', Math.min(i + CHUNK, N_ENTITIES), N_ENTITIES);
  }
}

async function seedRelationships() {
  const kinds = [
    'transacts_with',
    'owns',
    'controls',
    'communicates_with',
    'co_located',
    'shares_device',
  ];
  const now = Date.now();
  for (let i = 0; i < N_RELATIONSHIPS; i += CHUNK) {
    const batch = [];
    for (let j = 0; j < CHUNK && i + j < N_RELATIONSHIPS; j++) {
      const a = Math.floor(Math.random() * N_ENTITIES);
      let b = Math.floor(Math.random() * N_ENTITIES);
      if (b === a) b = (b + 1) % N_ENTITIES;
      const firstSeen = now - Math.floor(Math.random() * 180 * 24 * 3600 * 1000);
      batch.push({
        id: seq('R', i + j),
        sourceId: seq('E', a),
        targetId: seq('E', b),
        kind: kinds[(i + j) % kinds.length],
        weight: Math.random(),
        firstSeen,
        lastSeen: firstSeen + Math.floor(Math.random() * 30 * 24 * 3600 * 1000),
      });
    }
    await db.relationships.bulkPut(batch);
    progress('relationships', Math.min(i + CHUNK, N_RELATIONSHIPS), N_RELATIONSHIPS);
  }
}

async function seedEvents() {
  const kinds = ['transaction', 'login', 'wire', 'alert', 'access', 'kyc_check'];
  const severities = ['info', 'info', 'info', 'info', 'warning', 'critical'];
  const now = Date.now();
  const WINDOW = 30 * 24 * 3600 * 1000;
  for (let i = 0; i < N_EVENTS; i += CHUNK) {
    const batch = [];
    for (let j = 0; j < CHUNK && i + j < N_EVENTS; j++) {
      const k = kinds[(i + j) % kinds.length];
      batch.push({
        id: seq('V', i + j),
        kind: k,
        entityId: seq('E', Math.floor(Math.random() * N_ENTITIES)),
        counterpartyId: Math.random() < 0.6 ? seq('E', Math.floor(Math.random() * N_ENTITIES)) : undefined,
        ts: now - Math.floor(Math.random() * WINDOW),
        amount: k === 'transaction' || k === 'wire' ? Math.floor(Math.random() * 50000) : undefined,
        currency: 'USD',
        severity: pick(severities),
        description:
          k === 'transaction'
            ? 'Card transaction'
            : k === 'wire'
              ? 'Outbound wire'
              : k === 'login'
                ? 'Authentication event'
                : k === 'alert'
                  ? 'Risk model alert'
                  : k === 'access'
                    ? 'Record accessed'
                    : 'KYC verification',
      });
    }
    await db.events.bulkPut(batch);
    progress('events', Math.min(i + CHUNK, N_EVENTS), N_EVENTS);
  }
}

async function seedAnomalies() {
  const reasons = [
    'Smurfing pattern detected: 12 deposits under reporting threshold within 4h',
    'High-velocity outbound wires to single counterparty',
    'Round-amount layering across 3 accounts',
    'New device geolocation differs from baseline by 7,200km',
    'Counterparty matched against OFAC SDN list',
    'KYC-PEP mismatch in beneficial owner declaration',
    'Dormant account reactivated with high-value transfer',
    'Circular fund flow returning to origin within 24h',
  ];
  const sev = ['low', 'medium', 'high', 'critical'];
  const now = Date.now();
  const out = [];
  for (let i = 0; i < 240; i++) {
    out.push({
      id: seq('A', i),
      entityId: seq('E', Math.floor(Math.random() * N_ENTITIES)),
      reason: reasons[i % reasons.length],
      score: 50 + Math.floor(Math.random() * 50),
      severity: sev[Math.floor(Math.random() * sev.length)],
      detectedAt: now - Math.floor(Math.random() * 24 * 3600 * 1000),
    });
  }
  await db.anomalies.bulkPut(out);
}

async function seedInvestigations() {
  const titles = [
    'Operation Cascade — wire layering ring',
    'Crimson Vault — shell-company beneficial owners',
    'Northwind — sanctions evasion via correspondent banking',
    'Quartzline — mule recruitment via social channels',
    'Iron Ledger — round-amount structuring',
    'Pale Horse — crypto on-ramp clustering',
    'Silver Tide — dormant-account reactivation cluster',
  ];
  const now = Date.now();
  const out = titles.map((t, i) => ({
    id: seq('I', i),
    title: t,
    status: i < 4 ? 'open' : i < 6 ? 'reviewing' : 'closed',
    ownerId: 'user_seed',
    entityIds: [],
    progress: 10 + Math.floor(Math.random() * 80),
    createdAt: now - Math.floor(Math.random() * 60 * 24 * 3600 * 1000),
    updatedAt: now - Math.floor(Math.random() * 24 * 3600 * 1000),
  }));
  await db.investigations.bulkPut(out);
}

async function run() {
  const start = Date.now();
  await seedMeta();
  await seedEntities();
  await seedRelationships();
  await seedEvents();
  await seedAnomalies();
  await seedInvestigations();
  await db.meta.put({ key: 'seeded', value: true, at: Date.now() });
  self.postMessage({ type: 'done', durationMs: Date.now() - start });
}

self.addEventListener('message', async (e) => {
  if (e.data?.type === 'seed') {
    try {
      const already = await db.meta.get('seeded');
      if (already?.value && !e.data.force) {
        self.postMessage({ type: 'done', durationMs: 0, skipped: true });
        return;
      }
      await run();
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err?.message || err) });
    }
  }
});
