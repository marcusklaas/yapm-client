const crypto = window.crypto || window.msCrypto;

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

export function decryptStringFromBase64(key, version, blob) {
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
export function getSha1(password) {
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
export function getAesKey(password) {
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
export function encryptObject(key, obj, version) {
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
export function getHmacKey(password) {
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
export function getObjectHmac(key, obj) {
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
export function verifyHmac(key, obj, hmac) {
    const decodedHmac = atob(hmac);

    return crypto.subtle.verify(
        {
            name: "HMAC"
        },
        key,
        stringToArrayBuffer(decodedHmac),
        stringToArrayBuffer(JSON.stringify(obj))
    );
}
