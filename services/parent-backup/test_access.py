"""Exercise sign-up, email verification and backup rules on a local Firebase demo project."""

import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

PROJECT = 'demo-fudool-settings'
AUTH = 'http://127.0.0.1:9099'
DOCUMENTS = ('http://127.0.0.1:8080/v1/projects/' + PROJECT +
             '/databases/(default)/documents/familyBackups/')


def call(url, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    body = None if data is None else json.dumps(data).encode()
    try:
        with urlopen(Request(url, data=body, headers=headers, method=method), timeout=10) as response:
            return response.status, json.loads(response.read() or '{}')
    except HTTPError as error:
        return error.code, json.loads(error.read() or '{}')


def auth(operation, data):
    status, result = call(AUTH + '/identitytoolkit.googleapis.com/v1/accounts:' + operation +
                          '?key=demo-test', 'POST', data)
    assert status == 200, (operation, status)
    return result


def create_user():
    email = uuid4().hex + '@example.test'
    credentials = {'email': email, 'password': str(uuid4()), 'returnSecureToken': True}
    return credentials, auth('signUp', credentials)


def confirm_email(credentials, user):
    auth('sendOobCode', {'requestType': 'VERIFY_EMAIL', 'idToken': user['idToken']})
    status, available = call(AUTH + '/emulator/v1/projects/' + PROJECT + '/oobCodes')
    assert status == 200
    code = next(item['oobCode'] for item in available['oobCodes']
                if item['email'] == credentials['email'] and item['requestType'] == 'VERIFY_EMAIL')
    auth('update', {'oobCode': code})
    signed_in = auth('signInWithPassword', credentials)
    looked_up = auth('lookup', {'idToken': signed_in['idToken']})
    assert looked_up['users'][0]['emailVerified'] is True
    return signed_in['idToken']


def fields(levels):
    return {'fields': {'version': {'integerValue': '1'}, 'levels': {'stringValue': levels}}}


def write(url, levels, current_document, token):
    name = url.split('/v1/')[1]
    commit = url.split('/documents/')[0] + '/documents:commit'
    update = {'name': name, **fields(levels)}
    data = {'writes': [{'update': update, 'currentDocument': current_document}]}
    return call(commit, 'POST', data, token)


def main():
    credentials, user = create_user()
    other_credentials, other_user = create_user()
    url = DOCUMENTS + user['localId'] + '/slots/1'
    assert call(url)[0] == 403
    assert call(url, token=user['idToken'])[0] == 403
    owner = confirm_email(credentials, user)
    stranger = confirm_email(other_credentials, other_user)
    assert call(url, 'PATCH', fields('counting:30;memory:3'), stranger)[0] == 403
    assert call(url, 'PATCH', fields('made-up:3'), owner)[0] == 403
    assert call(url, 'PATCH', fields('counting:35'), owner)[0] == 403
    assert call(url[:-1] + '7', 'PATCH', fields('counting:3'), owner)[0] == 403
    private_field = fields('counting:3')
    private_field['fields']['nickname'] = {'stringValue': 'private name'}
    assert call(url, 'PATCH', private_field, owner)[0] == 403

    status, result = write(url, 'counting:30;memory:3', {'exists': False}, owner)
    assert status == 200
    assert call(url, token=stranger)[0] == 403
    assert write(url, 'counting:31', {'exists': False}, owner)[0] in (400, 409, 412)
    current = {'updateTime': result['writeResults'][0]['updateTime']}
    write_status, failure = write(url, 'counting:32;memory:3;trace:2', current, owner)
    assert write_status == 200, (write_status, failure.get('error', {}).get('message'))
    assert write(url, 'counting:31', current, owner)[0] in (400, 409, 412)
    assert call(url, 'DELETE', token=stranger)[0] == 403
    assert call(url, 'DELETE', token=owner)[0] == 200
    assert call(url, token=owner)[0] == 404
    auth('delete', {'idToken': owner})
    auth('delete', {'idToken': stranger})
    print('PASS Firebase emulators: verified email; owner-only backups; schema, write conflicts and deletion.')


if __name__ == '__main__':
    main()
