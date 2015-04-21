import { createCryptoManager, generateRandomPassword } from './crypto';
import { postAsync, getAsync } from './network';
import { getListManager } from './listManager';

const downloadUrl = 'encrypted/passwords.txt?noCache=' + Math.floor(Math.random() * 1e6);
const uploadUrl = 'libupdate.php';
const localStorageKey = 'password-library';
const maxIdleTime = 20; // seconds
let offlineMode = false;

// start download as early as possible
let downloadPromise = getAsync(downloadUrl)
    .catch(() => new Promise((resolve, reject) => {
        const cachedLibrary = window.localStorage.getItem(localStorageKey);

        if ( ! cachedLibrary) {
            return reject(new Error('Couldn\'t download library and there was no cached version'));
        }

        offlineMode = true;
        resolve(cachedLibrary);
    }))
    .then(JSON.parse);

function selectText() {
    if (document.selection) {
        let range = document.body.createTextRange();
        range.moveToElementText(this);
        range.select();
    } else if (window.getSelection) {
        let range = document.createRange();
        range.selectNode(this);
        window.getSelection().addRange(range);
    }
}

function addObscuredCell(row, text) {
    let node = document.createElement('td');
    let span = document.createElement('div');
    span.classList.add('obscured');
    span.innerHTML = text;
    span.addEventListener('click', selectText);
    node.appendChild(span);
    row.appendChild(node);
}

function addLinkCell(row, url, text) {
    let node = document.createElement('td');
    let anchor = document.createElement('a');
    anchor.href = url;
    anchor.innerHTML = text;
    anchor.target = '_blank';
    node.appendChild(anchor);
    row.appendChild(node);
}

function addComment(row, text) {
    let node = document.createElement('td');
    let table = document.createElement('table');
    let tableRow = document.createElement('tr');
    let cell = document.createElement('td');
    table.classList.add('comment');
    cell.innerHTML = text;
    tableRow.appendChild(cell);
    table.appendChild(tableRow);
    node.appendChild(table);
    row.appendChild(node);
}

/**
 * @param url     string
 * @param library object
 * @param hash    string
 * @param newHash string
 * @returns Promise
 */
function postLibraryAsync(url, library, hash, newHash) {
    const encodedLibrary = encodeURIComponent(JSON.stringify(library));
    const params = `pwhash=${hash}&newlib=${encodedLibrary}&newhash=${newHash}`;

    return postAsync(url, params);
}

/* filter shortcut: ctrl+e */
function isFilterShortCut(event) {
    return event.ctrlKey && event.keyCode === 69;
}

function isEscapeKey(event) {
    return event.keyCode === 27;
}

window.onload = function() {
    let listManager = null;
    let cryptoManager = null;
    let idleTime = 0;

    let $masterKeyInput = document.getElementById('encryptionKey');
    let $filterInput = document.getElementById('filter');
    let $titleInput = document.getElementById('title');
    let $urlInput = document.getElementById('URL');
    let $userNameInput = document.getElementById('username');
    let $passwordInput = document.getElementById('pass');
    let $passwordRepeatInput = document.getElementById('passRepeat');
    let $commentInput = document.getElementById('comment');
    let $newMasterKeyInput = document.getElementById('key');
    let $newMasterKeyRepeatInput = document.getElementById('keyRepeat');

    let $randomPasswordButton = document.getElementById('randPass');
    let $saveButton = document.getElementById('save');
    let $saveMasterKeyButton = document.getElementById('saveKey');
    let $modalCloseButtonOne = document.getElementById('modalClose1');
    let $modalCloseButtonTwo = document.getElementById('modalClose2');
    let $newPasswordButtonList = document.getElementsByClassName('newPassword');
    let $newMasterKeyButtonList = document.getElementsByClassName('newMasterKey');

    let $decryptForm = document.getElementById('decrypt');
    let $tableBody = document.getElementById('overview').lastChild;
    let $editModal = document.getElementById('editModal');
    let $editModalHeader = document.getElementById('modalHeader');
    let $masterKeyModal = document.getElementById('masterkeyModal');
    let $authorizedSection = document.getElementById('authorized');
    let $unauthorizedSection = document.getElementById('unauthorized');

    $masterKeyInput.focus();
    setInterval(incrementIdleTime, 1000);

    $decryptForm.addEventListener('submit', decryptPage, false);
    $saveButton.addEventListener('click', saveChanges);
    $randomPasswordButton.addEventListener('click', setRandomPassword);
    $editModal.addEventListener('click', closeDialog);
    $masterKeyModal.addEventListener('click', closeDialog);
    $modalCloseButtonOne.addEventListener('click', closeDialog);
    $modalCloseButtonTwo.addEventListener('click', closeDialog);

    $filterInput.addEventListener('keyup', filterList);
    document.addEventListener('touchstart', resetIdleTime, false);
    document.addEventListener('touchmove', resetIdleTime, false);
    document.addEventListener('touchend', resetIdleTime, false);
    document.addEventListener('keydown', checkKeyDown, false);
    document.onmousemove = resetIdleTime;

    // FIXME: maybe we should just set a css class somewhere and hide these properties in css
    if (offlineMode) {
        for(let button of $newPasswordButtonList) {
            button.parentNode.removeChild(button);
        }

        for(let button of $newMasterKeyButtonList) {
            button.parentNode.removeChild(button);
        }
    }
    else {
        for(let button of $newPasswordButtonList) {
            button.addEventListener('click', newPW);
        }

        for(let button of $newMasterKeyButtonList) {
            button.addEventListener('click', newMasterPW);
        }

        $saveMasterKeyButton.addEventListener('click', saveMasterKey);
    }

    function decryptPage(evt) {
        evt.preventDefault();

        const password = $masterKeyInput.value;
        $masterKeyInput.value = '';

        let listPromise = downloadPromise
            .then(library => createCryptoManager(password, library))
            .then(newManager => {
                return cryptoManager = newManager;
            })
            .then(newManager => newManager.getPasswordList());

        Promise.all([downloadPromise, listPromise])
            .then(params => window.localStorage.setItem(localStorageKey, JSON.stringify(params[0])));

        listPromise
            .then(passwordList => getListManager(passwordList, $tableBody, createRenderer(offlineMode)))
            .then(newManager => {
                listManager = newManager;

                $authorizedSection.classList.remove('hidden');
                $unauthorizedSection.classList.add('hidden');
                $filterInput.focus();
            })
            .catch(error => window.alert('Something went wrong: ' + error.message));

        return false;
    }

    function resetIdleTime() {
        idleTime = 0;
    }

    // TODO: we can use racing promises for this!! That'd be totally rad, yo!
    function incrementIdleTime() {
        if (++idleTime > maxIdleTime) {
            logout();
        }
    }

    function checkKeyDown(evt) {
        resetIdleTime();

        if (isFilterShortCut(evt)) {
            evt.preventDefault();
            $filterInput.focus();
        }
        else if (isEscapeKey(evt)) {
            closeDialog();
        }
    }

    function closeDialog(event) {
        if (event && event.target != this) {
            return;
        }

        $editModal.classList.add('hidden');
        $masterKeyModal.classList.add('hidden');
    }

    function editDialog(domObject) {
        const isNew = typeof domObject == 'undefined';
        const passwordObject = isNew ? null : listManager.get(domObject);
        const index = isNew ? -1 : listManager.getIndex(domObject);

        $editModal.classList.remove('hidden');
        $editModal.setAttribute('data-index', index);
        $editModalHeader.innerHTML = isNew ? 'New password' : 'Edit password';
        $titleInput.value          = isNew ? '' : passwordObject.title;
        $urlInput.value            = isNew ? '' : passwordObject.url;
        $userNameInput.value       = isNew ? '' : passwordObject.username;
        $passwordInput.value       = isNew ? '' : passwordObject.password;
        $passwordRepeatInput.value = isNew ? '' : passwordObject.password;
        $commentInput.value        = isNew ? '' : passwordObject.comment;

        $titleInput.focus();
    }

    function saveChanges(evt) {
        evt.preventDefault();

        if ($passwordInput.value !== $passwordRepeatInput.value) {
            return window.alert('Passwords do not match!');
        }

        const index = parseInt($editModal.getAttribute('data-index'));
        let passwordObject = {
            title: $titleInput.value,
            url: $urlInput.value,
            username: $userNameInput.value,
            password: $passwordInput.value,
            comment: $commentInput.value
        };

        if (index === -1) {
            listManager.add(passwordObject);
            listManager.filter($filterInput.value);
        }
        else {
            let domObject = $tableBody.firstChild;
            for (let i = 0; i < index; i++) {
                domObject = domObject.nextSibling;
            }

            listManager.set(domObject, passwordObject, index);
        }

        sendUpdate().catch(e => window.alert('Failed updating library: ' + e.message));
        closeDialog();
    }

    function saveMasterKey(evt) {
        evt.preventDefault();

        if ( ! window.confirm('Are you sure you want to change the master key?')) {
            return closeDialog();
        }

        const newKey = $newMasterKeyInput.value;
        const newKeyRepeat = $newMasterKeyRepeatInput.value;

        if (newKey !== newKeyRepeat) {
            return window.alert('New keys do not match!');
        }

        sendUpdate(newKey)
            .then(closeDialog)
            .catch(e => window.alert('Failed updating password: ' + e.message));
    }

    function deletePassword(evt) {
        evt.preventDefault();

        if ( ! window.confirm("Are you totally sure you want to delete this password?")) {
            return;
        }

        listManager.remove(this);
        sendUpdate()
            .catch(e => window.alert('Failed deleting password: ' + e.message));
    }

    function toggleVisibility(evt) {
        let row = this.parentNode.parentNode;
        this.innerHTML = row.classList.contains('exposed') ? '<i class="icon-eye"></i>' : '<i class="icon-closed-eye"></i>';

        row.classList.toggle('exposed');
        evt.preventDefault();
    }

    function logout() {
        listManager = null;
        cryptoManager = null;

        $tableBody.innerHTML = '';
        $masterKeyInput.focus();
        $authorizedSection.classList.add('hidden');
        $unauthorizedSection.classList.remove('hidden');
        $userNameInput.value = '';
        $passwordInput.value = '';
        $passwordRepeatInput.value = '';
    }

    function sendUpdate(newKey) {
        let oldHashPromise = cryptoManager.getHash();
        let libraryPromise = cryptoManager.encryptPasswordList(listManager.getAll(), newKey);
        let newHashPromise = libraryPromise.then(cryptoManager.getHash);

        return Promise.all([oldHashPromise, libraryPromise, newHashPromise])
            .then(params => {
                let [oldHash, signedLib, newHash] = params;
                downloadPromise = downloadPromise.then(() => signedLib);
                window.localStorage.setItem(localStorageKey, JSON.stringify(signedLib));

                return postLibraryAsync(uploadUrl, signedLib, oldHash, newHash);
            });
    }

    function setRandomPassword(evt) {
        const newPassword = generateRandomPassword();

        $passwordInput.value = newPassword;
        $passwordRepeatInput.value = newPassword;

        evt.preventDefault();
    }

    function filterList() {
        listManager.filter(this.value);
    }

    function newPW(evt) {
        evt.preventDefault();
        editDialog();
    }

    function newMasterPW(evt) {
        evt.preventDefault();
        $masterKeyModal.classList.remove('hidden');
        $newMasterKeyInput.focus();
    }

    function addLinks(row, offlineMode) {
        let node = document.createElement('td');
        let link = document.createElement('a');
        link.href = '#';
        link.classList.add('toggleVisibility');
        link.innerHTML = '<i class="icon-eye"></i>';
        link.addEventListener('click', toggleVisibility);
        node.appendChild(link);

        if (! offlineMode) {
            link = document.createElement('a');
            link.href = '#';
            link.classList.add('editPassword');
            link.innerHTML = '<i class="icon-edit"></i>';
            link.addEventListener('click', () => editDialog(link));
            node.appendChild(link);

            link = document.createElement('a');
            link.href = '#';
            link.classList.add('deletePassword');
            link.innerHTML = '<i class="icon-trash"></i>';
            link.addEventListener('click', deletePassword);
            node.appendChild(link);
        }

        row.appendChild(node);
    }

    function createRenderer(isOffline) {
        return function(passwordObject) {
            let row = document.createElement('tr');
            addLinkCell(row, passwordObject.url, passwordObject.title);
            addObscuredCell(row, passwordObject.username);
            addObscuredCell(row, passwordObject.password);
            addComment(row, passwordObject.comment);
            addLinks(row, isOffline);

            return row;
        };
    }
};
