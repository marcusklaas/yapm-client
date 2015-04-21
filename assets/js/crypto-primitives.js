const crypto = window.crypto || window.msCrypto;

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
    .then(arrayBufferToHexString);
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

// encode num in little endian format
export function encodeIvFromNumber(num) {
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

/**
 * @param key     AesKey
 * @param version int
 * @param blob    string (base64)
 * @returns Uint8Array
 */
export function decryptFromBase64(key, version, blob) {
    const cryptoText = atob(blob);
    const rawCryptoBytes = cryptoText.split(',').map(function (int) { return parseInt(int); }); // FIXME: this could probably be done more efficiently -- and move to different function!
    const byteArray = new Uint8Array(rawCryptoBytes);

    return crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: encodeIvFromNumber(version)
        },
        key,
        byteArray
    )
    .then(buffer => new Uint8Array(buffer));
}

/**
 * @param key     KeyObject
 * @param  arr    Uint8Array
 * @param version int
 * @returns Promise
 */
export function encryptUint8Array(key, arr, version) {
    return crypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv: encodeIvFromNumber(version)
        },
        key,
        arr
    )
    .then(bufferViewToBase64);
}

/**
 * @param key HmacKey
 * @param str string
 * @returns Promise containing string (base64 encoding)
 */
export function getHmac(key, str) {
    return crypto.subtle.sign(
        {
            name: "HMAC"
        },
        key,
        stringToArrayBuffer(str)
    )
    .then(bufferViewToBase64);
}

/**
 * @param key  HmacKey
 * @param str  string
 * @param hmac string (base64 encoding)
 * @returns Promise
 */
export function verifyHmac(key, str, hmac) {
    return crypto.subtle.verify(
        {
            name: "HMAC"
        },
        key,
        stringToArrayBuffer(atob(hmac)),
        stringToArrayBuffer(str)
    );
}
