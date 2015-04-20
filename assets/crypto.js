const crypto = window.crypto || window.msCrypto;

// TODO: add crypto/ textDecoder checks

export function createCryptoManager(password, library) {
    let hmacKeyPromise = getHmacKey(password);
    let aesKeyPromise = getAesKey(password);
    let hashPromise = getSha1(password);

    let libraryPromise = hmacKeyPromise
        .then(key => verifyHmac(key, library.library, library.hmac).then(() => library.library));

    let libraryVersionPromise = libraryPromise.then(library => library.library_version);

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
        encryptPasswordList: function(passwordList, newKey) {
            libraryVersionPromise = libraryVersionPromise.then(libraryVersion => libraryVersion + 1);

            if (newKey) {
                hmacKeyPromise = getHmacKey(newKey);
                aesKeyPromise = getAesKey(newKey);
                hashPromise = getSha1(newKey);
            }

            let blobPromise = Promise.all([aesKeyPromise, libraryVersionPromise])
                .then(params => encryptObject(params[0], passwordList, params[1]));

            libraryPromise = Promise.all([blobPromise, libraryVersionPromise])
                .then(params => createLibrary(params[0], params[1], 2 /* api version */));

            let hmacPromise = Promise.all([hmacKeyPromise, libraryPromise])
                .then(params => getObjectHmac(params[0], params[1]));

            return Promise.all([libraryPromise, hmacPromise])
                .then(params => {
                    return {
                        library: params[0],
                        hmac: params[1]
                    };
                });
        },
        getHash: function() {
            return hashPromise;
        }
    };
}

export function generateRandomPassword(length, alphabet) {
    let result = '';
    let passwordLength = length || 16;
    let actualAlphabet = alphabet || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?:;[]~!@#$%^&*()-+/';
    let alphabetLength = actualAlphabet.length;

    for (let i = 0; i < passwordLength; i++) {
        let index = Math.floor(Math.random() * alphabetLength);
        result += actualAlphabet[index];
    }

    return result;
}

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
    let encoder = new window.TextEncoder("utf-8");

    return encoder.encode(string);
}

function arrayBufferToString(array) {
    let decoder = new window.TextDecoder("utf-8");

    return decoder.decode(array);
}

function bufferViewToArray(buffer) {
    const array = new Uint8Array(buffer);
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

function decryptStringFromBase64(key, version, blob) {
    const cryptoText = atob(blob);
    const rawCryptoBytes = cryptoText.split(',').map(function (int) { return parseInt(int); }); // FIXME: this could probably be done more efficiently
    const byteArray = new Uint8Array(rawCryptoBytes);

    return crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: encodeIvFromNumber(version)
        },
        key,
        byteArray
    )
    .then(plainText => JSON.parse(arrayBufferToString(plainText)));
}

/**
 * @param password string
 * @returns Promise
 */
function getSha1(password) {
    return crypto.subtle.digest(
        {
            name: "SHA-1"
        },
        stringToArrayBuffer(password)
    )
        .then(uintArray => arrayBufferToHexString(uintArray));
}

/**
 * @param password string
 * @returns Promise
 */
function getAesKey(password) {
    return crypto.subtle.importKey(
        "raw",
        stringToArrayBuffer(password),
        {
            "name": "PBKDF2"
        },
        false,
        ["deriveKey"]
    )
    .then(baseKey =>
        crypto.subtle.deriveKey(
            {
                "name": "PBKDF2",
                "salt": new Uint8Array(16),
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
        )
    );
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
    .then(result => bufferViewToBase64(result));
}

/**
 * @param password string
 * @returns Promise
 */
function getHmacKey(password) {
    return crypto.subtle.importKey(
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
    return crypto.subtle.sign(
        {
            name: "HMAC"
        },
        key,
        stringToArrayBuffer(JSON.stringify(obj))
    )
    .then(signature => bufferViewToBase64(signature));
}

/**
 * @param key  HmacKey
 * @param obj  obj
 * @param hmac string (base64 encoding)
 * @returns Promise
 */
function verifyHmac(key, obj, hmac) {
    return crypto.subtle.verify(
        {
            name: "HMAC"
        },
        key,
        stringToArrayBuffer(atob(hmac)),
        stringToArrayBuffer(JSON.stringify(obj))
    );
}
