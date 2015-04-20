export function getAsync(url) {
    return ajaxAsync(url, 'GET', {});
}

export function postAsync(url, params) {
    return ajaxAsync(
        url,
        'POST',
        {
            'Content-type': 'application/x-www-form-urlencoded'
        },
        params
    );
}

function ajaxAsync(url, method, requestHeaders, params) {
    return new Promise(function(resolve, reject) {
        let request = new XMLHttpRequest();

        request.onreadystatechange = function() {
            if(this.readyState === 4) {
                if(this.status !== 200) {
                    reject(request.response);
                }
                else {
                    resolve();
                }
            }
        };

        for (let key in requestHeaders) {
            request.setRequestHeader(key, requestHeaders[key]);
        }

        request.open(method, url, true);
        request.send(params);
    });
}
