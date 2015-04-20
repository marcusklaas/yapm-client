// TODO: add hider/ unhider method?
export function getListManager(passwordList, tableBody, passwordRenderer) {
    function getIndex(row) {
        let index = 0;

        for (let child = row; child.previousSibling; child = child.previousSibling) {
            index += 1;
        }

        return index;
    }

    function getRow(domObject) {
        while (domObject.parentNode != tableBody) {
            domObject = domObject.parentNode;
        }

        return domObject;
    }

    function addPassword(passwordObject) {
        const domObject = passwordRenderer(passwordObject);

        tableBody.appendChild(domObject);
    }

    tableBody.innerHTML = '';

    for (let password of passwordList) {
        addPassword(password);
    }

    return {
        add: addPassword,
        get: function(domObject) {
            const row = getRow(domObject);
            const index = getIndex(row);

            return passwordList[index];
        },
        getAll: function() {
            return passwordList;
        },
        set: function(domObject, passwordObject, indexHint) {
            const row = getRow(domObject);
            const index = indexHint || getIndex(row);
            const newNode = passwordRenderer(passwordObject);

            passwordList[index] = passwordObject;
            tableBody.replaceChild(newNode, row);
        },
        remove: function(domObject) {
            const row = getRow(domObject);
            const index = getIndex(row);

            tableBody.removeChild(row);
            passwordList.splice(index, 1);
        },
        getIndex: function (domObject) {
            return getIndex(getRow(domObject));
        },
        // TODO: try to revise this function in a more functional style
        filter: function(val) {
            let row = tableBody.firstChild, nextRow;
            let len = passwordList.length;
            let tokens = val.toLowerCase().split(' ');

            for(let i = 0, k = 0; i < len; i++, row = nextRow) {
                nextRow = row.nextSibling;

                for(let j = 0; j < tokens.length; j++) {
                    if(-1 === passwordList[k].title.toLowerCase().indexOf(tokens[j])
                        && -1 === passwordList[k].comment.toLowerCase().indexOf(tokens[j])) {
                        row.classList.add('hidden');

                        /* place row at bottom of list */
                        tableBody.insertBefore(row, null);

                        let tmp = passwordList[k];
                        passwordList.splice(k, 1);
                        passwordList[len - 1] = tmp;
                        break;
                    }

                    row.classList.remove('hidden');
                    k++;
                }
            }
        }
    };
}
