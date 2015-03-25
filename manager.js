crypto = window.crypto || window.msCrypto;

function a2s(buffer) {
    var str = '';

    for (var iii = 0; iii < buffer.byteLength; iii++) {
        str += String.fromCharCode(buffer[iii]);
    }

    return str;
}

function s2a(string) {
    var array = [], i;

    for (i = 0; i < string.length; i++) {
        array[i] = string.charCodeAt(i);
    }

    return array;
}

function openSSLKey(passwordArr, saltArr) {
    var data00 = passwordArr.concat(saltArr),
        md5_hash = [md5(data00)],
        result = md5_hash[0];

    for (var i = 1; i < 3; i++) {
        md5_hash[i] = md5(md5_hash[i - 1].concat(data00));
        result = result.concat(md5_hash[i]);
    }

    return {
        key: result.slice(0, 32),
        iv: result.slice(32, 48)
    };
}

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

function addLinkCell(row, url, text) {
	var node = document.createElement('td');
	var anchor = document.createElement('a');
	anchor.href = url;
	anchor.innerHTML = text;
	anchor.target = '_blank';
	node.appendChild(anchor);
	row.appendChild(node);
}

function addComment(row, text) {
	var node = document.createElement('td');
	var table = document.createElement('table');
	var tableRow = document.createElement('tr');
	var cell = document.createElement('td');
	table.className = 'comment';
	cell.innerHTML = text;
	tableRow.appendChild(cell);
	table.appendChild(tableRow);
	node.appendChild(table);
	row.appendChild(node);
}

function deriveKey(password) {
    var keyIvPair = openSSLKey(s2a(password), plainText.slice(8, 16));
    var key = new Uint8Array(keyIvPair.key);
    var iv = new Uint8Array(keyIvPair.iv);
    var cryptoText = new Uint8Array(plainText.slice(16));

    window.crypto.subtle.importKey("raw", key, {name: "AES-CBC"}, false, ["encrypt", "decrypt"])
        .then(function (key) {
            var pair = {
                key: key,
                iv: iv
            };

            return Promise.resolve(pair);
        });
}

window.onload = function() {
	var password, passHash, dec, enc, list = null;
	var idleTime = 0, offlineMode = false;
	var maxIdleTime = 20;
    var cryptoKey, iv;

	(function fetchPasswords() {
		if(offlineMode) {
			enc = localStorage["enc"];
			return;
		}

		var request = new XMLHttpRequest();
	
		request.onreadystatechange = function() {
			if(this.readyState === 4) {
				if(this.status === 200)
					localStorage["enc"] = enc = this.responseText;
				else {
					offlineMode = true;
					enc = localStorage["enc"];
				}
			}
		};

		request.open('GET', 'encrypted/passwords.txt?noCache=' + Math.floor(Math.random() * 1e6), false);
		
		try {
			request.send(null);
		}
		catch(e) {
			offlineMode = true;
			enc = localStorage["enc"];
		}
	})();

	document.getElementById('encryptionKey').focus();

	function logout() {
		password = null;
		passHash = null;
		dec = null;
		list = null;
        cryptoKey = null;
        iv = null;

		document.getElementById('overview').lastChild.innerHTML = '';
		document.getElementById('encryptionKey').focus();
		document.getElementById('encryptionKey').value = '';
		document.getElementById('authorized').className = 'hidden';
		document.getElementById('unauthorized').className = '';
		document.getElementById('username').value = '';
		document.getElementById('pass').value = '';
		document.getElementById('passRepeat').value = '';
	}

	function resetIdleTime() {
		idleTime = 0;
	}

	function incrementIdleTime() {
		if(++idleTime > maxIdleTime)
			logout();
	}

	setInterval(incrementIdleTime, 1000);

	/* filter shortcut: ctrl+e */
	document.addEventListener('keydown', function(evt) {
		resetIdleTime();

		if(evt.ctrlKey && evt.keyCode === 69) {
			evt.preventDefault();
			document.getElementById('filter').focus();
		}
	}, false);

	document.onmousemove = resetIdleTime;
	document.addEventListener("touchstart", resetIdleTime, false);
	document.addEventListener("touchmove", resetIdleTime, false);
	document.addEventListener("touchend", resetIdleTime, false);

	function closeDialog(event) {
		if(event && event.target != this) {
			return;
		}

		document.getElementById('editModal').classList.add('hidden');
		document.getElementById('masterkeyModal').classList.add('hidden');
	}

	/* index -1 means new */
	function editDialog(index) {
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

	document.getElementById('editModal').addEventListener('click', closeDialog);
	document.getElementById('masterkeyModal').addEventListener('click', closeDialog);
	document.getElementById('modalClose1').addEventListener('click', closeDialog);
	document.getElementById('modalClose2').addEventListener('click', closeDialog);

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
			filterPasswords(document.getElementById('filter').value);
		}
		else {
			list[index] = pwdEntry;
			
			var node = document.getElementById('overview').lastChild.firstChild;
			while(index--)
				node = node.nextSibling;

			node = node.firstChild;
			node.firstChild.innerHTML = pwdEntry.title;
			node.firstChild.href = pwdEntry.url;
			node = node.nextSibling;
			node.firstChild.innerHTML = pwdEntry.username;
			node = node.nextSibling;
			node.firstChild.innerHTML = pwdEntry.password;
			node.nextSibling.innerHTML = pwdEntry.comment;
		}
	
		sendUpdate();
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

		if(false === offlineMode) {
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
		}

		row.appendChild(node);
	}

	function addRow(tbody, pass) {
		var row = document.createElement('tr');
		addLinkCell(row, pass.url, pass.title);
		addObscuredCell(row, pass.username);
		addObscuredCell(row, pass.password);
		addComment(row, pass.comment);
		addLinks(row);
		tbody.appendChild(row);
	}

	function displayList(list) {
		var tableBody = document.getElementById('overview').lastChild;

		for(var i = 0; i < list.length; i++)
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

		dec = {'modified': Math.round(new Date().getTime() / 1000), 'list': list};
		localStorage["enc"] = enc = GibberishAES.enc(JSON.stringify(dec), password);
		var params = 'pwhash=' + passHash + '&newlib=' + encodeURIComponent(enc);

		request.open('POST', 'libupdate.php', true);
		request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		request.send(params);
	}

	document.getElementById('decrypt').addEventListener('submit', function(evt) {
        evt.preventDefault();

        password = document.getElementById('encryptionKey').value;
		passHash = SHA1(password);

        deriveKey(password)
            .then(function (keyIvPair) {
                cryptoKey = keyIvPair.key;
                iv = new Uint8Array(keyIvPair.iv);

                var cipherText = s2a(atob(enc)); //
                var cryptoText = new Uint8Array(cipherText.slice(16));

                return crypto.subtle.decrypt({name: "AES-CBC", iv: iv}, key, cryptoText);

            })
            .then(function(result) {
                var decrypted_data = new Uint8Array(result);

                dec = JSON.parse(a2s(decrypted_data));
                list = dec.list;
                displayList(list);

                document.getElementById('authorized').className = '';
                document.getElementById('unauthorized').className = 'hidden';
                document.getElementById('filter').focus();
            })
            .catch(function (e) {
                alert('Decryption failed: ' + e.message);
            });
	});

	document.getElementById('randPass').addEventListener('click', function(evt) {
		document.getElementById('pass').value =
		 document.getElementById('passRepeat').value =
		 randPass(16, false);
		evt.preventDefault();
	});


	if(offlineMode) {
		var buttons = document.getElementsByClassName('newPassword');
		for(var i = 0; i < buttons.length; i++)
			buttons[i].parentNode.removeChild(button);

		buttons = document.getElementsByClassName('newMasterKey');
		for(var i = 0; i < buttons.length; i++)
			buttons[i].parentNode.removeChild(button);
	}
	else {
		function newPW(evt) {
			evt.preventDefault();
			editDialog(-1);
		}

		function newMasterPW(evt) {
			document.getElementById('masterkeyModal').classList.remove('hidden');
		}

		var buttons = document.getElementsByClassName('newPassword');
		for(var i = 0; i < buttons.length; i++)
			buttons[i].addEventListener('click', newPW);

		buttons = document.getElementsByClassName('newMasterKey');
		for(var i = 0; i < buttons.length; i++)
			buttons[i].addEventListener('click', newMasterPW);

		document.getElementById('saveKey').addEventListener('click', function(evt) {
			evt.preventDefault();

			if(true !== confirm('Are you sure you want to change the master key?')) {
				closeDialog();
				return;
			}

			var newKey = document.getElementById('key').value;
			var newKeyRepeat = document.getElementById('keyRepeat').value;

			if(newKey !== newKeyRepeat) {
				alert('New keys do not match!');
				return;
			}

			/* send new passHash to server */
			var request = new XMLHttpRequest();

			request.onreadystatechange = function() {
				if(this.readyState === 4 && this.status === 200) {
					if(this.responseText !== 'success') {
						alert('key change failed ' + this.responseText);
					}
					else {
						password = newKey;
						passHash = SHA1(password);
						sendUpdate();
						closeDialog();
					}
				}
			};

			var params = 'pwhash=' + passHash + '&newhash=' + SHA1(newKey);

			request.open('POST', 'libupdate.php', false);
			request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			request.send(params);
		});
	}

	/* this function looks fairly complex -- try to make it simpler when ur
	 * not as tired */
	function filterPasswords(val) {
		var tableBody = document.getElementById('overview').lastChild;
		var row = tableBody.firstChild, nextRow;
		var len = list.length;
		val = val.toLowerCase();
		var tokens = val.split(' ');

		for(var i = 0, k = 0; i < len; i++, row = nextRow) {
			nextRow = row.nextSibling;

			for(var j = 0; j < tokens.length; j++) {
				var tmp;

				if(-1 === list[k].title.toLowerCase().indexOf(tokens[j])
				 && -1 === list[k].comment.toLowerCase().indexOf(tokens[j])) {
					row.classList.add('hidden');

					/* place row at bottom of list */
					tableBody.insertBefore(row, null);
					tmp = list[k];
					list.splice(k, 1);
					list[len - 1] = tmp;
					break;
				}

				row.classList.remove('hidden');
				k++;
			}
		}
	}

	document.getElementById('filter').addEventListener('keyup', function(evt) {
		filterPasswords(this.value);
	});
}
