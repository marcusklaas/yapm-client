function passwordEntry() {
	this.title = 'unnamed';
	this.url = 'https://marcusklaas.nl';
	this.username = 'anon';
	this.password = 'password';
	this.comment = '';
}

function createPasswordList(size) {
	var i = 0;
	var list = new Array(size);

	while(i < size) {
		list[i] = new passwordEntry;
		list[i].title = 'password' + ++i;
	}

	return list;
}

function addObscuredCell(row, text) {
	var node = document.createElement('td');
	var span = document.createElement('div');
	span.className = 'obscured';
	span.innerHTML = text;
	node.appendChild(span);
	row.appendChild(node);
}

function addCell(row, text) {
	var node = document.createElement('td');
	node.innerHTML = text;
	row.appendChild(node);
}

function addRow(tbody, pass) {
	var row = document.createElement('tr');
	addCell(row, pass.title);
	addCell(row, pass.url);
	addObscuredCell(row, pass.username);
	addObscuredCell(row, pass.password);
	addCell(row, pass.comment);
	tbody.appendChild(row);
}

function displayList(list) {
	var i = 0;
	var pwdEntry = null;
	var tableBody = document.getElementById('overview').lastChild;

	for(i = 0; i < list.length; i++)
		addRow(tableBody, list[i]);
}

window.onload = function() {
	var testPassword = 'jehova66';
	var password, passHash, dec, enc, list = null;
	var generateAES = false;
	var request = new XMLHttpRequest();

	function sendUpdate() {
		var request = new XMLHttpRequest();

		request.onreadystatechange = function() {
			if(this.readyState === 4 && this.status === 200) {
				if(this.responseText === 'success')
					alert('lib successfully updated');
				else
					alert('lib update failed ' + this.responseText);
			}
		};

		enc = GibberishAES.enc(JSON.stringify(list), password);
		document.getElementById('testing').innerHTML = enc;
		var params = 'pwhash=' + passHash + '&newlib=' + encodeURIComponent(enc);

		request.open('POST', 'libupdate.php', true);
		request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		request.send(params);
	}

	if(generateAES) {
		var passwordList = createPasswordList(10);
		enc = GibberishAES.enc(JSON.stringify(passwordList), testPassword);
		document.getElementById('testing').innerHTML = enc;
	}

	request.onreadystatechange = function() {
		if(this.readyState === 4 && this.status === 200 && !generateAES) {
			document.getElementById('testing').innerHTML = this.responseText;
			enc = this.responseText;
		}
	};

	request.open('GET', 'passwords.txt', true);
	request.send(null);

	document.getElementById('decrypt').addEventListener('submit', function(evt) {
		password = document.getElementById('encryptionKey').value;
		passHash = SHA1(password);

		try {
			dec = GibberishAES.dec(enc, password);
			document.getElementById('testing').innerHTML = dec;
			list = JSON.parse(dec);
			displayList(list);
		}
		catch(e) {
			document.getElementById('testing').innerHTML = 'decryption failed: ' + e;
		}

		evt.preventDefault();
	});

	document.getElementById('newPassword').addEventListener('submit', function(evt) {
		if(list !== null) {
			var pwdEntry = new passwordEntry;
			pwdEntry.title = document.getElementById('newTitle').value;
			pwdEntry.url = document.getElementById('newURL').value;
			pwdEntry.username = document.getElementById('newUsername').value;
			pwdEntry.password = document.getElementById('newPass').value;
			pwdEntry.comment = document.getElementById('newComment').innerHTML;
			
			if(pwdEntry.password !== document.getElementById('newPassRepeat').value) {
				alert('passwords not identical!');
				evt.preventDefault();
				return;
			}

			list.push(pwdEntry);
			addRow(document.getElementById('overview').lastChild, pwdEntry);
			sendUpdate(list);
		}

		evt.preventDefault();
	});
}
