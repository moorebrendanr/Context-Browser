function getFaviconURL(domainURL) {
    return "https://s2.googleusercontent.com/s2/favicons?domain_url=" + domainURL;
}

function getAvgColor(imageUrl) {
    return new Promise((resolve) => {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        let htmlImage = new Image();
        htmlImage.onload = function () {
            console.log("Image loaded");
            canvas.width = htmlImage.width;
            canvas.height = htmlImage.height;
            ctx.drawImage(htmlImage, 0, 0);
            // document.body.appendChild(canvas);
            let imageData = ctx.getImageData(0, 0, htmlImage.width, htmlImage.height);
            let r = 0, g = 0, b = 0, a = 0;
            for (let i = 0; i < imageData.data.length; i += 4) {
                r += imageData.data[i];
                g += imageData.data[i+1];
                b += imageData.data[i+2];
                a += imageData.data[i+3];
            }
            let divisor = imageData.data.length / 4;
            r /= divisor;
            g /= divisor;
            b /= divisor;
            a /= divisor;
            resolve({
                r: r,
                g: g,
                b: b,
                a: a
            });
        };
        htmlImage.src = imageUrl;
    });
}
