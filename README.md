yet-another-password-manager
============================

This is a super straight-forward single-user json/aes-based online password manager. It stores your passwords in a JSON format on the server with AES-256-CBC encryption. No passwords or keys are stored on the server. You can acccess the passwords via a local client made in HTML/ javascript. All cryptography is done in this client. A double SHA1-hash of your masterpassword is stored on the server side so it can make sure only authorized users can update the password database. 

This software is designed for a single user, to be run on a server he or she trusts. The greatest security risk lies in the client side code. If someone has write-access to the HTML or javascript files, they can alter it in such a way that they steal your master password after you've entered it. For these reasons, always send the HTML and javascript over an encrypted line. Also, make sure that no one can alter these files on the server. 

PHP should have write access for passhash.txt and the encrypted folder, and ofcourse your HTTP server should have read access for all files. Other than that, lock things down as much as possible. Note that it is not a risk for other people to run PHP on the same server, as they can only edit the encrypted/ hashed data (if you have your permissions set correctly!).

Some features:
- relatively secure. Does not rely on some other service like OnePass to keep your passwords safe and feed you proper crypto libraries. 
- semi-decent filtering. Hit CTRL-E to filter your passwords, each token is matched independently in title and comment.
- off-line fallback. The password database and page is cached, so when no internet connection is present you can still access your passwords.
- auto logout. After 20 seconds of idling, you log out automatically.
- safe from people looking over your shoulder. You can copy usernames and passwords without revealing them or their length, just click to select.

This should be run over HTTPS so that no javascript can be inserted which steals passwords. 
other than that, the security does not rely on HTTPS. all cryptography is done on the client side.

Getting started
===============

Make sure you have HTTPS server installed with a PHP module. Clone the repo. Set the permissions of the files right. Make sure that all the static HTML and javascript are not writable by arbitrary users. In the ideal case, they are READ-ONLY for all. Visit the page in a browser over a secure line. Login using the master key <code>changeme</code>. Change the master key to your own and start adding your keys.
