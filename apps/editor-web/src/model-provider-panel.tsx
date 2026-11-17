import type { ModelProviderRegistry } from '@design-workbench/m0-contract';
import type { ChatGPTAuthStatus } from '@design-workbench/host-adapters';
import { selectModel, selectProvider, selectedModel, type ModelSelection } from './model-selection.ts';

function authStatusLabel(status: ChatGPTAuthStatus, loading: boolean) {
  if (loading) return 'Vérification de ChatGPT…';
  if (status.status === 'connected' && status.usageMode === 'chatgpt-plan') return 'ChatGPT connecté · utilisation autorisée';
  if (status.status === 'connected') return 'ChatGPT connecté · utilisation non autorisée';
  if (status.status === 'pending') return 'Autorisation en attente';
  if (status.status === 'unsupported') return 'Connexion ChatGPT indisponible sur cet hôte';
  if (status.status === 'error') return 'État de connexion indisponible';
  return 'ChatGPT non connecté';
}

export function ModelProviderPanel({
  registry, selection, onChange, loading, unavailable, onRetry,
  authEnabled, authStatus, authLoading, authBusy, authorizationUrl, authNotice, authError,
  onStartAuth, onCancelAuth, onDisconnectAuth, onRetryAuth,
}: {
  registry: ModelProviderRegistry;
  selection: ModelSelection;
  onChange: (value: ModelSelection) => void;
  loading: boolean;
  unavailable: boolean;
  onRetry: () => void;
  authEnabled: boolean;
  authStatus: ChatGPTAuthStatus;
  authLoading: boolean;
  authBusy: boolean;
  authorizationUrl?: string;
  authNotice: string;
  authError: string;
  onStartAuth: () => void;
  onCancelAuth: () => void;
  onDisconnectAuth: () => void;
  onRetryAuth: () => void;
}) {
  const planAuthorized = authStatus.status === 'connected' && authStatus.usageMode === 'chatgpt-plan';
  const selectableRegistry = authEnabled && !planAuthorized
    ? { ...registry, providers: registry.providers.filter((provider) => provider.protocol !== 'openai-responses') }
    : registry;
  const configured = selectableRegistry.providers.filter((provider) => provider.status === 'configured' && provider.models.length > 0);
  const selected = selectedModel(selectableRegistry, selection);
  const activeOpenAiSource = selected?.provider.protocol === 'openai-responses'
    ? planAuthorized ? 'ChatGPT · forfait' : 'ChatGPT · utilisation non autorisée'
    : selected?.provider.protocol === 'openai-compatible' && selected.provider.label.startsWith('OpenAI API')
      ? 'OpenAI · API facturée séparément'
    : undefined;
  const helpText = !authEnabled
    ? unavailable
      ? 'Le registre des modèles ne répond pas. Tu peux réessayer ici ; les pistes locales restent limitées.'
      : selected
        ? `Après chaque pause de 1,5 s, ta description et le brouillon enregistré sont envoyés à l’API ${selected.provider.label} (${selected.model.label}) pour produire l’aperçu. Dans ChatGPT, ce n’est pas une inférence cachée de ton abonnement : l’API est configurée séparément et peut être facturée par son fournisseur. La clé reste sur le serveur.`
        : configured.length === 0
          ? 'Aucune API de modèle n’est configurée sur le serveur. Configure le fournisseur côté serveur pour activer les propositions après 1,5 s ; les règles locales restent limitées.'
          : 'Choisis un modèle pour activer ses propositions après 1,5 s de pause. Les opérations restent limitées aux composants et mouvements connus du catalogue ; les clés restent sur le serveur.'
    : unavailable
      ? 'Le registre des modèles ne répond pas. Tu peux réessayer ici ; les pistes locales restent limitées.'
      : selected && activeOpenAiSource === 'ChatGPT · forfait'
        ? `Après chaque pause de 1,5 s, ta description et le brouillon enregistré sont transmis au modèle ${selected.model.label} avec l’autorisation ChatGPT. L’usage reste soumis aux limites de ton forfait.`
        : selected && activeOpenAiSource === 'OpenAI · API facturée séparément'
          ? `Après chaque pause de 1,5 s, ta description et le brouillon enregistré sont transmis à ${selected.provider.label} (${selected.model.label}) par l’API. Cette facturation est distincte du forfait ChatGPT.`
          : selected
            ? `Après chaque pause de 1,5 s, ta description et le brouillon enregistré sont transmis à ${selected.provider.label} (${selected.model.label}) pour produire l’aperçu. Les coûts et limites dépendent de ce fournisseur.`
            : configured.length === 0
              ? 'Aucun modèle API n’est configuré. Connecte ChatGPT pour utiliser les modèles autorisés par ton forfait, ou continue avec les pistes locales limitées.'
              : 'Choisis un modèle pour activer ses propositions après 1,5 s de pause. Les opérations restent limitées aux composants et mouvements connus du catalogue ; les clés API restent sur le serveur.';
  return (
    <fieldset className="model-provider" aria-describedby="model-provider-help">
      <legend>Suggestions par modèle</legend>
      <p className="provider-connection" data-configured={Boolean(selected)}><span className="connection-dot" aria-hidden="true" />{loading ? 'Lecture des modèles…' : unavailable ? 'Registre des modèles indisponible' : selected ? `${selected.provider.label} · configuré` : configured.length ? 'Choisis un modèle pour activer les suggestions' : authEnabled ? 'Aucun modèle configuré' : 'Aucune API modèle configurée'}</p>
      {unavailable && <button type="button" className="button provider-retry" onClick={onRetry} disabled={loading}>Réessayer la connexion</button>}
      {configured.length > 0 && <>
        <label htmlFor="active-provider">Fournisseur</label>
        <select id="active-provider" value={selection.providerId ?? ''} onChange={(event) => onChange(selectProvider(selectableRegistry, selection, event.target.value))} disabled={loading}>
          <option value="">Choisir un fournisseur</option>
          {configured.map((provider) => <option key={provider.id} value={provider.id}>{provider.label.startsWith('OpenAI API') ? provider.label : provider.id === 'openai' && provider.protocol === 'openai-responses' ? `${provider.label} · forfait ChatGPT` : provider.label}</option>)}
        </select>
        {selection.providerId && <>
          <label htmlFor="active-model">Modèle</label>
          <select id="active-model" value={selected?.model.id ?? ''} onChange={(event) => onChange(event.target.value ? selectModel(selectableRegistry, selection, event.target.value) : { providerId: selection.providerId, modelId: null })} disabled={loading || !selection.providerId}>
            {selectableRegistry.providers.find((provider) => provider.id === selection.providerId)!.models.length > 1 && <option value="">Choisir un modèle</option>}
            {selectableRegistry.providers.find((provider) => provider.id === selection.providerId)?.models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
          </select>
        </>}
      </>}

      {authEnabled && <section className="chatgpt-auth" aria-label="Connexion ChatGPT">
        <div className="chatgpt-auth__heading">
          <strong aria-live="polite" aria-atomic="true">{authStatusLabel(authStatus, authLoading)}</strong>
          {authBusy && <span className="chatgpt-auth__spinner" aria-hidden="true" />}
        </div>
        {authStatus.status === 'pending' ? <>
          <p>Autorise Manifest dans le navigateur, puis reviens ici. La fenêtre reste ouverte pendant la vérification.</p>
          {authorizationUrl && <a className="button chatgpt-auth__link" href={authorizationUrl} target="_blank" rel="noopener noreferrer">Continuer dans le navigateur <span aria-hidden="true">↗</span></a>}
          {!authorizationUrl && <><p className="chatgpt-auth__muted">Une autorisation a déjà été lancée. Manifest attend son retour.</p><button type="button" className="button chatgpt-auth__connect" onClick={onStartAuth} disabled={authBusy || authLoading}>{authBusy ? 'Préparation…' : 'Récupérer le lien d’autorisation'}</button></>}
          {authError && <button type="button" className="text-button chatgpt-auth__secondary" onClick={onRetryAuth} disabled={authBusy || authLoading}>Vérifier à nouveau</button>}
          <button type="button" className="text-button chatgpt-auth__secondary" onClick={onCancelAuth} disabled={authBusy}>Annuler l’autorisation</button>
        </> : authStatus.status === 'connected' ? <>
          {planAuthorized
            ? <p>Les suggestions utilisent les modèles autorisés par ton forfait ChatGPT, selon ses limites. Manifest n’accède pas à tes conversations et ne demande pas de clé API.</p>
            : <p>Le compte est reconnu, mais l’usage du forfait ChatGPT n’est pas autorisé pour Manifest.</p>}
          <a className="chatgpt-auth__settings" href="https://chatgpt.com/settings/usage" target="_blank" rel="noopener noreferrer">Gérer l’utilisation dans ChatGPT <span aria-hidden="true">↗</span></a>
          {planAuthorized
            ? <button type="button" className="text-button chatgpt-auth__secondary" onClick={onDisconnectAuth} disabled={authBusy}>{authBusy ? 'Déconnexion…' : 'Déconnecter ChatGPT'}</button>
            : <button type="button" className="button chatgpt-auth__connect" onClick={onStartAuth} disabled={authBusy || authLoading}>{authBusy ? 'Connexion…' : 'Autoriser l’usage du forfait'}</button>}
        </> : authStatus.status === 'unsupported' ? <>
          <p>Utilise l’API d’un fournisseur configuré ou les pistes locales. Aucun identifiant de connexion n’est demandé dans Manifest.</p>
          <button type="button" className="button chatgpt-auth__connect" onClick={onRetryAuth} disabled={authBusy || authLoading}>Vérifier à nouveau</button>
        </> : authStatus.status === 'error' ? <>
          <p>La connexion n’a pas abouti. Tes descriptions et réglages sont conservés.</p>
          <button type="button" className="button chatgpt-auth__connect" onClick={onStartAuth} disabled={authBusy || authLoading}>{authBusy ? 'Connexion…' : 'Réessayer avec ChatGPT'}</button>
        </> : <>
          <p>Connecte ton compte pour utiliser les modèles autorisés par ton forfait ChatGPT. Tu donneras ton accord dans le navigateur ; Manifest n’accède pas à tes conversations et ne demande pas de clé API.</p>
          <button type="button" className="button button--primary chatgpt-auth__connect" onClick={onStartAuth} disabled={authBusy || authLoading}>{authBusy ? 'Préparation…' : 'Continuer avec ChatGPT'}</button>
        </>}
        {authError && <p className="chatgpt-auth__error" role="alert">{authError}</p>}
        {authError.includes('révocation distante') && <a className="chatgpt-auth__settings" href="https://chatgpt.com" target="_blank" rel="noopener noreferrer">Ouvrir ChatGPT pour vérifier l’accès <span aria-hidden="true">↗</span></a>}
        {authNotice && <p className="chatgpt-auth__notice" role="status" aria-live="polite">{authNotice}</p>}
        <p className="chatgpt-auth__billing">L’API d’un fournisseur est distincte et peut être facturée séparément.</p>
      </section>}

      <p id="model-provider-help">{helpText}</p>
    </fieldset>
  );
}
