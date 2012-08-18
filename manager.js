function passwordEntry() {
	this.title = 'unnamed';
	this.url = 'https://marcusklaas.nl';
	this.username = 'anon';
	this.password = 'password';
	this.comment = '';
}

function randPass(len, alphabet) {
	var result = '';

	if (!alphabet)
		alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
		 + '.,?:;[]~!@#$%^&*()-+/';
	var alphabetLength = alphabet.length;

	if ((len === undefined) || isNaN(len)) len = 12;

	for (var i = 0; i < len; i++) {
		var rnd = Math.floor(Math.random() * alphabetLength);
		result += alphabet.substring(rnd, rnd + 1);
	}

	return result;
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

function selectText() {
	if (document.selection) {
		var range = document.body.createTextRange();
		range.moveToElementText(this);
		range.select();
	} else if (window.getSelection) {
		var range = document.createRange();
		range.selectNode(this);
		window.getSelection().addRange(range);
	}
}

function addObscuredCell(row, text) {
	var node = document.createElement('td');
	var span = document.createElement('div');
	span.className = 'obscured';
	span.innerHTML = text;
	span.addEventListener('click', selectText);
	node.appendChild(span);
	row.appendChild(node);
}

function addLinkCell(row, url) {
	var node = document.createElement('td');
	var anchor = document.createElement('a');
	anchor.href = anchor.innerHTML = url;
	anchor.target = '_blank';
	node.appendChild(anchor);
	row.appendChild(node);
}

function addCell(row, text) {
	var node = document.createElement('td');
	node.innerHTML = text;
	row.appendChild(node);
}

window.onload = function() {
	var password, passHash, dec, enc, list = null;
	var idleTime = 0;
	var maxIdleTime = 20;
	var request = new XMLHttpRequest();

	document.getElementById('encryptionKey').focus();

	function logout() {
		password = null;
		passHash = null;
		dec = null;
		list = null;
		document.getElementById('overview').lastChild.innerHTML = '';
		document.getElementById('encryptionKey').focus();
		document.getElementById('encryptionKey').value = '';
		document.getElementById('authorized').className = 'hidden';
		document.getElementById('unauthorized').className = '';
	}

	function resetIdleTime() {
		idleTime = 0;
	}

	function incrementIdleTime() {
		if(++idleTime > maxIdleTime)
			logout();
	}

	setInterval(incrementIdleTime, 1000);

	/* filter shortcut: ctrl+q */
	document.addEventListener('keydown', function(evt) {
		resetIdleTime();

		if(evt.ctrlKey && evt.keyCode === 81) {
			evt.preventDefault();
			document.getElementById('filter').focus();
		}
	}, false);

	window.onmousemove = resetIdleTime();
	document.addEventListener("touchstart", resetIdleTime, false);
	document.addEventListener("touchmove", resetIdleTime, false);
	document.addEventListener("touchend", resetIdleTime, false);

	function closeDialog() {
		document.getElementById('overlay').className = 'hidden';
		document.getElementById('editModal').classList.add('hidden');
	}

	/* index -1 means new */
	function editDialog(index) {
		document.getElementById('overlay').className = '';
		document.getElementById('editModal').classList.remove('hidden');
		document.getElementById('editModal').setAttribute('data-index', index);
		document.getElementById('modalHeader').innerHTML = (index === -1) ? 'New password' : 'Edit password';
		document.getElementById('title').value = (index === -1) ? '' : list[index].title;
		document.getElementById('URL').value = (index === -1) ? '' : list[index].url;
		document.getElementById('username').value = (index === -1) ? '' : list[index].username;
		document.getElementById('pass').value = document.getElementById('passRepeat').value =
		 (index === -1) ? '' : list[index].password;
		document.getElementById('comment').value = (index === -1) ? '' : list[index].comment;
	}

	document.getElementById('overlay').addEventListener('click', closeDialog);
	document.getElementById('modalClose1').addEventListener('click', closeDialog);

	document.getElementById('save').addEventListener('click', function(evt) {
		evt.preventDefault();

		var index = parseInt(document.getElementById('editModal').getAttribute('data-index'));
		var pwdEntry = new passwordEntry;
		pwdEntry.title = document.getElementById('title').value;
		pwdEntry.url = document.getElementById('URL').value;
		pwdEntry.username = document.getElementById('username').value;
		pwdEntry.password = document.getElementById('pass').value;
		pwdEntry.comment = document.getElementById('comment').value;

		if(pwdEntry.password !== document.getElementById('passRepeat').value) {
			alert('Passwords do not match!');
			return;
		}

		if(index === -1) {
			list.push(pwdEntry);
			addRow(document.getElementById('overview').lastChild, pwdEntry);
		}
		else {
			list[index] = pwdEntry;
			
			var node = document.getElementById('overview').lastChild.firstChild;
			while(index--)
				node = node.nextSibling;

			node = node.firstChild;
			node.innerHTML = pwdEntry.title;
			node = node.nextSibling;
			node.innerHTML = pwdEntry.url;
			node = node.nextSibling;
			node.firstChild.innerHTML = pwdEntry.username;
			node = node.nextSibling;
			node.firstChild.innerHTML = pwdEntry.password;
			node.nextSibling.innerHTML = pwdEntry.comment;
		}
	
		sendUpdate(list);
		closeDialog();
	});

	function deletePassword(evt) {
		evt.preventDefault();

		if(!confirm("Are you totally sure you want to delete this password?"))
			return;

		var i = 0, row = this.parentNode.parentNode;

		for(child = row; (child = child.previousSibling) != null; i++);

		list.splice(i, 1);
		row.parentNode.removeChild(row);
		sendUpdate();
		
	}

	function toggleVisibility(evt) {
		var row = this.parentNode.parentNode;
		var currentVisibility = row.className == 'exposed';

		row.className = currentVisibility ? '' : 'exposed';
		this.innerHTML = currentVisibility ? '<i class="icon-eye-open"></i>' : '<i class="icon-eye-close"></i>';
		evt.preventDefault();
	}

	function editPassword(evt) {
		var row = this.parentNode.parentNode;
		var i = 0;

		for(child = row; (child = child.previousSibling) !== null; i++);

		editDialog(i);
	}

	function addLinks(row) {
		var node = document.createElement('td');
		var link = document.createElement('a');
		link.href = '#';
		link.className = 'toggleVisibility';
		link.innerHTML = '<i class="icon-eye-open"></i>';
		link.addEventListener('click', toggleVisibility);
		node.appendChild(link);

		link = document.createElement('a');
		link.href = '#';
		link.className = 'editPassword';
		link.innerHTML = '<i class="icon-edit"></i>';
		link.addEventListener('click', editPassword);
		node.appendChild(link);

		link = document.createElement('a');
		link.href = '#';
		link.className = 'deletePassword';
		link.innerHTML = '<i class="icon-trash"></i>';
		link.addEventListener('click', deletePassword);
		node.appendChild(link);

		row.appendChild(node);
	}

	function addRow(tbody, pass) {
		var row = document.createElement('tr');
		addCell(row, pass.title);
		addLinkCell(row, pass.url);
		addObscuredCell(row, pass.username);
		addObscuredCell(row, pass.password);
		addCell(row, pass.comment);
		addLinks(row);
		tbody.appendChild(row);
	}

	function displayList(list) {
		var i = 0;
		var pwdEntry = null;
		var tableBody = document.getElementById('overview').lastChild;

		for(i = 0; i < list.length; i++)
			addRow(tableBody, list[i]);
	}

	function sendUpdate() {
		var request = new XMLHttpRequest();

		request.onreadystatechange = function() {
			if(this.readyState === 4 && this.status === 200) {
				if(this.responseText !== 'success')
					alert('lib update failed ' + this.responseText);
			}
		};

		enc = GibberishAES.enc(JSON.stringify(list), password);
		var params = 'pwhash=' + passHash + '&newlib=' + encodeURIComponent(enc);

		request.open('POST', 'libupdate.php', true);
		request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		request.send(params);
	}

	request.onreadystatechange = function() {
		if(this.readyState === 4 && this.status === 200) {
			enc = this.responseText;
		}
	};

	request.open('GET', 'passwords.txt?noCache=' + Math.floor(Math.random() * 1e6), true);
	request.send(null);

	document.getElementById('decrypt').addEventListener('submit', function(evt) {
		password = document.getElementById('encryptionKey').value;
		passHash = SHA1(password);

		try {
			dec = GibberishAES.dec(enc, password);
			list = JSON.parse(dec);
			displayList(list);
			document.getElementById('authorized').className = '';
			document.getElementById('unauthorized').className = 'hidden';
			document.getElementById('filter').focus();
		}
		catch(e) {
			alert('Decryption failed: ' + e);
		}

		evt.preventDefault();
	});

	document.getElementById('randPass').addEventListener('click', function(evt) {
		document.getElementById('pass').value =
		 document.getElementById('passRepeat').value =
		 randPass(12, false);
		evt.preventDefault();
	});

	document.getElementById('newPassword').addEventListener('click', function(evt) {
		evt.preventDefault();
		editDialog(-1);
	});

	function filterPasswords(val) {
		var row = document.getElementById('overview').lastChild.firstChild;
		val = val.toLowerCase();

		for(var i = 0; i < list.length; i++, row = row.nextSibling)
			if(-1 === list[i].title.toLowerCase().indexOf(val))
				row.classList.add('hidden');
			else
				row.classList.remove('hidden');
	}

	document.getElementById('filter').addEventListener('keyup', function(evt) {
		filterPasswords(this.value);
	});
}
