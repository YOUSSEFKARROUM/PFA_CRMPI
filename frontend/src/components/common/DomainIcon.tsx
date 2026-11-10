import { Landmark, LockKeyhole, Server, ShieldCheck, Siren, Users, type LucideIcon } from 'lucide-react';

/** Icône de chaque domaine du questionnaire (identifiants renvoyés par l'API). */
export const DOMAIN_ICONS: Readonly<Record<string, LucideIcon>> = {
  dom_gov: Landmark,
  dom_acc: LockKeyhole,
  dom_infra: Server,
  dom_inc: Siren,
  dom_sens: Users,
};

/** Domaine inconnu : icône neutre plutôt qu'une erreur. */
export const FALLBACK_ICON: LucideIcon = ShieldCheck;

export const ICON_STROKE = 1.5;

interface DomainIconProps {
  domainId: string;
  size?: number;
  className?: string;
}

/** Décoratif : le nom du domaine est toujours écrit à côté. */
export function DomainIcon({ domainId, size = 18, className }: DomainIconProps) {
  const Icon = DOMAIN_ICONS[domainId] ?? FALLBACK_ICON;
  return <Icon size={size} strokeWidth={ICON_STROKE} className={className} aria-hidden="true" focusable="false" />;
}
