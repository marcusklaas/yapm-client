import { getSha1, verifyHmac, getHmacKey, getAesKey, encryptObject, getObjectHmac, decryptStringFromBase64 } from './crypto';
import { postAsync, getAsync } from './network';

const crypto = window.crypto || window.msCrypto;
const downloadUrl = 'encrypted/passwords.txt?noCache=' + Math.floor(Math.random() * 1e6);
const uploadUrl = 'libupdate.php';
const maxIdleTime = 20; // seconds
const alert = window.alert;
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

function PasswordEntry() {
    this.title = 'unnamed';
    this.url = 'https://marcusklaas.nl';
    this.username = 'anon';
    this.password = 'password';
    this.comment = '';
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

/* FIXME: this function looks fairly complex -- try to make it simpler when ur not as tired */
function doFilter(list, val) {
    let tableBody = document.getElementById('overview').lastChild;
    let row = tableBody.firstChild, nextRow;
    let len = list.length;
    val = val.toLowerCase();
    let tokens = val.split(' ');

    for(let i = 0, k = 0; i < len; i++, row = nextRow) {
        nextRow = row.nextSibling;

        for(let j = 0; j < tokens.length; j++) {
            if(-1 === list[k].title.toLowerCase().indexOf(tokens[j])
                && -1 === list[k].comment.toLowerCase().indexOf(tokens[j])) {
                row.classList.add('hidden');

                /* place row at bottom of list */
                tableBody.insertBefore(row, null);

                let tmp = list[k];
                list.splice(k, 1);
                list[len - 1] = tmp;
                break;
            }

            row.classList.remove('hidden');
            k++;
        }
    }
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

function decryptLibrary(key, library) {
    return decryptStringFromBase64(key, library.library_version, library.blob);
}

// TODO: rebuild offline mode
window.onload = function() {
    // Check that web crypto is even available
    if (!crypto || !crypto.subtle) {
        return alert("Your browser does not support the Web Cryptography API! This page will not work.");
    }

    if (!window.TextEncoder || !window.TextDecoder) {
        return alert("Your browser does not support the Encoding API! This page will not work.");
    }

    document.getElementById('decrypt').addEventListener('submit', function (evt) {
        evt.preventDefault();

        const password = document.getElementById('encryptionKey').value;
        document.getElementById('encryptionKey').value = '';

        decodeListAndShow(password);
    });

    let idleTime = 0;
    let passwordList = null;
    let passwordHash = null;
    let hmacKey = null;
    let aesKey = null;
    let libraryVersion = null;

    function decodeListAndShow(password) {
        getSha1(password).then(hash => {
            passwordHash = hash;
        });

        let hmacKeyPromise = getHmacKey(password);

        hmacKeyPromise.then(key => {
            hmacKey = key;
        });

        let aesKeyPromise = getAesKey(password);

        aesKeyPromise.then(key => {
            aesKey = key;
        });

        let libraryPromise = Promise.all([downloadPromise, hmacKeyPromise])
            .then(params => {
                let [library, key] = params;

                return verifyHmac(key, library.library, library.hmac).then(() => library.library);
            });

        libraryPromise.then(library => {
            libraryVersion = library.library_version;
        });

        Promise.all([downloadPromise, libraryPromise]).then(params =>
            window.localStorage.setItem('password-library', JSON.stringify(params[0]))
        );

        let passwordListPromise = Promise
            .all([aesKeyPromise, libraryPromise])
            .then(params => decryptLibrary(params[0], params[1]));

        passwordListPromise
            .then(passwords => {
                passwordList = passwords;

                displayList(passwords);

                document.getElementById('authorized').className = '';
                document.getElementById('unauthorized').className = 'hidden';
                document.getElementById('filter').focus();
            })
            .catch(error => alert('Something went wrong: ' + error.message));
    }

    document.getElementById('encryptionKey').focus();

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

        if (evt.ctrlKey && evt.keyCode === 69) {
            evt.preventDefault();
            document.getElementById('filter').focus();
        }
    }, false);

    document.onmousemove = resetIdleTime;
    document.addEventListener("touchstart", resetIdleTime, false);
    document.addEventListener("touchmove", resetIdleTime, false);
    document.addEventListener("touchend", resetIdleTime, false);

    function closeDialog(event) {
        if (event && event.target != this) {
            return;
        }

        document.getElementById('editModal').classList.add('hidden');
        document.getElementById('masterkeyModal').classList.add('hidden');
    }

    /* index -1 means new */
    function editDialog(index) {
        document.getElementById('editModal').classList.remove('hidden');
        document.getElementById('editModal').setAttribute('data-index', index);
        document.getElementById('modalHeader').innerHTML = (index === -1) ? 'New password' : 'Edit password';
        document.getElementById('title').value = (index === -1) ? '' : passwordList[index].title;
        document.getElementById('URL').value = (index === -1) ? '' : passwordList[index].url;
        document.getElementById('username').value = (index === -1) ? '' : passwordList[index].username;
        document.getElementById('pass').value = document.getElementById('passRepeat').value =
            (index === -1) ? '' : passwordList[index].password;
        document.getElementById('comment').value = (index === -1) ? '' : passwordList[index].comment;
    }

    document.getElementById('editModal').addEventListener('click', closeDialog);
    document.getElementById('masterkeyModal').addEventListener('click', closeDialog);
    document.getElementById('modalClose1').addEventListener('click', closeDialog);
    document.getElementById('modalClose2').addEventListener('click', closeDialog);

    document.getElementById('save').addEventListener('click', evt => {
        evt.preventDefault();

        let index = parseInt(document.getElementById('editModal').getAttribute('data-index'));
        let pwdEntry = new PasswordEntry;
        pwdEntry.title = document.getElementById('title').value;
        pwdEntry.url = document.getElementById('URL').value;
        pwdEntry.username = document.getElementById('username').value;
        pwdEntry.password = document.getElementById('pass').value;
        pwdEntry.comment = document.getElementById('comment').value;

        if (pwdEntry.password !== document.getElementById('passRepeat').value) {
            return alert('Passwords do not match!');
        }

        if (index === -1) {
            passwordList.push(pwdEntry);
            addRow(document.getElementById('overview').lastChild, pwdEntry);

            filterPasswords(document.getElementById('filter').value);
        }
        else {
            passwordList[index] = pwdEntry;

            let node = document.getElementById('overview').lastChild.firstChild;
            while (index--) {
                node = node.nextSibling;
            }

            node = node.firstChild;
            node.firstChild.innerHTML = pwdEntry.title;
            node.firstChild.href = pwdEntry.url;
            node = node.nextSibling;
            node.firstChild.innerHTML = pwdEntry.username;
            node = node.nextSibling;
            node.firstChild.innerHTML = pwdEntry.password;
            node.nextSibling.innerHTML = pwdEntry.comment;
        }

        sendUpdate().catch(e => alert('Failed updating library: ' + e.message));

        closeDialog();
    });

    function deletePassword(evt) {
        evt.preventDefault();

        if ( ! window.confirm("Are you totally sure you want to delete this password?")) {
            return;
        }

        let i = 0, row = this.parentNode.parentNode;

        for (let child = row; (child = child.previousSibling) != null; i++);

        passwordList.splice(i, 1);
        row.parentNode.removeChild(row);
        sendUpdate();
    }

    function toggleVisibility(evt) {
        let row = this.parentNode.parentNode;
        let currentVisibility = row.className == 'exposed';

        row.className = currentVisibility ? '' : 'exposed';
        this.innerHTML = currentVisibility ? '<i class="icon-eye"></i>' : '<i class="icon-eye-off"></i>';
        evt.preventDefault();
    }

    function editPassword() {
        let row = this.parentNode.parentNode;
        let i = 0;

        for (let child = row; (child = child.previousSibling) !== null; i++);

        editDialog(i);
    }

    function addLinks(row) {
        let node = document.createElement('td');
        let link = document.createElement('a');
        link.href = '#';
        link.className = 'toggleVisibility';
        link.innerHTML = '<i class="icon-eye"></i>';
        link.addEventListener('click', toggleVisibility);
        node.appendChild(link);

        if (! offlineMode) {
            link = document.createElement('a');
            link.href = '#';
            link.className = 'editPassword';
            link.innerHTML = '<i class="icon-edit"></i>';
            link.addEventListener('click', editPassword);
            node.appendChild(link);

            link = document.createElement('a');
            link.href = '#';
            link.className = 'deletePassword';
            link.innerHTML = '<i class="icon-trash"></i>';
            link.addEventListener('click', deletePassword);
            node.appendChild(link);
        }

        row.appendChild(node);
    }

    function addRow(tbody, pass) {
        let row = document.createElement('tr');
        addLinkCell(row, pass.url, pass.title);
        addObscuredCell(row, pass.username);
        addObscuredCell(row, pass.password);
        addComment(row, pass.comment);
        addLinks(row);
        tbody.appendChild(row);
    }

    function displayList(passwords) {
        let tableBody = document.getElementById('overview').lastChild;
        tableBody.innerHTML = '';

        for (let password of passwords) {
            addRow(tableBody, password);
        }
    }

    function logout() {
        passwordList = null;
        hmacKey = null;
        aesKey = null;
        passwordHash = null;

        document.getElementById('overview').lastChild.innerHTML = '';
        document.getElementById('encryptionKey').focus();
        document.getElementById('encryptionKey').value = '';
        document.getElementById('authorized').className = 'hidden';
        document.getElementById('unauthorized').className = '';
        document.getElementById('username').value = '';
        document.getElementById('pass').value = '';
        document.getElementById('passRepeat').value = '';
    }

    function sendUpdate(newHash) {
        libraryVersion += 1;

        let blobPromise = encryptObject(aesKey, passwordList, libraryVersion);
        let libraryPromise = blobPromise.then(blob => createLibrary(blob, libraryVersion, 2 /* api version */));
        let hmacPromise = libraryPromise.then(library => getObjectHmac(hmacKey, library));

        return Promise.all([libraryPromise, hmacPromise])
            .then(params => {
                const [library, hmac] = params;
                const signedLib = {
                    library: library,
                    hmac:hmac
                };

                downloadPromise = downloadPromise.then(() => signedLib);
                window.localStorage.setItem('password-library', JSON.stringify(signedLib));

                return postLibraryAsync(uploadUrl, signedLib, passwordHash, newHash);
            });
    }

    document.getElementById('randPass').addEventListener('click', evt => {
        let newPassword = randPass();

        document.getElementById('pass').value = newPassword;
        document.getElementById('passRepeat').value = newPassword;

        evt.preventDefault();
    });

    if (offlineMode) {
        let buttons = document.getElementsByClassName('newPassword');
        for (let i = 0; i < buttons.length; i++) {
            let button = buttons[i];
            button.parentNode.removeChild(button);
        }

        buttons = document.getElementsByClassName('newMasterKey');
        for (let i = 0; i < buttons.length; i++) {
            let button = buttons[i];
            button.parentNode.removeChild(button);
        }
    }
    else {
        function newPW(evt) {
            evt.preventDefault();
            editDialog(-1);
        }

        function newMasterPW() {
            document.getElementById('masterkeyModal').classList.remove('hidden');
        }

        let buttons = document.getElementsByClassName('newPassword');
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', newPW);
        }

        buttons = document.getElementsByClassName('newMasterKey');
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', newMasterPW);
        }

        document.getElementById('saveKey').addEventListener('click', evt => {
            evt.preventDefault();

            if ( ! window.confirm('Are you sure you want to change the master key?')) {
                return closeDialog();
            }

            const newKey = document.getElementById('key').value;
            const newKeyRepeat = document.getElementById('keyRepeat').value;

            if (newKey !== newKeyRepeat) {
                return alert('New keys do not match!');
            }

            let hmacKeyPromise = getHmacKey(newKey);
            let aesKeyPromise = getAesKey(newKey);
            let hashPromise = getSha1(newKey);

            let updatePromise = Promise.all([hmacKeyPromise, aesKeyPromise, hashPromise])
                .then(params => {
                    const [newHmacKey, newAesKey, newHash] = params;

                    hmacKey = newHmacKey;
                    aesKey = newAesKey;

                    return sendUpdate(newHash)
                });

            Promise.all([updatePromise, hashPromise])
                .then(params => {
                    passwordHash = params[1];
                });

            updatePromise
                .then(closeDialog)
                .catch(e => alert('Failed updating password: ' + e.message));
        });
    }

    function filterPasswords(val) {
        doFilter(passwordList, val);
    }

    document.getElementById('filter').addEventListener('keyup', function(evt) {
        filterPasswords(this.value);
    });
};
