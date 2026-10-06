import { DataTransferEvent } from '../types';

/** Libellés humains des types de transfert, partagés par la console de
 * l'organigramme et la carte « Flux » temps réel. */
export const DATA_TYPE_LABELS: Record<DataTransferEvent['data_type'], string> = {
  specs_tech: 'Spécifications techniques',
  ordre_terrain: 'Ordre de mission terrain',
  webhook_momo: 'Webhook paiement (MoMo / Orange Money)',
  bat_validation: 'Validation jalon & BAT client',
  rapport_perf: 'Rapport performance / ROI',
  patch_offline: 'Patch moteur offline',
  securite: 'Sécurité & audit',
};