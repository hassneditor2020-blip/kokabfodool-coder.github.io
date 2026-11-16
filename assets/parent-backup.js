import {activeProfile} from './profile-state.js?v=2';
import {backupVersion, mergeLevels, restoreLevels, snapshotLevels} from './progress-transfer.js?v=1';

const ar = document.documentElement.lang === 'ar';
const tr = (arText, enText) => ar ? arText : enText;
const authBase = 'https://identitytoolkit.googleapis.com/v1/accounts:';
const databaseBase = 'https://firestore.googleapis.com/v1/';

async function request(url, {method = 'GET', token, data} = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (data) headers['Content-Type'] = 'application/json';
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 12000);
  try {
    const response = await fetch(url, {method, headers, body: data && JSON.stringify(data), signal: abort.signal,
      cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error'});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = Error('backup-request');
      error.status = response.status;
      error.code = result.error?.status;
      throw error;
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function mountParentBackup(root, playerLabel) {
  let config;
  try { config = await request('/assets/parent-backup-config.json'); } catch { return; }
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId ?? '') ||
      !/^AIza[a-zA-Z0-9_-]{30,45}$/.test(config.apiKey ?? '')) return;

  const authForm = root.querySelector('[data-parent-auth]');
  const account = root.querySelector('[data-parent-tools]');
  const status = root.querySelector('[data-parent-status]');
  const slot = account.querySelector('select');
  const adult = authForm.elements.adult;
  const password = authForm.elements.password;
  let session;
  let busy = false;

  function auth(action, data) {
    return request(authBase + action + '?key=' + encodeURIComponent(config.apiKey), {method: 'POST', data});
  }
  const database = 'projects/' + config.projectId + '/databases/(default)';
  function documentName(number) {
    return database + '/documents/familyBackups/' + encodeURIComponent(session.uid) + '/slots/' + number;
  }
  function commit(writes) {
    return request(databaseBase + database + '/documents:commit',
      {method: 'POST', token: session.token, data: {writes}});
  }
  async function readSlot(number) {
    try {
      const document = await request(databaseBase + documentName(number), {token: session.token});
      if (Number(document.fields?.version?.integerValue) !== backupVersion ||
          typeof document.fields?.levels?.stringValue !== 'string') throw Error('backup version');
      return {levels: document.fields.levels.stringValue, updated: document.updateTime};
    } catch (error) {
      if (error.status === 404) return {levels: ''};
      throw error;
    }
  }

  async function saveSlot(number, levels) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const remote = await readSlot(number);
      const combined = mergeLevels(remote.levels, levels);
      if (combined === remote.levels) return;
      const currentDocument = remote.updated ? {updateTime: remote.updated} : {exists: false};
      const update = {name: documentName(number),
        fields: {version: {integerValue: String(backupVersion)}, levels: {stringValue: combined}}};
      try {
        await commit([{update, currentDocument}]);
        return;
      } catch (error) {
        if (attempt === 2 || !([409, 412].includes(error.status) || error.code === 'FAILED_PRECONDITION' ||
                                    error.code === 'ALREADY_EXISTS')) throw error;
      }
    }
  }

  function showAccount() {
    const connected = !!session;
    authForm.hidden = connected;
    account.hidden = !connected;
    account.querySelector('[data-parent-player]').textContent = playerLabel();
  }

  async function run(operation) {
    if (busy) return;
    busy = true;
    root.setAttribute('aria-busy', 'true');
    for (const button of root.querySelectorAll('button')) button.disabled = true;
    try { await operation(); }
    catch {
      status.textContent = tr('تعذّر إتمام العملية. تحقّق من اتصال الإنترنت أو أعد تسجيل الدخول.',
        'Could not complete this action. Check your connection or sign in again.');
    } finally {
      busy = false;
      root.removeAttribute('aria-busy');
      for (const button of root.querySelectorAll('button')) button.disabled = false;
    }
  }

  authForm.addEventListener('submit', event => {
    event.preventDefault();
    const action = event.submitter?.value ?? 'sign-in';
    const email = authForm.elements.email.value.trim();
    const secret = password.value;
    if (!adult.checked || !authForm.elements.email.checkValidity()) return;
    if (action !== 'reset' && (!secret || (action === 'sign-up' && secret.length < 8))) {
      status.textContent = tr('أدخل كلمة المرور. للحساب الجديد استخدم 8 أحرف على الأقل.',
        'Enter your password. Use at least 8 characters for a new account.');
      return;
    }
    password.value = '';
    run(async () => {
      if (action === 'reset') {
        await auth('sendOobCode', {requestType: 'PASSWORD_RESET', email});
        status.textContent = tr('راجع بريدك لإعادة تعيين كلمة المرور.',
          'Check your inbox for a password reset link.');
        return;
      }
      const signed = await auth(action === 'sign-up' ? 'signUp' : 'signInWithPassword',
        {email, password: secret, returnSecureToken: true});
      const {idToken, localId} = signed;
      const user = (await auth('lookup', {idToken})).users?.[0];
      if (user?.emailVerified !== true) {
        await auth('sendOobCode', {requestType: 'VERIFY_EMAIL', idToken});
        status.textContent = tr('افتح رابط التأكيد في بريدك، ثم سجّل الدخول مرة أخرى.',
          'Open the verification link in your email, then sign in again.');
        return;
      }
      if (!/^[\w-]{1,128}$/.test(localId ?? '') || !idToken) throw Error('invalid session');
      session = {uid: localId, token: idToken};
      authForm.reset();
      status.textContent = '';
      showAccount();
    });
  });

  account.querySelector('[data-parent-save]').addEventListener('click', () => run(async () => {
    const levels = snapshotLevels();
    if (!levels) {
      status.textContent = tr('أكمل مستوى أولًا لتتمكن من حفظه.', 'Finish a level before saving progress.');
      return;
    }
    await saveSlot(slot.value, levels);
    status.textContent = tr('تم تحديث نسخة اللاعب في الخانة المختارة.', 'Backup updated in the selected slot.');
  }));
  account.querySelector('[data-parent-restore]').addEventListener('click', () => run(async () => {
    const playerId = activeProfile().id;
    const {levels} = await readSlot(slot.value);
    if (playerId !== activeProfile().id) throw Error('player changed');
    if (!levels) {
      status.textContent = tr('هذه الخانة فارغة.', 'This backup slot is empty.');
      return;
    }
    const count = restoreLevels(levels, playerId);
    status.textContent = count ? tr(count === 1 ? 'استُعيد تقدّم مستوى واحد.' : `استُعيد تقدّم ${count} مستوى.`,
        `Progress restored for ${count} ${count === 1 ? 'level' : 'levels'}.`)
      : tr('التقدّم على الجهاز يطابق النسخة أو يتجاوزها.', 'Progress on this device already meets or exceeds this backup.');
  }));
  account.querySelector('[data-parent-signout]').addEventListener('click', () => {
    session = undefined;
    status.textContent = tr('تم تسجيل الخروج.', 'Signed out.');
    showAccount();
  });

  account.querySelector('[data-parent-delete]').addEventListener('click', () => run(async () => {
    if (!window.confirm(tr('حذف حساب ولي الأمر وجميع نسخه المحفوظة؟', 'Delete the parent account and all its online backups?'))) return;
    await commit([...slot.options].map(option => ({delete: documentName(option.value)})));
    await auth('delete', {idToken: session.token});
    session = undefined;
    status.textContent = tr('حُذف الحساب والنسخ المحفوظة عبر الإنترنت.', 'The account and its online backups were deleted.');
    showAccount();
  }));

  window.addEventListener('pagehide', () => {
    session = undefined;
    showAccount();
  });
  root.hidden = false;
  showAccount();
}
