import type { ModelProviderRegistry } from '@design-workbench/m0-contract';
import { selectModel, selectProvider, selectedModel, type ModelSelection } from './model-selection.ts';

export function ModelProviderPanel({
  registry, selection, onChange, loading, unavailable, onRetry,
}: {
  registry: ModelProviderRegistry;
  selection: ModelSelection;
  onChange: (value: ModelSelection) => void;
  loading: boolean;
  unavailable: boolean;
  onRetry: () => void;
}) {
  const configured = registry.providers.filter((provider) => provider.status === 'configured' && provider.models.length > 0);
  const selected = selectedModel(registry, selection);
  return (
    <fieldset className="model-provider" aria-describedby="model-provider-help">
      <legend>Suggestions par modèle</legend>
      <p className="provider-connection" data-configured={Boolean(selected)}><span className="connection-dot" aria-hidden="true" />{loading ? 'Lecture des modèles…' : unavailable ? 'Registre des modèles indisponible' : selected ? `${selected.provider.label} · configuré` : configured.length ? 'Choisis un modèle pour activer les suggestions' : 'Aucune API modèle configurée'}</p>
      {unavailable && <button className="button provider-retry" onClick={onRetry} disabled={loading}>Réessayer la connexion</button>}
      {configured.length > 0 && <>
        <label htmlFor="active-provider">Fournisseur</label>
        <select id="active-provider" value={selection.providerId ?? ''} onChange={(event) => onChange(selectProvider(registry, selection, event.target.value))} disabled={loading}>
          <option value="">Choisir un fournisseur</option>
          {configured.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
        </select>
        {selection.providerId && <>
          <label htmlFor="active-model">Modèle</label>
          <select id="active-model" value={selected?.model.id ?? ''} onChange={(event) => onChange(event.target.value ? selectModel(registry, selection, event.target.value) : { providerId: selection.providerId, modelId: null })} disabled={loading || !selection.providerId}>
            {registry.providers.find((provider) => provider.id === selection.providerId)!.models.length > 1 && <option value="">Choisir un modèle</option>}
            {registry.providers.find((provider) => provider.id === selection.providerId)?.models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
          </select>
        </>}
      </>}
      <p id="model-provider-help">{unavailable
        ? 'Le registre des modèles ne répond pas. Tu peux réessayer ici ; les pistes locales restent limitées.'
        : selected
          ? `Après chaque pause de 1,5 s, ta description et le brouillon enregistré sont envoyés à l’API ${selected.provider.label} (${selected.model.label}) pour produire l’aperçu. Dans ChatGPT, ce n’est pas une inférence cachée de ton abonnement : l’API est configurée séparément et peut être facturée par son fournisseur. La clé reste sur le serveur.`
          : configured.length === 0
            ? 'Aucune API de modèle n’est configurée sur le serveur. Configure le fournisseur côté serveur pour activer les propositions après 1,5 s ; les règles locales restent limitées.'
            : 'Choisis un modèle pour activer ses propositions après 1,5 s de pause. Les opérations restent limitées aux composants et mouvements connus du catalogue ; les clés restent sur le serveur.'}</p>
    </fieldset>
  );
}
