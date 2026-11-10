import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './client';

function respond(status: number, body: unknown, headers: Record<string, string> = {}) {
  if (status === 204) return new Response(null, { status });
  const isBlob = body instanceof Blob;
  return new Response(isBlob ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': isBlob ? 'application/pdf' : 'application/json', ...headers },
  });
}

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn();
  responses.forEach((r) => fetchMock.mockResolvedValueOnce(r));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('sends answers as JSON with same-origin credentials', async () => {
    const fetchMock = mockFetch(respond(200, { global_score: 50 }));

    await api.score({ q1: 3 });

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/assessments/score');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ responses: { q1: 3 } });
  });

  it('surfaces the server detail message as an ApiError', async () => {
    mockFetch(respond(422, { detail: 'Réponses manquantes ou invalides : q7' }));

    await expect(api.score({})).rejects.toMatchObject({ status: 422, message: 'Réponses manquantes ou invalides : q7' });
  });

  it('summarises FastAPI validation errors returned as a list', async () => {
    mockFetch(respond(422, { detail: [{ msg: 'Field required' }, { msg: 'Input should be a valid integer' }] }));

    await expect(api.score({})).rejects.toThrow('Données invalides : Field required ; Input should be a valid integer');
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    mockFetch(new Response('boom', { status: 500 }));

    await expect(api.questionnaire()).rejects.toThrow('Erreur inattendue (500).');
  });

  it('reports an unreachable server with a user-facing message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await api.demoProfiles().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });

  it('returns null from me() when there is no session, and rethrows other errors', async () => {
    mockFetch(respond(401, { detail: 'Authentification requise.' }), respond(500, { detail: 'panne' }));

    expect(await api.me()).toBeNull();
    await expect(api.me()).rejects.toThrow('panne');
  });

  it('downloads the PDF with the filename chosen by the server', async () => {
    mockFetch(respond(200, new Blob(['%PDF']), { 'Content-Disposition': 'attachment; filename="rapport_pentascore_20261109.pdf"' }));

    const pdf = await api.report({ q1: 3 }, 'Atlas', 'Finance');

    expect(pdf.filename).toBe('rapport_pentascore_20261109.pdf');
    expect(pdf.blob.size).toBeGreaterThan(0);
  });

  it('downloads the shareable badge as a PNG', async () => {
    const fetchMock = mockFetch(respond(200, new Blob(['PNG']), {
      'Content-Disposition': 'attachment; filename="badge_pentascore.png"',
    }));

    const file = await api.badge({ q1: 1 }, 'Atlas SARL');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/assessments/badge');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ responses: { q1: 1 }, organization: 'Atlas SARL' });
    expect(file.filename).toBe('badge_pentascore.png');
  });

  it('downloads the job description template', async () => {
    const fetchMock = mockFetch(respond(200, new Blob(['%PDF']), {
      'Content-Disposition': 'attachment; filename="fiche_poste_rssi_pentascore.pdf"',
    }));

    const pdf = await api.jobDescription({ q1: 1 });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/assessments/job-description');
    expect(pdf.filename).toBe('fiche_poste_rssi_pentascore.pdf');
  });

  it('covers the account and history endpoints', async () => {
    const account = { id: '1', email: 'a@pme.ma', organization: 'A', sector: null, consent_at: 'x', created_at: 'x' };
    const fetchMock = mockFetch(
      respond(201, account), respond(200, account), respond(204, null), respond(204, null),
      respond(201, { id: 'h1' }), respond(200, []),
    );

    await api.register({ email: 'a@pme.ma', password: 'motdepasse', organization: 'A', sector: null, consent: true });
    await api.login('a@pme.ma', 'motdepasse');
    await api.logout();
    await api.deleteAccount();
    await api.saveAssessment({ q1: 3 });
    await api.history();

    expect(fetchMock.mock.calls.map(([path, init]) => `${init?.method ?? 'GET'} ${path}`)).toEqual([
      'POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/logout', 'DELETE /api/auth/me',
      'POST /api/assessments', 'GET /api/assessments',
    ]);
  });
});
