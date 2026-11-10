/** Contrats de l'API Pentascore (miroir de api/routes/*.py). */

export type MaturityLevel = 'Critique' | 'Faible' | 'Moyen' | 'Avancé';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Answers = Readonly<Record<string, number>>;

export interface QuestionOption {
  value: number;
  label: string;
}

export interface Question {
  id: string;
  order: number;
  text: string;
  guidance: string;
  options: QuestionOption[];
}

export interface Domain {
  id: string;
  name: string;
  short: string;
  intro: string;
  questions: Question[];
}

export interface Questionnaire {
  domains: Domain[];
  recommendation_count: number;
}

export interface DemoProfile {
  key: string;
  name: string;
  sector: string;
  responses: Record<string, number>;
  global_score: number;
  maturity_level: MaturityLevel;
}

export interface DomainScore {
  id: string;
  name: string;
  score: number;
  level: MaturityLevel;
}

export interface Recommendation {
  id: string;
  text: string;
  severity: Severity;
  domain_id: string;
  domain_name: string;
  /** ISO/IEC 27001:2022 (annexe A ou clause), ou texte de loi. */
  reference: string | null;
  /** Section du Guide AUSIM-CMRPI 2018, si le guide traite le sujet. */
  guide_reference: string | null;
  effort: string | null;
  /** Réponse qui justifie la recommandation ; null pour une recommandation générale. */
  trigger: AnsweredQuestion | null;
}

export type ConsistencyKind = 'declaration' | 'prerequisite';

export interface AnsweredQuestion {
  id: string;
  number: number;
  text: string;
  value: number;
  answer: string;
}

/** Écart entre deux réponses (lecture seule, sans effet sur le score). */
export interface ConsistencyCheck {
  id: string;
  kind: ConsistencyKind;
  title: string;
  rationale: string;
  reference: string;
  questions: AnsweredQuestion[];
}

/** Replay : réponse qui a fait perdre des points au score global. */
export interface ScoreDriver extends AnsweredQuestion {
  domain_id: string;
  domain_name: string;
  points_lost: number;
}

export interface Evaluation {
  global_score: number;
  maturity_level: MaturityLevel;
  domains: DomainScore[];
  recommendations: Recommendation[];
  /** Gouvernance < 50 : un modèle de fiche de poste RSSI est proposé. */
  job_description_available: boolean;
  consistency_checks: ConsistencyCheck[];
  /** Les réponses les plus pénalisantes (au plus 5). */
  score_drivers: ScoreDriver[];
}

export interface Account {
  id: string;
  email: string;
  organization: string;
  sector: string | null;
  consent_at: string | null;
  created_at: string;
}

export interface HistoryEntry {
  id: string;
  completed_at: string;
  global_score: number;
  maturity_level: MaturityLevel;
  domains: DomainScore[];
}

export interface RegisterPayload {
  email: string;
  password: string;
  organization: string;
  sector: string | null;
  consent: boolean;
}
