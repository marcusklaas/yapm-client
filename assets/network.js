export function getAsync(url) {
    return new Promise(function(resolve, reject) {
        let request = new XMLHttpRequest();

        request.onload = function() {
            if (request.status == 200) {
                resolve(request.response);
            }
            else {
                reject(Error(request.statusText));
            }
        };

        request.onerror = function() {
            reject(Error("Network Error"));
        };

        request.open('GET', url);
        request.send();
    });
}

export function postAsync(url, params) {
    return new Promise(function(resolve, reject) {
        let request = new XMLHttpRequest();

        request.onreadystatechange = function() {
            if(this.readyState === 4) {
                if(this.status !== 200) {
                    reject(Error(this));
                }
                else {
                    resolve();
                }
            }
        };

        request.open('POST', url, true);
        request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        request.send(params);
    });
}
