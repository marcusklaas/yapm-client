<?php

$hashfile = 'passhash.txt';
$doubleHash = trim(file_get_contents($hashfile));
$pwlib = 'encrypted/passwords';
$pwlibext = 'txt';

if(false === $doubleHash)
	die('failed reading hash file');

if(isset($_POST['pwhash']) && isset($_POST['newhash'])) {
	if(sha1($_POST['pwhash']) !== $doubleHash)
		die('incorrect password');

	if(!file_put_contents($hashfile, sha1($_POST['newhash'])))
		die('failed writing new hash to file');

	die('success');
}

if(isset($_POST['pwhash']) && isset($_POST['newlib'])) {
	if(sha1($_POST['pwhash']) !== $doubleHash)
		die('incorrect password');

	if(file_exists($pwlib.'.'.$pwlibext)) {
		$i = 1;

		for(; file_exists($pwlib.$i.'.'.$pwlibext); $i++);

		if(!rename($pwlib.'.'.$pwlibext, $pwlib.$i.'.'.$pwlibext))
			die('rename failed');
	}

	if(!file_put_contents($pwlib.'.'.$pwlibext, $_POST['newlib']))
		die('file write failed');

	die('success');
}

die('this is for machines only!');

?>
