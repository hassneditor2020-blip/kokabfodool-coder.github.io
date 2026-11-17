const ar = document.documentElement.lang === 'ar';
const tr = (arabic, english) => ar ? arabic : english;
const form = document.querySelector('#delete-account');
const submit = form.querySelector('button');
const status = document.querySelector('#deletion-status');

async function call(url, {data, token} = {}) {
  const headers = {};
  if (data) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method: data ? 'POST' : 'GET', headers, body: data && JSON.stringify(data),
      credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
    });
    if (!response.ok) throw Error('request failed');
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function deleteAccount() {
  const config = await call('/assets/parent-backup-config.json');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId ?? '') ||
      !/^AIza[\w-]{35}$/.test(config.apiKey ?? '')) throw Error('configuration');
  const auth = (action, data) => call(
    'https://identitytoolkit.googleapis.com/v1/accounts:' + action + '?key=' + encodeURIComponent(config.apiKey), {data}
  );
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  form.elements.password.value = '';
  const {idToken, localId} = await auth('signInWithPassword', {email, password, returnSecureToken: true});
  if (!idToken || !/^[\w-]{1,128}$/.test(localId ?? '')) throw Error('session');
  const user = (await auth('lookup', {idToken})).users?.[0];
  if (user?.localId !== localId) throw Error('identity');
  if (user.emailVerified) {
    const database = 'projects/' + config.projectId + '/databases/(default)';
    const writes = Array.from({length: 6}, (_, index) => ({
      delete: database + '/documents/familyBackups/' + localId + '/slots/' + (index + 1),
    }));
    await call('https://firestore.googleapis.com/v1/' + database + '/documents:commit',
      {token: idToken, data: {writes}});
  }
  await auth('delete', {idToken});
}

submit.disabled = false;
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled || !confirm(tr('هل تريد حذف حسابك ونسخ التقدّم السحابية نهائيًا؟',
    'Permanently delete your account and your online progress backups?'))) return;
  submit.disabled = true;
  status.textContent = tr('جارٍ الحذف…', 'Deleting…');
  try {
    await deleteAccount();
    form.reset();
    form.hidden = true;
    status.textContent = tr('حُذف حسابك والنسخ السحابية.', 'Your account and online backups were deleted.');
  } catch {
    status.textContent = tr('لم يكتمل الحذف. تحقّق من البريد وكلمة المرور وحاول مجدّدًا، أو تواصل مع الدعم.',
      'Deletion could not be completed. Check your email and password and try again, or contact support.');
  } finally {
    submit.disabled = false;
  }
});
