import { compressToUint8Array } from './lzstring';
import { getHmacKey, getAesKey, getSha1, decryptStringFromBase64, verifyHmac, encryptObject, getHmac } from './crypto-primitives'

// TODO: add crypto/ textDecoder checks

export function createCryptoManager(password, library) {
    let hmacKeyPromise = getHmacKey(password);
    let aesKeyPromise = getAesKey(password);
    let hashPromise = getSha1(password);

    let libraryPromise = hmacKeyPromise
        .then(key =>
            verifyHmac(key, library.library, library.hmac)
                .then(() => JSON.parse(library.library))
        );

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
                .then(params => {
                    console.log('Creating library');

                    return createLibrary(params[0], params[1], 2 /* api version */)
                });

            let libraryJsonPromise = libraryPromise.then(JSON.stringify);

            let hmacPromise = Promise.all([hmacKeyPromise, libraryJsonPromise])
                .then(params => getHmac(params[0], params[1]));

            return Promise.all([libraryJsonPromise, hmacPromise])
                .then(params => {
                    console.log({
                        library: params[0],
                        hmac: params[1]
                    });

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
