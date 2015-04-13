<?php

$hashfile = 'encrypted/passhash.txt';
$doubleHash = trim(file_get_contents($hashfile));
$pwlib = 'encrypted/passwords';
$pwlibext = 'txt';

if(false === $doubleHash) {
    die('failed reading hash file');
}

function getBackupPath($libraryPath, $fileExtension) {
    $i = 1;

    for(; file_exists($libraryPath.$i.'.'.$fileExtension); $i++);

    return $libraryPath.$i.'.'.$fileExtension;
}

// TODO: indicate success/ failure using http status codes instead of response text!

if(isset($_POST['pwhash']) && isset($_POST['newlib'])) {
    if(sha1($_POST['pwhash']) !== $doubleHash) {
        die('incorrect password');
    }

    $libraryPath = $pwlib.'.'.$pwlibext;
    $backupPath = getBackupPath($pwlib, $pwlibext);

    if(file_exists($libraryPath) && ! rename($libraryPath, $backupPath)) {
        die('rename failed');
    }

    if( ! file_put_contents($libraryPath, $_POST['newlib'])) {
        die('file write failed');
    }

    if(isset($_POST['newhash']) && ! file_put_contents($hashfile, sha1($_POST['newhash']))) {
        if ( ! rename($backupPath, $libraryPath)) {
            die('changed password, but was unable to restore library! This is a big deal!');
        }

        die('failed writing new hash to file');
    }

    die('success');
}

die('this is for machines only!');
