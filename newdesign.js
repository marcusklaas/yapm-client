"use strict";

var passwordList = [
    {
        title: 'test123',
        url: 'test.com',
        username: 'marcus',
        password: 'klaas',
        comment: 'test case'
    }
];

var library = {
    api_version: 2,
    library_version: 2,
    modified: 1, // seconds since epoch
    blob: null
};

var password = "changeme";

// Check that web crypto is even available
if (!window.crypto || !window.crypto.subtle) {
    alert("Your browser does not support the Web Cryptography API! This page will not work.");
}

if (!window.TextEncoder || !window.TextDecoder) {
    alert("Your browser does not support the Encoding API! This page will not work.");
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

var shaPromise =
    window.crypto.subtle.digest(
        {
            name: "SHA-1"
        },
        stringToArrayBuffer(password)
    )
    .then(function(uintArray) {
        return Promise.resolve(arrayBufferToHexString(uintArray));
    });

// First, create a PBKDF2 "key" containing the password
var cryptoKeyPromise =
    window.crypto.subtle.importKey(
        "raw",
        stringToArrayBuffer(password),
        {"name": "PBKDF2"},
        false,
        ["deriveKey"]
    )
    .then(function (baseKey) {
        return window.crypto.subtle.deriveKey(
            {
                "name": "PBKDF2",
                "salt": encodeIvFromNumber(library.library_version),
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

// Encode our password list using previously derived key
var blobPromise =
    cryptoKeyPromise.then(function (key) {
        return crypto.subtle.encrypt(
            {
                name: "AES-CBC",
                iv: encodeIvFromNumber(library.library_version)
            },
            key,
            stringToArrayBuffer(JSON.stringify(passwordList))
        );
    })
    .then(function(result) {
        var base64 = bufferViewToBase64(result);

        return Promise.resolve(base64);
    });

var libraryPromise =
    blobPromise.then(function (blob) {
        var lib = JSON.parse(JSON.stringify(library)); //clone
        lib.blob = blob;

        var libText = JSON.stringify(lib);

        return Promise.resolve(libText);
    });

var hmacKeyPromise =
    window.crypto.subtle.importKey(
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

var hmacPromise =
    Promise
        .all([libraryPromise, hmacKeyPromise])
        .then(function (params) {
            let [libText, key] = params;

            return window.crypto.subtle.sign(
                {
                    name: "HMAC"
                },
                key,
                stringToArrayBuffer(libText)
            );
        })
        .then(function (signature) {
            var sig = bufferViewToBase64(signature);

            return Promise.resolve(sig);
        });

Promise.all([libraryPromise, hmacPromise])
    .then(function (params) {
        let [lib, hmac] = params;

        let signedLibrary = {
            library: JSON.parse(lib),
            hmac: hmac
        };

        console.log(JSON.stringify(signedLibrary));
    });


var verificationPromise =
    Promise
        .all([libraryPromise, hmacKeyPromise, hmacPromise])
        .then(function (params) {
            let [libText, key, hmac] = params;
            let decodedHmac = atob(hmac);

            return window.crypto.subtle.verify(
                {
                    name: "HMAC"
                },
                key,
                stringToArrayBuffer(decodedHmac),
                stringToArrayBuffer(libText)
            );
        });

var decryptionPromise =
    Promise
        .all([verificationPromise, cryptoKeyPromise, libraryPromise])
        .then(function (params) {
            let [, key, libText] = params;
            let lib = JSON.parse(libText);
            let blob = lib.blob;

            let cryptoText = atob(blob);
            let realCryptoText = cryptoText.split(',').map(function (int) { return parseInt(int); });
            let byteArray = new Uint8Array(realCryptoText);

            return crypto.subtle.decrypt(
                {
                    name: "AES-CBC",
                    iv: encodeIvFromNumber(lib.library_version)
                },
                key,
                byteArray
            );
        })
        .then(function (plainText) {
            console.log(JSON.parse(arrayBufferToString(plainText)));
        })
        .catch(function (error) {
            console.log('Error: ' + error.message);
        });