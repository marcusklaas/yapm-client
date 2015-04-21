<?php

$hashfile = 'encrypted/passhash.txt';
$doubleHash = trim(file_get_contents($hashfile));
$pwlib = 'encrypted/passwords';
$pwlibext = 'txt';

// fallback for http_response_code introduced in php 5.4
if ( ! function_exists('http_response_code')) {
    function http_response_code($code = null) {
        if ($code === null) {
            return (isset($GLOBALS['http_response_code']) ? $GLOBALS['http_response_code'] : 200);
        }

        switch ($code) {
            case 100: $text = 'Continue'; break;
            case 101: $text = 'Switching Protocols'; break;
            case 200: $text = 'OK'; break;
            case 201: $text = 'Created'; break;
            case 202: $text = 'Accepted'; break;
            case 203: $text = 'Non-Authoritative Information'; break;
            case 204: $text = 'No Content'; break;
            case 205: $text = 'Reset Content'; break;
            case 206: $text = 'Partial Content'; break;
            case 300: $text = 'Multiple Choices'; break;
            case 301: $text = 'Moved Permanently'; break;
            case 302: $text = 'Moved Temporarily'; break;
            case 303: $text = 'See Other'; break;
            case 304: $text = 'Not Modified'; break;
            case 305: $text = 'Use Proxy'; break;
            case 400: $text = 'Bad Request'; break;
            case 401: $text = 'Unauthorized'; break;
            case 402: $text = 'Payment Required'; break;
            case 403: $text = 'Forbidden'; break;
            case 404: $text = 'Not Found'; break;
            case 405: $text = 'Method Not Allowed'; break;
            case 406: $text = 'Not Acceptable'; break;
            case 407: $text = 'Proxy Authentication Required'; break;
            case 408: $text = 'Request Time-out'; break;
            case 409: $text = 'Conflict'; break;
            case 410: $text = 'Gone'; break;
            case 411: $text = 'Length Required'; break;
            case 412: $text = 'Precondition Failed'; break;
            case 413: $text = 'Request Entity Too Large'; break;
            case 414: $text = 'Request-URI Too Large'; break;
            case 415: $text = 'Unsupported Media Type'; break;
            case 500: $text = 'Internal Server Error'; break;
            case 501: $text = 'Not Implemented'; break;
            case 502: $text = 'Bad Gateway'; break;
            case 503: $text = 'Service Unavailable'; break;
            case 504: $text = 'Gateway Time-out'; break;
            case 505: $text = 'HTTP Version not supported'; break;
            default:
                exit('Unknown http status code "' . htmlentities($code) . '"');
            break;
        }

        $protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');

        header($protocol . ' ' . $code . ' ' . $text);

        $GLOBALS['http_response_code'] = $code;

        return $code;
    }
}

function getLibraryVersion($json) {
    if (gettype($json) !== 'string') {
        dieWithError(500, 'couldn\'t read library from disk');
    }

    $object = json_decode($json, true);

    if (null === $object || ! isset($object['library'])) {
        dieWithError(400, 'invalid library');
    }

    $library = json_decode($object['library'], true);

    if (null === $library || ! isset($library['library_version'])) {
        dieWithError(400, 'invalid library');
    }

    $version = intval($library['library_version']);

    if (0 === $version) {
        dieWithError(400, 'invalid library version');
    }

    return $version;
}

function dieWithError($statusCode, $message) {
    http_response_code($statusCode);
    die($message);
}

function getBackupPath($libraryPath, $fileExtension) {
    $i = 1;

    for(; file_exists($libraryPath.$i.'.'.$fileExtension); $i++);

    return $libraryPath.$i.'.'.$fileExtension;
}

if(false === $doubleHash) {
    dieWithError(500, 'failed reading hash file');
}

if( ! isset($_POST['pwhash']) || ! isset($_POST['newlib'])) {
    dieWithError(400, 'this page is for machines only!');
}

if(sha1($_POST['pwhash']) !== $doubleHash) {
    dieWithError(401, 'incorrect password hash');
}

$libraryPath = $pwlib.'.'.$pwlibext;
$backupPath = getBackupPath($pwlib, $pwlibext);

// read current library, get version
$library = file_get_contents($libraryPath);
$previousVersion = getLibraryVersion($library);

// read new library, get version
$newVersion = getLibraryVersion($_POST['newlib']);

// make sure new version is 1 greater than old version
if ($previousVersion + 1 !== $newVersion) {
    dieWithError(400, 'version mismatch');
}

if(file_exists($libraryPath) && ! rename($libraryPath, $backupPath)) {
    dieWithError(500, 'backup of old library failed');
}

if( ! file_put_contents($libraryPath, $_POST['newlib'])) {
    dieWithError(500, 'failed writing new library to disk');
}

if(isset($_POST['newhash']) && ! file_put_contents($hashfile, sha1($_POST['newhash']))) {
    if ( ! rename($backupPath, $libraryPath)) {
        dieWithError(500, 'changed password, but was unable to restore library');
    }

    dieWithError(500, 'failed writing new hash to file');
}

die('success');
