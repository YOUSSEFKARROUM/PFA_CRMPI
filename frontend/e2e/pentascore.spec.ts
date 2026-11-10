import { expect, test, type Page } from '@playwright/test';

/** Répond à toutes les questions visibles avec la valeur donnée (1-5). */
async function answerVisible(page: Page, value: number) {
  const groups = page.getByRole('radiogroup').filter({ has: page.locator('.choice') });
  const count = await groups.count();
  for (let i = 0; i < count; i += 1) {
    await groups.nth(i).locator('.choice').nth(value - 1).click();
  }
}

async function openStart(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Deux informations, puis vous répondez.' })).toBeVisible();
}

test('la landing présente les trois profils fictifs avec leurs scores validés', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Pentascore/);
  const demos = page.locator('#demonstration .demo-card');
  await expect(demos).toHaveCount(3);
  await expect(demos.nth(0)).toContainText('44/100');
  await expect(demos.nth(1)).toContainText('20/100');
  await expect(demos.nth(2)).toContainText('83/100');
});

test('mode section : 5 écrans, bouton bloqué tant que le domaine est incomplet, score calculé', async ({ page }) => {
  await openStart(page);
  await page.getByLabel('Organisation (facultatif)').fill('Atlas SARL');
  await page.getByRole('button', { name: 'Commencer l’évaluation' }).click();

  for (let domain = 1; domain <= 5; domain += 1) {
    await expect(page.getByText(`Domaine ${domain} sur 5`)).toBeVisible();
    const next = page.getByRole('button', { name: domain === 5 ? 'Voir mes résultats' : 'Domaine suivant' });
    await expect(next).toBeDisabled();
    await answerVisible(page, 3);
    await expect(next).toBeEnabled();
    await next.click();
  }

  await expect(page.getByRole('heading', { name: 'Maturité moyenne' })).toBeVisible();
  await expect(page.locator('.score-line')).toHaveAttribute('aria-label', 'Score global : 50 sur 100');
  await expect(page.getByText('Atlas SARL')).toBeVisible();
  await expect(page.locator('.priority')).toHaveCount(3);
  await expect(page.getByText(/Auto-évaluation déclarative/)).toBeVisible();
});

test('mode question par question : 25 écrans et retour arrière qui conserve la réponse', async ({ page }) => {
  await openStart(page);
  await page.getByText('Question par question', { exact: true }).click();
  await page.getByRole('button', { name: 'Commencer l’évaluation' }).click();

  await expect(page.getByText('Question 1 sur 25')).toBeVisible();
  await answerVisible(page, 5);
  await page.getByRole('button', { name: 'Question suivante' }).click();
  await page.getByRole('button', { name: 'Précédent' }).click();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);

  for (let question = 1; question <= 25; question += 1) {
    await expect(page.getByText(`Question ${question} sur 25`)).toBeVisible();
    await answerVisible(page, 5);
    await page.getByRole('button', { name: question === 25 ? 'Voir mes résultats' : 'Question suivante' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Maturité avancée' })).toBeVisible();
  await expect(page.locator('.score-line')).toHaveAttribute('aria-label', 'Score global : 100 sur 100');
});

test('profil de démonstration : résultats signalés comme fictifs et export PDF', async ({ page }) => {
  await page.goto('/');
  await page.locator('#demonstration .demo-card').first().click();

  await expect(page.getByText('Profil fictif de démonstration')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Maturité faible' })).toBeVisible();
  // Chaque priorité cite la réponse qui la justifie et ses sources (guide AUSIM-CMRPI, ISO 27001:2022).
  await expect(page.locator('.priority-why')).toHaveCount(3);
  await expect(page.locator('.priority-why').first()).toContainText('Parce que vous avez répondu');
  await expect(page.locator('.priority-sources').first()).toContainText('ISO/IEC 27001:2022');
  await expect(page.getByRole('button', { name: /historique/i })).toHaveCount(0);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger le rapport PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^rapport_pentascore_\d{8}\.pdf$/);

  const [badge] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger le badge (PNG)' }).click(),
  ]);
  expect(badge.suggestedFilename()).toBe('badge_pentascore.png');
});

test('replay : le panneau détaille les réponses qui ont coûté le plus de points', async ({ page }) => {
  await page.goto('/');
  await page.locator('#demonstration .demo-card').nth(1).click();

  const panel = page.locator('details.drivers');
  await expect(panel.locator('.driver')).toHaveCount(5);
  await expect(panel.locator('.driver').first()).toBeHidden();
  await page.getByText('Voir ce qui a le plus pesé sur votre score').click();
  await expect(panel.locator('.driver').first()).toBeVisible();
  await expect(panel.locator('.driver-points').first()).toHaveText('−4 points');
  await expect(panel.locator('.driver').first()).toContainText('Votre réponse : « Non »');
});

test('hors connexion : aucune ressource ni requête vers un domaine extérieur', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? 'http://127.0.0.1').origin;
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.origin !== origin) external.push(request.url());
  });

  await page.goto('/');
  await page.locator('#demonstration .demo-card').nth(1).click();
  await expect(page.getByRole('heading', { name: 'Maturité critique' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('600 16px "Fraunces"'))).toBe(true);

  expect(external).toEqual([]);
});

test('compte : consentement obligatoire, historique réel, déconnexion, suppression', async ({ page }) => {
  const email = `e2e-${Date.now()}@pme.ma`;
  await openStart(page);
  await page.getByRole('button', { name: 'Commencer l’évaluation' }).click();
  for (let domain = 1; domain <= 5; domain += 1) {
    await answerVisible(page, 4);
    await page.getByRole('button', { name: domain === 5 ? 'Voir mes résultats' : 'Domaine suivant' }).click();
  }
  await page.getByRole('button', { name: 'Créer un compte pour suivre mon évolution' }).click();

  await page.getByLabel('Email professionnel').fill(email);
  await page.getByLabel(/Mot de passe/).fill('motdepasse-e2e');
  await page.getByLabel('Organisation', { exact: true }).fill('PME E2E');
  const submit = page.getByRole('button', { name: 'Créer mon compte' });
  await expect(submit).toBeDisabled();
  await page.getByRole('checkbox').check();
  await submit.click();

  await expect(page.getByRole('heading', { name: 'Maturité avancée' })).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer dans mon historique' }).click();
  await expect(page.getByText('Évaluation enregistrée dans votre historique.')).toBeVisible();

  await page.getByRole('button', { name: 'Historique des évaluations' }).click();
  await expect(page.getByRole('heading', { name: /^1 évaluation depuis le/ })).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('75');

  await page.getByRole('button', { name: 'Supprimer mon compte et mes données' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer' }).click();
  await expect(page.getByRole('button', { name: 'Connexion' })).toBeVisible();

  const login = await page.request.post('/api/auth/login', { data: { email, password: 'motdepasse-e2e' } });
  expect(login.status()).toBe(401);
});

test('@mobile la landing et le questionnaire restent utilisables sans défilement horizontal', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);

  await page.getByRole('button', { name: 'Commencer', exact: true }).click();
  await page.getByRole('button', { name: 'Commencer l’évaluation' }).click();
  await answerVisible(page, 2);
  await expect(page.getByRole('button', { name: 'Domaine suivant' })).toBeEnabled();
});

test('fiche de poste RSSI : proposée si la gouvernance est faible, absente sinon', async ({ page }) => {
  await page.goto('/');
  await page.locator('#demonstration .demo-card').nth(1).click();
  await expect(page.getByRole('heading', { name: 'Désigner un responsable sécurité' })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger le modèle de fiche de poste' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('fiche_poste_rssi_pentascore.pdf');

  await page.getByRole('button', { name: 'Quitter' }).click();
  await page.locator('#demonstration .demo-card').nth(2).click();
  await expect(page.getByRole('heading', { name: 'Maturité avancée' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Télécharger le modèle de fiche de poste' })).toHaveCount(0);
});

test('points à revérifier : réponses contradictoires signalées sans changer le score', async ({ page }) => {
  await openStart(page);
  await page.getByText('Question par question', { exact: true }).click();
  await page.getByRole('button', { name: 'Commencer l’évaluation' }).click();

  for (let question = 1; question <= 25; question += 1) {
    await expect(page.getByText(`Question ${question} sur 25`)).toBeVisible();
    // q6 « Active Directory + MFA » (4) et q8 « Non » (1) : contradiction CR-01.
    const value = question === 6 ? 4 : question === 8 ? 1 : 3;
    await answerVisible(page, value);
    await page.getByRole('button', { name: question === 25 ? 'Voir mes résultats' : 'Question suivante' }).click();
  }

  const checks = page.getByRole('region', { name: 'Points à revérifier' });
  await expect(checks).toBeVisible();
  await expect(checks.locator('.check')).toHaveCount(1);
  await expect(checks).toContainText('Votre réponse : « Active Directory + MFA »');
  await expect(checks).toContainText('Votre réponse : « Non »');
  await expect(page.locator('.priority')).toHaveCount(3);
});

test('après une démo, « Commencer » repart d’une évaluation vierge (aucune réponse fictive reprise)', async ({ page }) => {
  await page.goto('/');
  await page.locator('#demonstration .demo-card').first().click();
  await expect(page.getByText('Profil fictif de démonstration')).toBeVisible();

  await page.getByRole('button', { name: 'Quitter' }).click();
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();

  await expect(page.getByLabel('Organisation (facultatif)')).toHaveValue('');
  await page.getByRole('button', { name: 'Commencer l’évaluation' }).click();
  await expect(page.getByText('0/25 réponses')).toBeVisible();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
});

test('les réponses se choisissent au clavier (flèches) et le focus suit les étapes', async ({ page }) => {
  await openStart(page);
  await page.getByRole('button', { name: 'Commencer l’évaluation' }).click();
  await expect(page.locator('#quiz-title')).toBeFocused();

  await page.locator('.choice input').first().focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');

  const firstGroup = page.getByRole('radiogroup').first();
  await expect(firstGroup.getByRole('radio', { checked: true })).toHaveAccessibleName(/^3/);
});
