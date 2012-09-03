yet-another-password-manager
============================

super-straight-forward-single-user-json-aes-based-online-password-manager


This should be run over HTTPS so that no javascript can be inserted which steals passwords. 
other than that, the security does not rely on HTTPS. all cryptography is done on the client side.

in theory, the only ways (I can thijk of rite nao) someone could steal your passwords are the following:
- false certificate (a la diginotar) and someone pretends to be https://marcusklaas/passwords
- someone break into webserver and change the javascript so that it sends info to 3rd party next time you decrypt
- keyloggers
- memory sniffing (client side)

so it should be pretty safe :-) it is safer than storing ur passwords with a party like onePass. they claim the crypto is done on client side which is true, but at any point in time they may change the javascript and you won't notice. and they can steal your passwords bigtime. it won't happen, but they can do it. there is a way to prevent this from happening. make a *local* function, like a browser extention, which hashes all of the javascript (using a crypto-hash like sha-x!). when you start using the service you check all javascript for security flaws. if you donot find any, you hash it all and remember the value. each successive time you download your passwords, you hash the javascript again and compare it to the trusted hash. if it is the same, the javascript probably did not change and you can trust your info won't be sent to their (or anyone else's servers). onepass is also vurnerable to all the security weaknesses above.
INSTALL GUIDE
=============
you should have php installed for your http server. set the raw double-sha1 hash of your masterpassword.

then fill passwords.txt with the encrypted json-string [] using your master password. encrypt it using ghiberishAES javascript function (default settings) or run <code>echo "[]" | openssl enc -aes-256-cbc -a -k URPASSWORD >passwords.txt</code> in the directory containing passwords.txt

u all done!

WAT IS COMING IN DA FUTURE
==========================
- copy to clipboard (using flash :-()
- read from keepass2 database file (maybe write, if possible)