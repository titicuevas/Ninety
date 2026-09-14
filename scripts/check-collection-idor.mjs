/**
 * Comprobación rápida IDOR de colecciones contra API (guest + otro usuario).
 */
const API = process.env.E2E_API_URL ?? process.env.API_URL ?? 'https://ninety-api.up.railway.app';
const email = process.env.TEST_USER_EMAIL ?? 'beta@ninety.app';
const password = process.env.TEST_USER_PASSWORD;
const fanEmail = 'fan01@ninety.app';
const fanPassword = process.env.DEMO_FANS_PASSWORD ?? password;

if (!password) {
  console.error('Falta TEST_USER_PASSWORD');
  process.exit(1);
}

async function login(userEmail, userPassword) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password: userPassword }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`login ${userEmail}: ${res.status} ${JSON.stringify(body).slice(0, 160)}`);
  return body.session.access_token;
}

async function api(method, path, token, data) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 120) };
  }
  return { status: res.status, body };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const owner = await login(email, password);
const other = await login(fanEmail, fanPassword);

const created = await api('POST', '/api/collections', owner, {
  name: `IDOR check ${Date.now()}`,
  description: 'temporal',
  is_public: false,
});
assert(
  created.status === 201 || created.status === 200,
  `create collection → ${created.status} ${JSON.stringify(created.body).slice(0, 180)}`,
);
const id = created.body.collection?.id ?? created.body.id;
assert(id, 'sin id de colección');

try {
  const guest = await api('GET', `/api/collections/${id}`);
  assert(guest.status === 404, `guest GET privada → ${guest.status}`);

  const otherGet = await api('GET', `/api/collections/${id}`, other);
  assert(otherGet.status === 404, `other GET privada → ${otherGet.status}`);

  const otherPatch = await api('PATCH', `/api/collections/${id}`, other, { name: 'hack' });
  assert([403, 404].includes(otherPatch.status), `other PATCH → ${otherPatch.status}`);

  const otherDel = await api('DELETE', `/api/collections/${id}`, other);
  assert([403, 404].includes(otherDel.status), `other DELETE → ${otherDel.status}`);

  const ownerGet = await api('GET', `/api/collections/${id}`, owner);
  assert(ownerGet.status === 200, `owner GET → ${ownerGet.status}`);

  const pub = await api('PATCH', `/api/collections/${id}`, owner, { is_public: true });
  assert(pub.status === 200, `make public → ${pub.status}`);

  const guestPub = await api('GET', `/api/collections/${id}`);
  assert(guestPub.status === 200, `guest GET pública → ${guestPub.status}`);

  console.log('OK collection IDOR checks passed', { id });
} finally {
  const del = await api('DELETE', `/api/collections/${id}`, owner);
  console.log('cleanup', del.status);
}
