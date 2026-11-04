import type { ModelProviderRegistry } from '@design-workbench/m0-contract';
import { selectModel, selectProvider, selectedModel, type ModelSelection } from './model-selection.ts';

export function ModelProviderPanel({
  registry, selection, onChange, loading, unavailable,
}: {
  registry: ModelProviderRegistry;
  selection: ModelSelection;
  onChange: (value: ModelSelection) => void;
  loading: boolean;
  unavailable: boolean;
}) {
  const configured = registry.providers.filter((provider) => provider.status === 'configured' && provider.models.length > 0);
  const selected = selectedModel(registry, selection);
  return (
    <fieldset className="model-provider" aria-describedby="model-provider-help">
      <legend>Suggestions par modèle</legend>
      <p className="provider-connection" data-configured={Boolean(selected)}><span className="connection-dot" aria-hidden="true" />{loading ? 'Lecture des modèles…' : selected ? `${selected.provider.label} · configuré` : configured.length ? 'Choisis un modèle pour activer les suggestions' : 'Aucun modèle configuré'}</p>
      {configured.length > 0 && <>
        <label htmlFor="active-provider">Fournisseur</label>
        <select id="active-provider" value={selection.providerId ?? ''} onChange={(event) => onChange(selectProvider(registry, selection, event.target.value))} disabled={loading}>
          <option value="">Suggestions locales seulement</option>
          {configured.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
        </select>
        {selection.providerId && <>
          <label htmlFor="active-model">Modèle</label>
          <select id="active-model" value={selected?.model.id ?? ''} onChange={(event) => onChange(selectModel(registry, selection, event.target.value))} disabled={loading || !selected}>
            {registry.providers.find((provider) => provider.id === selection.providerId)?.models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
          </select>
        </>}
      </>}
      <p id="model-provider-help">{unavailable
        ? 'Le catalogue de modèles ne répond pas. Les règles locales restent disponibles ; vérifie la connexion à l’atelier.'
        : selected
          ? `Après chaque pause de 1,5 s, ta description et le brouillon enregistré sont envoyés à ${selected.provider.label} (${selected.model.label}). Le modèle reste limité aux éléments du catalogue local. Chaque requête peut être facturée selon l’offre du fournisseur ; la clé reste sur le serveur.`
          : 'Sans modèle sélectionné, seules les règles locales et la recette ventes sont utilisées. Avec un modèle configuré, les propositions restent limitées aux composants et mouvements connus du catalogue. Les identifiants et clés restent sur le serveur.'}</p>
    </fieldset>
  );
}
