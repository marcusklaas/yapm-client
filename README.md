yet-another-password-manager
============================

super-straight-forward-single-user-json-aes-based-online-password-manager


This should be run over HTTPS so that no javascript can be inserted which steals passwords. 
other than that, the security does not rely on HTTPS. all cryptography is done on the client side.

in theory, the only way someone could steal your passwords are the following:
- false certificate (a la diginotar) and someone pretends to be https://marcusklaas/passwords
- someone break into webserver and change the javascript so that it sends info to 3rd party next time you decrypt
- keyloggers
- memory sniffing (client side)

so it should be pretty safe :-) it is safer than storing ur passwords with a party like onePass. they claim the crypto is done on client side which is true, but at point in time they may change the javascript and you won't notice. and they can steal your passwords bigtime. it won't happen, but they can do it. onepass is also vurnerable to all the security weaknesses above

INSTALL GUIDE
=============
you should have php installed for your http server. set the raw sha1 hash of your masterpassword.
do *not* leave it like $hash = sha1('ur pw'); because anyone who can read the php source will know your masterpassword.

then fill passwords.txt with the encrypted json-string [] using your master password

u all done!

WAT IS COMING IN DA FUTURE
==========================
- password/ username length hiding
- space hiding in pass/ user
- copy to clipboard (using flash :-()
- read from keepass2 database file (maybe write, if possible)