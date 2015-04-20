import { getSha1, verifyHmac, getHmacKey, getAesKey, encryptObject, getObjectHmac, decryptStringFromBase64 } from './crypto';
import { postAsync, getAsync } from './network';

const crypto = window.crypto || window.msCrypto;
const downloadUrl = 'encrypted/passwords.txt?noCache=' + Math.floor(Math.random() * 1e6);
const uploadUrl = 'libupdate.php';
const maxIdleTime = 20; // seconds
var offlineMode = false;

// start download as early as possible
let downloadPromise = getAsync(downloadUrl)
    .catch(() => new Promise((resolve, reject) => {
        const cachedLibrary = window.localStorage.getItem('password-library');

        if ( ! cachedLibrary) {
            return reject(new Error('Couldn\'t download library and there was no cached version'));
        }

        offlineMode = true;
        resolve(cachedLibrary);
    }))
    .then(raw => JSON.parse(raw));

// TODO: this should probably be moved to its own module
function createCryptoManager(password, library) {
    let hmacKeyPromise = getHmacKey(password);
    let aesKeyPromise = getAesKey(password);
    let hashPromise = getSha1(password);

    let libraryPromise = hmacKeyPromise
        .then(key => verifyHmac(key, library.library, library.hmac).then(() => library.library));

    let libraryVersionPromise = libraryPromise.then(library => library.library_version);

    // TODO: move this out of here
    libraryPromise.then(params => window.localStorage.setItem('password-library', JSON.stringify(params[0])));

    return {
        // FIXME: should this be here? It should only be called once. the list manager should supply the password list
        getPasswordList: function() {
            return Promise
                .all([aesKeyPromise, libraryPromise])
                .then(params => {
                    let [key, library] = params;

                    return decryptStringFromBase64(key, library.library_version, library.blob);
                });
        },
        encryptPasswordList: function(passwordList, newPassword) {
            libraryVersionPromise = libraryVersionPromise.then(libraryVersion => libraryVersion + 1);

            if (newPassword) {
                // TODO: do some stuff, set new aeskey and such
            }

            let blobPromise = libraryVersionPromise.then(libraryVersion => encryptObject(aesKey, passwordList, libraryVersion));

            libraryPromise = Promise.all([blobPromise, libraryVersionPromise])
                .then(params => createLibrary(params[0], params[1], 2 /* api version */));

            let hmacPromise = libraryPromise.then(library => getObjectHmac(hmacKey, library));

            return Promise.all([libraryPromise, hmacPromise])
                .then(params => {
                    return {
                        library: params[0],
                        hmac: params[1]
                    };
                });
        }
    };
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

// TODO: this should probably be moved to its own module
// TODO: add hider/ unhider method?
function getListManager(passwordList, tbody, passwordRenderer) {
    function getIndex(row) {
        let index = 0;

        for (let child = row; child.previousSibling; child = child.previousSibling) {
            index += 1;
        }

        return index;
    }

    function getRow(domObject) {
        while (domObject.parentNode != tbody) {
            domObject = domObject.parentNode;
        }

        return domObject;
    }

    let manager = {
        add: function (passwordObject) {
            let domObject = passwordRenderer(passwordObject);

            tbody.appendChild(domObject);
        },
        get: function(domObject) {
            let index = getIndex(domObject);

            return passwordList[index];
        },
        set: function(domObject, passwordObject) {
            // TODO: implement
        },
        remove: function(domObject) {

        },
        getIndex: getIndex,
        // TODO: try to revise this function in a more functional style
        filter: function(val) {
            let row = tbody.firstChild, nextRow;
            let len = passwordList.length;
            let tokens = val.toLowerCase().split(' ');

            for(let i = 0, k = 0; i < len; i++, row = nextRow) {
                nextRow = row.nextSibling;

                for(let j = 0; j < tokens.length; j++) {
                    if(-1 === passwordList[k].title.toLowerCase().indexOf(tokens[j])
                        && -1 === passwordList[k].comment.toLowerCase().indexOf(tokens[j])) {
                        row.classList.add('hidden');

                        /* place row at bottom of list */
                        tbody.insertBefore(row, null);

                        let tmp = passwordList[k];
                        passwordList.splice(k, 1);
                        passwordList[len - 1] = tmp;
                        break;
                    }

                    row.classList.remove('hidden');
                    k++;
                }
            }
        }
    };

    tbody.innerHTML = '';

    for (let password of passwordList) {
        manager.add(password);
    }

    return manager;
}

function randPass(len, alphabet) {
    let result = '';

    if (!alphabet) {
        alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        + '.,?:;[]~!@#$%^&*()-+/';
    }

    let alphabetLength = alphabet.length;

    if ((len === undefined) || isNaN(len) || len < 6) {
        len = 12;
    }

    for (let i = 0; i < len; i++) {
        let rnd = Math.floor(Math.random() * alphabetLength);
        result += alphabet.substring(rnd, rnd + 1);
    }

    return result;
}

// TODO: maybe it's easier to just use raw html?
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
        link.addEventListener('click', function() {
            editDialog(this);
        });
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
    span.className = 'obscured';
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
    table.className = 'comment';
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
    let params = 'pwhash=' + hash + '&newlib=' + encodeURIComponent(JSON.stringify(library));

    if (newHash) {
        params += `&newhash=${newHash}`;
    }

    return postAsync(url, params);
}

/**
 * @param blob           string
 * @param libraryVersion int
 * @param apiVersion     int
 * @returns object
 */
function createLibrary(blob, libraryVersion, apiVersion) {
    return {
        blob: blob,
        library_version: libraryVersion,
        api_version: apiVersion,
        modified: Math.round(new Date().getTime() / 1000)
    };
}

function isFilterShortCut(event) {
    return event.ctrlKey && event.keyCode === 69;
}

// TODO: rebuild offline mode
window.onload = function() {
    // Check that web crypto is even available
    if (!crypto || !crypto.subtle) {
        return window.alert("Your browser does not support the Web Cryptography API! This page will not work.");
    }

    if (!window.TextEncoder || !window.TextDecoder) {
        return window.alert("Your browser does not support the Encoding API! This page will not work.");
    }

    let listManager = null;
    let cryptoManager = null;
    let idleTime = 0;

    /* central definition of dom objects */
    var $masterKeyInput = document.getElementById('encryptionKey');
    var $filterInput = document.getElementById('filter');
    var $titleInput = document.getElementById('title');
    var $urlInput = document.getElementById('URL');
    var $userNameInput = document.getElementById('username');
    var $passwordInput = document.getElementById('pass');
    var $passwordRepeatInput = document.getElementById('passRepeat');
    var $commentInput = document.getElementById('comment');
    var $newMasterKeyInput = document.getElementById('key');
    var $newMasterKeyRepeatInput = document.getElementById('keyRepeat');

    var $randomPasswordButton = document.getElementById('randPass');
    var $decryptButton = document.getElementById('decrypt');
    var $saveButton = document.getElementById('save');
    var $saveMasterKeyButton = document.getElementById('saveKey');
    var $modalCloseButtonOne = document.getElementById('modalClose1');
    var $modalCloseButtonTwo = document.getElementById('modalClose2');
    var $newPasswordButtonList = document.getElementsByClassName('newPassword');
    var $newMasterKeyButtonList = document.getElementsByClassName('newMasterKey');

    var $tableBody = document.getElementById('overview').lastChild;
    var $editModal = document.getElementById('editModal');
    var $editModalHeader = document.getElementById('modalHeader');
    var $masterKeyModal = document.getElementById('masterkeyModal');
    var $authorizedSection = document.getElementById('authorized');
    var $unauthorizedSection = document.getElementById('unauthorized');

    $decryptButton.addEventListener('submit', function (evt) {
        evt.preventDefault();

        const password = $masterKeyInput.value;
        $masterKeyInput.value = '';

        downloadPromise.then(library => createCryptoManager(password, library))
            .then(newManager => {
                return cryptoManager = newManager;
            })
            .then(newManager => newManager.getPasswordList())
            .then(passwordList => getListManager(passwordList, createRenderer(offlineMode)))
            .then(newManager => {
                listManager = newManager;

                $authorizedSection.classList.remove('hidden');
                $unauthorizedSection.classList.add('hidden');
                $filterInput.focus();
            })
            .catch(error => window.alert('Something went wrong: ' + error.message));
    });

    $masterKeyInput.focus();

    function resetIdleTime() {
        idleTime = 0;
    }

    // TODO: we can use racing promises for this!! That'd be totally rad, yo!
    function incrementIdleTime() {
        if (++idleTime > maxIdleTime) {
            logout();
        }
    }

    setInterval(incrementIdleTime, 1000);

    /* filter shortcut: ctrl+e */
    document.addEventListener('keydown', function (evt) {
        resetIdleTime();

        if (isFilterShortCut(evt)) {
            evt.preventDefault();
            $filterInput.focus();
        }
    }, false);

    document.onmousemove = resetIdleTime;
    document.addEventListener('touchstart', resetIdleTime, false);
    document.addEventListener('touchmove', resetIdleTime, false);
    document.addEventListener('touchend', resetIdleTime, false);

    function closeDialog(event) {
        if (event && event.target != this) {
            return;
        }

        $editModal.classList.add('hidden');
        $masterKeyModal.classList.add('hidden');
    }

    /* undefined domObject means a new password */
    function editDialog(domObject) {
        let password = listManager.get(domObject);
        let index = domObject ? listManager.getIndex(domObject) : -1;

        $editModal.classList.remove('hidden');
        $editModal.setAttribute('data-index', index);
        $editModalHeader.innerHTML = domObject ? 'New password' : 'Edit password';
        $titleInput.value          = domObject ? '' : password.title;
        $urlInput.value            = domObject ? '' : password.url;
        $userNameInput.value       = domObject ? '' : password.username;
        $passwordInput.value       = domObject ? '' : password.password;
        $passwordRepeatInput.value = domObject ? '' : password.password;
        $commentInput.value        = domObject ? '' : password.comment;
    }

    $editModal.addEventListener('click', closeDialog);
    $masterKeyModal.addEventListener('click', closeDialog);
    $modalCloseButtonOne.addEventListener('click', closeDialog);
    $modalCloseButtonTwo.addEventListener('click', closeDialog);

    $saveButton.addEventListener('click', evt => {
        evt.preventDefault();

        if ($passwordInput.value !== $passwordRepeatInput.value) {
            return window.alert('Passwords do not match!');
        }

        let index = parseInt($editModal.getAttribute('data-index'));
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
            while (index--) {
                domObject = domObject.nextSibling;
            }

            listManager.set(domObject, passwordObject);
        }

        sendUpdate().catch(e => window.alert('Failed updating library: ' + e.message));

        closeDialog();
    });

    function deletePassword(evt) {
        evt.preventDefault();

        if ( ! window.confirm("Are you totally sure you want to delete this password?")) {
            return;
        }

        listManager.remove(this);
        sendUpdate();
    }

    function toggleVisibility(evt) {
        let row = this.parentNode.parentNode;
        this.innerHTML = row.classList.contains('exposed') ? '<i class="icon-eye-off"></i>' : '<i class="icon-eye"></i>';

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

    function sendUpdate(newHash) {
        let passwordListPromise = listManager.getPasswordList();
        let libraryPromise = passwordListPromise.then(passwordList => cryptoManager.encryptPasswordList(passwordList));

        return libraryPromise.then(signedLib => {
            downloadPromise = downloadPromise.then(() => signedLib);
            window.localStorage.setItem('password-library', JSON.stringify(signedLib));

            return postLibraryAsync(
                uploadUrl,
                signedLib,
                passwordHash, // FIXME: woops -- this is trouble! cryptoManager should have encrypt-with-new-key method, and a get-hash method
                newHash
            );
        });
    }

    $randomPasswordButton.addEventListener('click', evt => {
        let newPassword = randPass();

        $passwordInput.value = newPassword;
        $passwordRepeatInput.value = newPassword;

        evt.preventDefault();
    });

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
        function newPW(evt) {
            evt.preventDefault();
            editDialog();
        }

        function newMasterPW() {
            evt.preventDefault();
            $masterKeyModal.classList.remove('hidden');
        }

        for(let button of $newPasswordButtonList) {
            button.addEventListener('click', newPW);
        }

        for(let button of $newMasterKeyButtonList) {
            button.addEventListener('click', newMasterPW);
        }

        $saveMasterKeyButton.addEventListener('click', evt => {
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
        });
    }

    $filterInput.addEventListener('keyup', function(evt) {
        listManager.filter(this.value);
    });
};
