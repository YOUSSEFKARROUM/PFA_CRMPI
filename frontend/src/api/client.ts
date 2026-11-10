/**
 * Client HTTP de l'API. Aucune règle de calcul ici : le score est toujours
 * calculé côté serveur (src/scoring.py).
 */
import type {
  Account, Answers, DemoProfile, Evaluation, HistoryEntry, Questionnaire, RegisterPayload,
} from './types';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const NETWORK_ERROR = 'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.';

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      const messages = body.detail.map((item: { msg?: unknown }) => String(item.msg ?? '')).filter(Boolean);
      if (messages.length > 0) return `Données invalides : ${messages.join(' ; ')}`;
    }
  } catch {
    // Corps non JSON : message générique ci-dessous.
  }
  return `Erreur inattendue (${response.status}).`;
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }
  if (!response.ok) throw new ApiError(response.status, await readError(response));
  return response;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  return (await send(path, init)).json() as Promise<T>;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

export function filenameFrom(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match ? match[1] : fallback;
}

async function downloadFile(path: string, body: unknown, fallbackName: string): Promise<DownloadedFile> {
  const response = await send(path, post(body));
  return {
    blob: await response.blob(),
    filename: filenameFrom(response.headers.get('Content-Disposition'), fallbackName),
  };
}

export const api = {
  questionnaire: () => json<Questionnaire>('/api/questionnaire'),
  demoProfiles: () => json<DemoProfile[]>('/api/profiles/demo'),
  score: (responses: Answers) => json<Evaluation>('/api/assessments/score', post({ responses })),

  report: (responses: Answers, organization: string, sector: string) =>
    downloadFile('/api/assessments/report', { responses, organization, sector }, 'rapport_pentascore.pdf'),
  badge: (responses: Answers, organization: string) =>
    downloadFile('/api/assessments/badge', { responses, organization }, 'badge_pentascore.png'),
  jobDescription: (responses: Answers) =>
    downloadFile('/api/assessments/job-description', { responses }, 'fiche_poste_rssi_pentascore.pdf'),

  async me(): Promise<Account | null> {
    try {
      return await json<Account>('/api/auth/me');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  register: (payload: RegisterPayload) => json<Account>('/api/auth/register', post(payload)),
  login: (email: string, password: string) => json<Account>('/api/auth/login', post({ email, password })),
  logout: () => send('/api/auth/logout', { method: 'POST' }).then(() => undefined),
  deleteAccount: () => send('/api/auth/me', { method: 'DELETE' }).then(() => undefined),

  saveAssessment: (responses: Answers) => json<HistoryEntry>('/api/assessments', post({ responses })),
  history: () => json<HistoryEntry[]>('/api/assessments'),
};
