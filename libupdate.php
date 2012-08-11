<?php

$hash = sha1('jehova66');
$pwlib = 'passwords';
$pwlibext = 'txt';

if(isset($_POST['pwhash']) && isset($_POST['newlib'])) {
	if($_POST['pwhash'] !== $hash)
		die('incorrect password');

	$i = 1;
	$sfsg = true;

	if(file_exists($pwlib.'.'.$pwlibext)) {
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
