<?php

$doubleHash = '4ca45598c9a0c4c4366d33d6dfb89e77122d2f74';
$pwlib = 'passwords';
$pwlibext = 'txt';

if(isset($_POST['pwhash']) && isset($_POST['newlib'])) {
	if(sha1($_POST['pwhash']) !== $doubleHash)
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
