This is a brief outline of the new design.

Design goals
------------
- security: no one can read the passwords without the passphrase
- authentication: legimate users can detect libraries that have been tampered with
- ergonomics: no key files, only a passphrase
- common blocks: use algorithms in the web cryptography API for security and speed wherever possible
- no trusted source required: do not depend on the supplier of the library to be trustworthy, or connections to be secure
- efficiency: keep libraries as tiny as possible
- complexity: keep the scheme as simple as possible

Library authentication
----------------------
The first approach was to use assymetric cryptography to sign the library. The public key would be stored on the server. When a new version of the library would be uploaded, the server would check its authenticity using the public key. The user would also do this after downloading a library file from the server, so it would not even need to trust the server. This should work. It's just not very ergonomic. Ideally, the user would not have store its private key, but create it every time the library is accessed or updated. This seems to be nontrivial. Many (most?) assymetric verification schemes can't just create a key pair from a passphrase or string of bytes. Schemes like RSA create their keys using a pseudo random number generator. Those number generators function deterministically once the seed is chosen, however. We could use our passphrase to seed the RNG and run the key generation process afterwards. This should result in identical keys every time we run the key generation algorithm. The problem is that the [Web Cryptography API](http://www.w3.org/TR/WebCryptoAPI) does not provide a way to the set the seed of its internal random number generator. This makes sense, as the random number is free for the implementors to choose. The outcome could differ between different browsers. The only remaining solution is to do the key generation completely in javascript. This is a bad idea for many reasons, so we choose to take a different approach.

Instead, we provide authentication using [HMACs](https://en.wikipedia.org/wiki/Hash-based_message_authentication_code). Every time a library file is transmitted (uploaded or downloaded), we transfer a hash of the library combined with the passphrase. The user can take the HMAC of the received library and compare it to the associated hash. This guarantees authenticity of the library. The transferred object has the following structure:

    {
        hmac: String, // HMAC(passphrase, blob)
        blob: String
    }

But this does not prevent any one else from uploading false library files. To achieve this, we again use HMACs. In each library blob, we store a version number. Whenever someone uploads a new library with version `m`, they also send `HMAC(passphrase, m + 1)`. This value is stored on the server. The next someone tries to upload a library update, the server can ask for the HMAC of the current version and compare it to the stored value. It will update the library if and only if the two values are equal. An update request has the following structure:

    {
        current_hmac: String, // HMAC(passphrase, m)
        next_hmac: String,    // HMAC(passphrase, m + 1)
        new_library: {
            hmac: String,     // HMAC(passphrase, blob)
            blob: String
        }
    }

This scheme has the added benefit of protecting against accidental write conflicts. Image two authenticated users `A` and `B` who are updating the library around the same time. Let's say that they both are at version `1` at the start of our example. Without a versioned system, `A` and `B` would both make their changes, and upload version `2` independently. Since they are both authenticated, the server would accept their changes and serve the last received version, effectively discarding one of the two change sets. Using the scheme above, this cannot happen. Once a library with version `2` has been received, the server will decline the second update. That user should then pull the most recent version, apply its changes to that version and upload the resulting library as version `3`.

The blob
========

The library at its core is an object in JSON. The structure is detailed below:

    {
        api_version: Integer,
        library_version: Integer,
        modified: Integer,  // seconds since epoch
        passwords: [Object]
    }

A password object looks like this:

    {
        title: String,
        username: String,
        password: String,
        url: String,
        comment: String
    }

It may be extended with more properties. It is important that additions to the password object coincide with a bump in the api version.

To produce a blob, this object is cast to a JSON string. It is then compressed using either gzip or lzma. The resulting byte stream is encrypted using the AES-CBC-256 cypher. The library version is used as initialization vector. The key is derived using a scheme similar to that of WPA2:

    key = PBKDF2(HMAC−SHA1, passphrase, library_version, 4096, 256)
    
where 4096 is the number of iterations and 256 the size of the resulting key in bytes. After encryption, the result is encoded in base64.
