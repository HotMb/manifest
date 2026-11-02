import { PREPARATION_PROVIDERS, prepareModel, prepareProvider, type ProviderPreparationSelection } from './provider-preparation.ts';

export function ProviderPreparationPanel({ value, onChange }: { value: ProviderPreparationSelection; onChange: (value: ProviderPreparationSelection) => void }) {
  return (
    <fieldset className="provider-preparation" aria-describedby="provider-preparation-help">
      <legend>Fournisseur et modèle</legend>
      <p className="provider-connection"><span className="connection-dot" aria-hidden="true" />Fournisseur non connecté</p>
      <label htmlFor="prepared-provider">Fournisseur à préparer</label>
      <select id="prepared-provider" value={value.providerId ?? ''} onChange={(event) => onChange(prepareProvider(value, event.target.value))}>
        <option value="">Choisir un fournisseur</option>
        {PREPARATION_PROVIDERS.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
      </select>
      <label htmlFor="prepared-model">Identifiant du modèle</label>
      <input id="prepared-model" type="text" autoComplete="off" spellCheck={false} maxLength={160} disabled={!value.providerId} value={value.requestedModelId} onChange={(event) => onChange(prepareModel(value, event.target.value))} placeholder={value.providerId ? 'Identifiant à préciser' : 'Choisis d’abord un fournisseur'} aria-describedby="prepared-model-help" />
      <p id="prepared-model-help">Saisie libre, non vérifiée. Aucun catalogue de modèles n’est connecté.</p>
      <p id="provider-preparation-help">Préparation pour cette session uniquement. Aucun envoi ni connexion ; les suggestions restent locales. Ne saisis pas de clé d’accès.</p>
    </fieldset>
  );
}
