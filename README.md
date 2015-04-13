yet another password manager
============================

This is a super straight-forward single-user json/aes-based online password manager. It stores your passwords in a JSON format on the server with AES-256-CBC encryption. No passwords or keys are stored on the server. You can access the passwords via a local client made in HTML/ javascript. All cryptography is done on the client. A double SHA1-hash of your master password is stored on the server side so it can make sure only authorized users can update the password database.

This software is designed for a single user, to be run on a server he or she trusts. The greatest security risk lies in any one altering the client code. If someone has write access to the HTML or javascript files, they can alter it to steal your master password after you've entered it. For these reasons, always send the HTML and javascript over an encrypted connection. Also, make sure that no one can alter these files on the server.

PHP should have write access for the encrypted folder, your HTTP server should have read access for `index.html`.

Feature list:
- access to all your passwords from any machine with an internet connection!
- low code complexity. All the code client is contained within `assets/manager.js` with no dependencies on other libraries. The web cryptography API is used for speed and reliability.
- snappy. We use a grunt build process which inlines all images, stylesheets, fonts and javascript into the html. This results in a single file download which is under 200kb compressed.
- relatively secure. We use AES256 in CBC mode for our encryption and then use HMAC to sign the library. This makes it near impossible for any one to read or alter your password library without you noticing.
- semi-decent filtering. Hit CTRL-E to filter your passwords, each token is matched independently in title and comment.
- automatic logout. After 10 seconds of idling, you log out automatically.
- safe from people looking over your shoulder. You can copy user names and passwords without revealing them or their length, just click to select.

Coming soon:
- responsive design. Should make it easier to use on mobile devices.
- offline mode. Caches the page and a version of the password library in case you are without internet.

# Please note: just as with any other password manager, there are still some security risks. Think of key loggers, or some one changing the client code on the server. More fundamentally, you need to trust your browser and machine in general.

Getting started
===============

- Make sure you have HTTPS server installed with a PHP module.
- Clone the repo: `$ git clone https://www.github.com/marcusklaas/yet-another-password-manager`
- Set the permissions: `$ chmod 777 encrypted/* encrypted && chmod 555 index.html libupdate.php` 
- Login to the password manager and log in with the default password `changeme`.
- Change your master password by pressing the button in the top right.