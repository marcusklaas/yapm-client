// FIXME: use crypto everywhere instead of window.crypto -- or are these equivalent to each other?
crypto = window.crypto || window.msCrypto;
downloadUrl = 'encrypted/passwords.txt?noCache=' + Math.floor(Math.random() * 1e6);
maxIdleTime = 20; // seconds

// encode num in little endian format
function encodeIvFromNumber(num) {
    // iv is 16 bytes long
    let iv = new Uint8Array(16);

    // support num up to 8 bytes long
    for(let i = 0; i < 8; i++) {
        iv[i] = num & 255;

        num = num >>> 8;
    }

    return iv;
}

function stringToArrayBuffer(string) {
    let encoder = new TextEncoder("utf-8");

    return encoder.encode(string);
}

function arrayBufferToString(array) {
    let decoder = new TextDecoder("utf-8");

    return decoder.decode(array);
}

function bufferViewToArray(buffer) {
    let array = new Uint8Array(buffer);
    let list = [];

    for(let i = 0; i < array.length; i++) {
        list[i] = array[i];
    }

    return list;
}

function bufferViewToBase64(buffer) {
    let list = bufferViewToArray(buffer);

    return btoa(list);
}

function arrayBufferToHexString(arrayBuffer) {
    let byteArray = new Uint8Array(arrayBuffer);
    let hexString = "";
    let nextHexByte;

    for (let i = 0; i < byteArray.byteLength; i++) {
        nextHexByte = byteArray[i].toString(16);
        if (nextHexByte.length < 2) {
            nextHexByte = "0" + nextHexByte;
        }
        hexString += nextHexByte;
    }

    return hexString;
}

function getAsync(url) {
    // Return a new promise.
    return new Promise(function(resolve, reject) {
        let req = new XMLHttpRequest();
        req.open('GET', url);

        req.onload = function() {
            if (req.status == 200) {
                resolve(req.response);
            }
            else {
                reject(Error(req.statusText));
            }
        };

        req.onerror = function() {
            reject(Error("Network Error"));
        };

        req.send();
    });
}

function passwordEntry() {
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

/**
 * @param password string
 * @returns Promise
 */
function getSha1(password) {
    return window.crypto.subtle.digest(
        {
            name: "SHA-1"
        },
        stringToArrayBuffer(password)
    )
    .then(function(uintArray) {
        return Promise.resolve(arrayBufferToHexString(uintArray));
    });
}

/**
 * @param password string
 * @param version  int
 * @returns Promise
 */
function getAesKey(password, version) {
    return window.crypto.subtle.importKey(
        "raw",
        stringToArrayBuffer(password),
        {
            "name": "PBKDF2"
        },
        false,
        ["deriveKey"]
    )
    .then(function (baseKey) {
        return window.crypto.subtle.deriveKey(
            {
                "name": "PBKDF2",
                "salt": encodeIvFromNumber(version),
                "iterations": 4096,
                "hash": {
                    name: "SHA-1"
                }
            },
            baseKey,
            {
                "name": "AES-CBC",
                "length": 256
            },
            false,
            ["encrypt", "decrypt"]
        );
    });
}

/**
 * @param key     KeyObject
 * @param obj     object
 * @param version int
 * @returns Promise
 */
function encryptObject(key, obj, version) {
    return crypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv: encodeIvFromNumber(version)
        },
        key,
        stringToArrayBuffer(JSON.stringify(obj))
    )
    .then(function(result) {
        let base64 = bufferViewToBase64(result);

        return Promise.resolve(base64);
    });
}

/**
 * @param blob           string
 * @param libraryVersion int
 * @param apiVersion     int
 * @returns object
 */
function createLibrary(blob, libraryVersion, apiVersion) {
    return {
        blob: JSON.stringify(blob),
        library_version: libraryVersion,
        api_version: apiVersion,
        modified: 0 // TODO: seconds since epoch
    };
}

/**
 * @param password string
 * @returns Promise
 */
function getHmacKey(password) {
    return window.crypto.subtle.importKey(
        "raw",
        stringToArrayBuffer(password),
        {
            name: "HMAC",
            hash: {
                name: "SHA-256"
            }
        },
        false,
        ["sign", "verify"]
    );
}

/**
 * @param key HmacKey
 * @param obj object
 * @returns Promise containing string (base64 encoding)
 */
function getObjectHmac(key, obj) {
    return window.crypto.subtle.sign(
        {
            name: "HMAC"
        },
        key,
        stringToArrayBuffer(libText)
    )
    .then(function (signature) {
        let sig = bufferViewToBase64(signature);

        return Promise.resolve(sig);
    });
}

/**
 * @param key  HmacKey
 * @param json string
 * @param hmac string (base64 encoding)
 * @returns Promise
 */
function verifyHmac(key, json, hmac) {
    let decodedHmac = atob(hmac);

    return window.crypto.subtle.verify(
        {
            name: "HMAC"
        },
        key,
        stringToArrayBuffer(decodedHmac),
        stringToArrayBuffer(json)
    );
}

function decryptLibrary(key, library) {
    let blob = library.blob;

    let cryptoText = atob(blob);
    let rawCryptoBytes = cryptoText.split(',').map(function (int) { return parseInt(int); }); // FIXME: this could probably be done more efficiently
    let byteArray = new Uint8Array(rawCryptoBytes);

    return crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: encodeIvFromNumber(library.library_version)
        },
        key,
        byteArray
    )
    .then(function (plainText) {
        let obj = JSON.parse(arrayBufferToString(plainText));

        return Promise.resolve(obj);
    });
}

// TODO: rebuild offline mode
window.onload = function() {
    // Check that web crypto is even available
    if (!window.crypto || !window.crypto.subtle) {
        alert("Your browser does not support the Web Cryptography API! This page will not work.");
    }

    if (!window.TextEncoder || !window.TextDecoder) {
        alert("Your browser does not support the Encoding API! This page will not work.");
    }

    let idleTime = 0;

    let passwordListPromise = (function (url) {
        let libraryPromise = getAsync(url)
            .then(function (clearText) {
                return Promise.resolve(JSON.parse(clearText));
            });

        let passwordPromise = new Promise(function (resolve, reject) {
            document.getElementById('decrypt').addEventListener('submit', function (evt) {
                evt.preventDefault();

                let password = document.getElementById('encryptionKey').value;

                document.getElementById('encryptionKey').value = '';

                resolve(password);
            });
        });

        let aesKeyPromise = Promise
            .all([passwordPromise, libraryPromise])
            .then(function (params) {
                let [password, library] = params;

                return getAesKey(password, library.library_version);
            });

        return Promise
            .all([aesKeyPromise, libraryPromise])
            .then(function (params) {
                let [key, library] = params;

                return decryptLibrary(key, library);
            });
    })(downloadUrl);

    passwordListPromise
        .then(function (passwordList) {
            displayList(passwordList);

            document.getElementById('authorized').className = '';
            document.getElementById('unauthorized').className = 'hidden';
            document.getElementById('filter').focus();
        })
        .catch(function (error) {
            alert('Something went wrong: ' + error.message);
        });

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
        document.getElementById('title').value = (index === -1) ? '' : list[index].title;
        document.getElementById('URL').value = (index === -1) ? '' : list[index].url;
        document.getElementById('username').value = (index === -1) ? '' : list[index].username;
        document.getElementById('pass').value = document.getElementById('passRepeat').value =
            (index === -1) ? '' : list[index].password;
        document.getElementById('comment').value = (index === -1) ? '' : list[index].comment;
    }

    document.getElementById('editModal').addEventListener('click', closeDialog);
    document.getElementById('masterkeyModal').addEventListener('click', closeDialog);
    document.getElementById('modalClose1').addEventListener('click', closeDialog);
    document.getElementById('modalClose2').addEventListener('click', closeDialog);

    document.getElementById('save').addEventListener('click', function (evt) {
        evt.preventDefault();

        let index = parseInt(document.getElementById('editModal').getAttribute('data-index'));
        let pwdEntry = new passwordEntry;
        pwdEntry.title = document.getElementById('title').value;
        pwdEntry.url = document.getElementById('URL').value;
        pwdEntry.username = document.getElementById('username').value;
        pwdEntry.password = document.getElementById('pass').value;
        pwdEntry.comment = document.getElementById('comment').value;

        if (pwdEntry.password !== document.getElementById('passRepeat').value) {
            alert('Passwords do not match!');
            return;
        }

        if (index === -1) {
            list.push(pwdEntry);
            addRow(document.getElementById('overview').lastChild, pwdEntry);

            filterPasswords(document.getElementById('filter').value);
        }
        else {
            list[index] = pwdEntry;

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

        sendUpdate();
        closeDialog();
    });

    function deletePassword(evt) {
        evt.preventDefault();

        if (!confirm("Are you totally sure you want to delete this password?"))
            return;

        let i = 0, row = this.parentNode.parentNode;

        for (child = row; (child = child.previousSibling) != null; i++);

        list.splice(i, 1);
        row.parentNode.removeChild(row);
        sendUpdate();
    }

    function toggleVisibility(evt) {
        let row = this.parentNode.parentNode;
        let currentVisibility = row.className == 'exposed';

        row.className = currentVisibility ? '' : 'exposed';
        this.innerHTML = currentVisibility ? '<i class="icon-eye-open"></i>' : '<i class="icon-eye-close"></i>';
        evt.preventDefault();
    }

    function editPassword(evt) {
        let row = this.parentNode.parentNode;
        let i = 0;

        for (child = row; (child = child.previousSibling) !== null; i++);

        editDialog(i);
    }

    function addLinks(row) {
        let node = document.createElement('td');
        let link = document.createElement('a');
        link.href = '#';
        link.className = 'toggleVisibility';
        link.innerHTML = '<i class="icon-eye-open"></i>';
        link.addEventListener('click', toggleVisibility);
        node.appendChild(link);

        if (true /* false === offlineMode */) {
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

    function displayList(list) {
        let tableBody = document.getElementById('overview').lastChild;

        for (let i = 0; i < list.length; i++) {
            addRow(tableBody, list[i]);
        }
    }

    function logout() {
        passwordListPromise = null;

        document.getElementById('overview').lastChild.innerHTML = '';
        document.getElementById('encryptionKey').focus();
        document.getElementById('encryptionKey').value = '';
        document.getElementById('authorized').className = 'hidden';
        document.getElementById('unauthorized').className = '';
        document.getElementById('username').value = '';
        document.getElementById('pass').value = '';
        document.getElementById('passRepeat').value = '';
    }

    function sendUpdate() {
        let request = new XMLHttpRequest();

        request.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                if (this.responseText !== 'success')
                    alert('lib update failed ' + this.responseText);
            }
        };

        dec = {'modified': Math.round(new Date().getTime() / 1000), 'list': list};

        // TODO: moar stuff, of course
    }

    document.getElementById('randPass').addEventListener('click', function (evt) {
        let newPassword = randPass();

        document.getElementById('pass').value = newPassword;
        document.getElementById('passRepeat').value = newPassword;

        evt.preventDefault();
    });


    if (false /* offline mode */) {
        let buttons = document.getElementsByClassName('newPassword');
        for (let i = 0; i < buttons.length; i++)
            buttons[i].parentNode.removeChild(button);

        buttons = document.getElementsByClassName('newMasterKey');
        for (let i = 0; i < buttons.length; i++)
            buttons[i].parentNode.removeChild(button);
    }
    else {
        function newPW(evt) {
            evt.preventDefault();
            editDialog(-1);
        }

        function newMasterPW(evt) {
            document.getElementById('masterkeyModal').classList.remove('hidden');
        }

        let buttons = document.getElementsByClassName('newPassword');
        for (let i = 0; i < buttons.length; i++)
            buttons[i].addEventListener('click', newPW);

        buttons = document.getElementsByClassName('newMasterKey');
        for (let i = 0; i < buttons.length; i++)
            buttons[i].addEventListener('click', newMasterPW);

        document.getElementById('saveKey').addEventListener('click', function (evt) {
            evt.preventDefault();

            if (true !== confirm('Are you sure you want to change the master key?')) {
                closeDialog();
                return;
            }

            let newKey = document.getElementById('key').value;
            let newKeyRepeat = document.getElementById('keyRepeat').value;

            if (newKey !== newKeyRepeat) {
                alert('New keys do not match!');
                return;
            }

            /* send new passHash to server */
            let request = new XMLHttpRequest();

            request.onreadystatechange = function () {
                if (this.readyState === 4 && this.status === 200) {
                    if (this.responseText !== 'success') {
                        alert('key change failed ' + this.responseText);
                    }
                    else {
                        password = newKey;
                        passHash = SHA1(password);
                        sendUpdate();
                        closeDialog();
                    }
                }
            };

            let params = 'pwhash=' + passHash + '&newhash=' + SHA1(newKey);

            request.open('POST', 'libupdate.php', false);
            request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            request.send(params);
        });
    }

    function filterPasswords(val) {
        passwordListPromise.then(function (list) {
            doFilter(list, val);
        });
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
				let tmp;

				if(-1 === list[k].title.toLowerCase().indexOf(tokens[j])
				 && -1 === list[k].comment.toLowerCase().indexOf(tokens[j])) {
					row.classList.add('hidden');

					/* place row at bottom of list */
					tableBody.insertBefore(row, null);
					tmp = list[k];
					list.splice(k, 1);
					list[len - 1] = tmp;
					break;
				}

				row.classList.remove('hidden');
				k++;
			}
		}
	}

	document.getElementById('filter').addEventListener('keyup', function(evt) {
		filterPasswords(this.value);
	});
}
