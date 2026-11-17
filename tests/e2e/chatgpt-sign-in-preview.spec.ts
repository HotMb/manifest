import { test, expect, type Page } from '@playwright/test';

type AuthTestState = { starts: number; polls: number; cancels: number; disconnects: number; registryReads: number; status: string };
type AuthTestWindow = Window & { __manifestAuthTest: { state(): AuthTestState; approve(): void; approvePlanOnly(): void; refuse(): void; failNextDisconnect(): void } };

async function openMockHost(page: Page) {
  await page.route('**/packages/host-adapters/src/index.ts*', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    import { initialProject } from ${JSON.stringify(route.request().url().replace(/host-adapters\/src\/index\.ts.*$/, 'm0-contract/src/index.ts'))};
    const planRegistry = { schemaVersion: 1, providers: [{ id:'openai', label:'OpenAI', protocol:'openai-responses', status:'configured', supportsBYOK:false, secretConfigured:true, models:[{id:'gpt-test',label:'Modèle de test',providerId:'openai',capabilities:['structured-output']}]}] };
    const apiRegistry = { schemaVersion: 1, providers: [{ id:'custom', label:'OpenAI API · facturation distincte', protocol:'openai-compatible', status:'configured', supportsBYOK:false, secretConfigured:true, models:[{id:'gpt-api-test',label:'Modèle API de test',providerId:'custom',capabilities:['structured-output']}]}] };
    const connectedRegistry = { schemaVersion: 1, providers: [...structuredClone(planRegistry).providers, ...structuredClone(apiRegistry).providers] };
    let auth = 'disconnected', registry = structuredClone(apiRegistry);
    let starts = 0, polls = 0, cancels = 0, disconnects = 0, registryReads = 0, failDisconnect = false;
    window.__manifestAuthTest = {
      state: () => ({ starts, polls, cancels, disconnects, registryReads, status: auth }),
      approve: () => { auth = 'connected'; registry = structuredClone(connectedRegistry); },
      approvePlanOnly: () => { auth = 'connected'; registry = structuredClone(planRegistry); },
      refuse: () => { auth = 'refused'; },
      failNextDisconnect: () => { failDisconnect = true; }
    };
    function status() {
      polls++;
      if (auth === 'connected') return { status:'connected', usageMode:'chatgpt-plan' };
      if (auth === 'refused') return { status:'disconnected', usageMode:'none', errorCode:'consent_denied' };
      if (auth === 'pending') return { status:'pending', usageMode:'none' };
      return { status:'disconnected', usageMode:'none' };
    }
    export function createBrowserTransport() { return {
      kind:'mcp', read:async()=>initialProject(),
      readProviderRegistry:async()=>{ registryReads++; return structuredClone(registry); },
      startChatGPTSignIn:async()=>{ starts++; auth='pending'; return { status:'pending', authorizationUrl:'https://auth.openai.com/api/accounts/authorize?client_id=dynamic_agent_client&state=e2e-state&code_challenge=e2e-challenge', expiresAt:new Date(Date.now()+60000).toISOString() }; },
      getChatGPTAuthStatus:async()=>status(),
      cancelChatGPTSignIn:async()=>{ cancels++; auth='disconnected'; registry=structuredClone(apiRegistry); return { status:'disconnected' }; },
      disconnectChatGPT:async()=>{ disconnects++; if (failDisconnect) { failDisconnect=false; return { status:'error', revocation:'failed', errorCode:'storage_error' }; } auth='disconnected'; registry=structuredClone(apiRegistry); return { status:'disconnected', revocation:'revoked' }; },
      close:async()=>{}
    }; }
    export const createMcpTransport = createBrowserTransport;
  ` }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?host=mcp');
  await expect(page.getByRole('textbox', { name: 'Description de la page', exact: true })).toBeVisible();
  await page.locator('.model-provider-disclosure > summary').click();
}

async function authState(page: Page) {
  return page.evaluate(() => (window as AuthTestWindow).__manifestAuthTest.state());
}

test('connexion ChatGPT : le clic ouvre le navigateur, autorise le forfait, charge les modèles puis permet la révocation', async ({ page }) => {
  await openMockHost(page);
  const connect = page.getByRole('button', { name: 'Continuer avec ChatGPT', exact: true });
  await expect(connect).toBeVisible();
  const authStatus = page.getByText('ChatGPT non connecté', { exact: true });
  await expect(authStatus).toBeVisible();
  await expect(authStatus).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByLabel('Fournisseur', { exact: true })).toHaveValue('');
  await expect(page.locator('#active-provider option[value="custom"]')).toHaveText('OpenAI API · facturation distincte');
  expect(page.context().pages()).toHaveLength(1);
  await connect.click();
  await expect(page.getByText('Autorisation en attente', { exact: true })).toBeVisible();
  const authorizationLink = page.getByRole('link', { name: 'Continuer dans le navigateur' });
  await expect(authorizationLink).toHaveAttribute('href', /^https:\/\/auth\.openai\.com\/api\/accounts\/authorize\?/);
  await expect(authorizationLink).toHaveAttribute('target', '_blank');
  expect(page.context().pages()).toHaveLength(1);

  await page.context().route('https://auth.openai.com/api/accounts/authorize**', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<meta charset="utf-8"><title>Autorisation simulée</title>' }));
  const popupPromise = page.waitForEvent('popup');
  await authorizationLink.click();
  const popup = await popupPromise;
  await expect(popup).toHaveTitle('Autorisation simulée');
  await page.evaluate(() => (window as AuthTestWindow).__manifestAuthTest.approve());
  await expect(page.getByText('ChatGPT connecté · utilisation autorisée', { exact: true })).toBeVisible({ timeout: 6000 });
  await expect(page.getByRole('link', { name: 'Gérer l’utilisation dans ChatGPT' })).toHaveAttribute('href', 'https://chatgpt.com/settings/usage');
  await expect(page.getByLabel('Fournisseur', { exact: true })).toHaveValue('');
  await page.getByLabel('Fournisseur', { exact: true }).selectOption('openai');
  await expect(page.getByLabel('Modèle', { exact: true })).toHaveValue('gpt-test');
  await expect(page.locator('#model-provider-help')).toContainText('avec l’autorisation ChatGPT');
  await expect(page.locator('#active-provider option[value="custom"]')).toHaveText('OpenAI API · facturation distincte');
  await page.getByLabel('Fournisseur', { exact: true }).selectOption('custom');
  await expect(page.getByLabel('Modèle', { exact: true })).toHaveValue('gpt-api-test');
  await expect(page.locator('#model-provider-help')).toContainText('Cette facturation est distincte du forfait ChatGPT.');
  await page.getByLabel('Fournisseur', { exact: true }).selectOption('openai');
  const visibleText = await page.locator('.model-provider').innerText();
  expect(visibleText).not.toMatch(/access_token|refresh_token|Bearer\s/i);
  expect((await authState(page)).registryReads).toBeGreaterThanOrEqual(2);

  await page.evaluate(() => (window as AuthTestWindow).__manifestAuthTest.failNextDisconnect());
  await page.getByRole('button', { name: 'Déconnecter ChatGPT', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('identifiants locaux');
  await expect(page.getByText('ChatGPT connecté · utilisation autorisée', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Déconnecter ChatGPT', exact: true }).click();
  await expect(page.getByText('ChatGPT non connecté', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuer avec ChatGPT', exact: true })).toBeVisible();
  await expect(page.getByLabel('Fournisseur', { exact: true })).toHaveValue('');
  await expect(page.locator('#active-provider option[value="custom"]')).toHaveText('OpenAI API · facturation distincte');
  expect((await authState(page)).disconnects).toBe(2);
  expect((await authState(page)).status).toBe('disconnected');
});

test('refus et annulation ne sélectionnent aucun modèle ChatGPT', async ({ page }) => {
  await openMockHost(page);
  await page.getByRole('button', { name: 'Continuer avec ChatGPT', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Continuer dans le navigateur' })).toBeVisible();
  await page.evaluate(() => (window as AuthTestWindow).__manifestAuthTest.refuse());
  await expect(page.getByRole('alert')).toContainText('L’autorisation a été refusée', { timeout: 6000 });
  await expect(page.getByRole('button', { name: 'Continuer avec ChatGPT', exact: true })).toBeVisible();
  await expect(page.getByLabel('Fournisseur', { exact: true })).toHaveValue('');

  await page.getByRole('button', { name: 'Continuer avec ChatGPT', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Annuler l’autorisation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Annuler l’autorisation', exact: true }).click();
  await expect(page.getByText('Autorisation annulée. Aucun accès au forfait ChatGPT n’est actif.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuer avec ChatGPT', exact: true })).toBeVisible();
  await expect(page.getByLabel('Fournisseur', { exact: true })).toHaveValue('');
  expect((await authState(page)).cancels).toBe(1);
  expect((await authState(page)).status).toBe('disconnected');
});

test('un modèle ChatGPT unique est présélectionné seulement quand aucune autre option n’est disponible', async ({ page }) => {
  await openMockHost(page);
  await page.getByRole('button', { name: 'Continuer avec ChatGPT', exact: true }).click();
  const authorizationLink = page.getByRole('link', { name: 'Continuer dans le navigateur' });
  await expect(authorizationLink).toBeVisible();
  await page.evaluate(() => (window as AuthTestWindow).__manifestAuthTest.approvePlanOnly());
  await expect(page.getByText('ChatGPT connecté · utilisation autorisée', { exact: true })).toBeVisible({ timeout: 6000 });
  await expect(page.getByLabel('Fournisseur', { exact: true })).toHaveValue('openai');
  await expect(page.getByLabel('Modèle', { exact: true })).toHaveValue('gpt-test');
});
