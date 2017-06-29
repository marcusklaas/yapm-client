yet another password manager
============================

**NOTE**: This repository is no longer being maintained. The future is elm, and it is [here](https://github.com/JordyMoos/elm-yapm-client).


This is a super straight-forward single-user json/aes-based online password manager. It stores your passwords in a JSON format on the server with AES-256-CBC encryption. No passwords or keys are stored on the server. You can access the passwords via a local client made in HTML/ javascript. All cryptography is done on the client. A double SHA1-hash of your master password is stored on the server side so it can make sure only authorized users can update the password database.

This software is designed for a single user, to be run on a server he or she trusts. The greatest security risk lies in any one altering the client code. If someone has write access to the HTML or javascript files, they can alter it to steal your master password after you've entered it. For these reasons, always send the HTML and javascript over an encrypted connection. Also, make sure that no one can alter these files on the server.

Your HTTP server should have read access for `index.html`.

Features:
- access to all your passwords from any machine with an internet connection!
- low code complexity. All the code client is contained within `assets/js` with no dependencies on external libraries. The web cryptography API is used for speed and reliability.
- snappy. We use a grunt build process which inlines all images, stylesheets, fonts and javascript into the html. This results in a single file download which is about 18 kilobyte after compression.
- relatively secure. We use AES256 in CBC mode for our encryption and then use HMAC to sign the library. This makes it near impossible for any one to read or alter your password library without you noticing.
- semi-decent filtering. Hit CTRL-E to filter your passwords, each token is matched independently in title and comment.
- automatic logout. After 20 seconds of idling, you log out automatically.
- safe from people looking over your shoulder. You can copy user names and passwords without revealing them or their length, just click to select.
- offline mode. Caches the page and a version of the password library in case you are without internet.

Coming soon:
- responsive design. Should make it easier to use on mobile devices.

*Note*: just as with any other password manager, there are still some security risks. Think of key loggers, or some one changing the client code on the server. More fundamentally, you need to trust your browser and machine in general.

Getting started
===============

- Make sure you have HTTPS server installed.
- Install a yapm server such as the [yapm php server](https://www.github.com/marcusklaas/yapm-server)
- Clone the repo in a directory that is served by your http server: `$ git clone https://www.github.com/marcusklaas/yapm-client yapm`
- Set the permissions: `$ chmod 555 yapm/index.html` 
- Set the configuration `$ $EDITOR config.json`
- Login to the password manager and log in with the default password `changeme`.
- Change your master password by pressing the button in the top right.

Build process
=============

- Make sure you have a recent version of (>= 6.0) nodejs and grunt installed.
- Install the dependencies: `$ sudo npm install`
- Edit the configuration: `$ vim config.json`
- Build the client `$ grunt`

If all goes well, this will update the file `index.html` in the root directory. It has no external dependencies. 

To rebuild automatically whenever a source or configuration file changes, run `$ grunt watch`.

Words of gratitude
==================

Thanks to

- [svgeneration](http://www.svgeneration.com) for the bad-ass vector graphics background;
- [fontello](http://www.fontello.com) for the subset of font-awesome icons;
- [twitter bootstrap](http://getbootstrap.com/) for the stylesheet framework;
- [lz-string](https://github.com/pieroxy/lz-string) for the lz compression library.
