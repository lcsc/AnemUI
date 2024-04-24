export type DownloadDoneCB = (status: number, response: any) => void;
export type DownloadErrorCB=(status:number, error?:Error)=>void;


var requests: { [key: string]: [DownloadDoneCB] } = {};


export function downloadUrl(url: string, cb: DownloadDoneCB, errorCb?:DownloadErrorCB,responseType:XMLHttpRequestResponseType="arraybuffer"): void {

    var request = new XMLHttpRequest();


    var onload = function (e:any) {
        //request.onload_(request.status, request.response);
        if (typeof requests[url] !== "undefined") {
            let call = requests[url];

            for (var i = 0; i < call.length; i++) {
                // request.call[i].status = request.status;
                // request.call[i].response = request.response;
                call[i](request.status, request.response);
            }
            delete requests[url];
        }
    }
    var onerror = function (error: any) {
        if (typeof requests[url] !== "undefined") {
            delete requests[url];
        }
        if(errorCb!=undefined){
          errorCb(request.status,error)
        }
    }


    request.onerror = onerror;
    request.onload = onload;
    //request.onload_ = onload_;


    let asynchronous = true;
    request.open('GET', url, asynchronous);
    request.responseType = responseType;

    if (typeof requests[url] === "undefined") {
        request.send(null);
        requests[url] = [cb];
    } else {
        requests[url].push(cb);
    }

}