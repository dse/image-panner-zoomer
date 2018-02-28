class ImagePannerZoomerImage {
    /*jshint -W003 */
    constructor(object) {
        Object.keys(object).forEach((key) => {
            this[key] = object[key];
        });
    }
    /*jshint +W003 */
    setOwnerImagePannerZoomer(ipz) {
        this.ownerImagePannerZoomer = ipz;
    }
    setIndex(index) {
        this.index = index;
    }
    hideImage() {
        this.imageElement.style.display = "none";
    }
    showImage() {
        this.imageElement.style.display = "inline";
    }
    place() {
        var ownerWidth = this.ownerImagePannerZoomer.getOffsetWidth();
        var ownerHeight = this.ownerImagePannerZoomer.getOffsetHeight();
        var ownerX = this.ownerImagePannerZoomer.getX();
        var ownerY = this.ownerImagePannerZoomer.getY();
        var ownerZoom = this.ownerImagePannerZoomer.getZoom();
        var zoomRatio = Math.pow(2, ownerZoom);
        var x = ownerWidth / 2 - ownerX * zoomRatio + this.x * zoomRatio;
        var y = ownerHeight / 2 - ownerY * zoomRatio + this.y * zoomRatio;
        var width = this.width * zoomRatio;
        var height = this.height * zoomRatio;
        this.containerElement.style.position = "absolute";
        this.containerElement.style.left = x + "px";
        this.containerElement.style.top = y + "px";
        this.containerElement.style.width = width + "px";
        this.containerElement.style.height = height + "px";
        this.imageElement.style.width = width + "px";
        this.imageElement.style.height = height + "px";
    }
    getNaturalWidth() {
        return this.imageElement.naturalWidth;
    }
    getNaturalHeight() {
        return this.imageElement.naturalHeight;
    }
    getX() {
        return this.x;
    }
    getY() {
        return this.y;
    }
    getXEnd() {
        return this.xEnd;
    }
    getYEnd() {
        return this.yEnd;
    }
    getContainerElement(callback) {
        if (this.containerElement) {
            return this.containerElement;
        }
        this.containerElement = document.createElement("div");
        this.containerElement.style.position = "relative";
        this.imageElement = new Image();
        this.imageElement.style.display = "none"; // just while loading
        this.imageElement.addEventListener("load", callback, false);
        this.imageElement.src = this.src;
        this.containerElement.appendChild(this.imageElement);
        if (this.label) {
            this.labelElement = document.createElement("span");
            this.labelElement.style.position = "absolute";
            this.labelElement.style.top = "0px";
            this.labelElement.style.left = "0px";
            this.labelElement.style.transform = "translateY(-100%)";
            this.labelElement.appendChild(document.createTextNode(this.label));
            this.containerElement.appendChild(this.labelElement);
        }
        return this.containerElement;
    }
    imageElementIs(element) {
        return this.imageElement === element;
    }
    clearStorage() {
        localStorage.removeItem(this.getStorageKey("width"));
        localStorage.removeItem(this.getStorageKey("height"));
        localStorage.removeItem(this.getStorageKey("x"));
        localStorage.removeItem(this.getStorageKey("y"));
    }
    export() {
        return {
            src: this.src,
            width: this.width,
            height: this.height,
            x: this.x,
            y: this.y,
        };
    }
    initializeSizeAndPosition(width, height, x, y) {
        var savedWidth = localStorage.getItem(this.getStorageKey("width"));
        var savedHeight = localStorage.getItem(this.getStorageKey("height"));
        var savedX = localStorage.getItem(this.getStorageKey("x"));
        var savedY = localStorage.getItem(this.getStorageKey("y"));
        width = (savedWidth !== null) ? Number(savedWidth) : width;
        height = (savedHeight !== null) ? Number(savedHeight) : height;
        x = (savedX !== null) ? Number(savedX) : x;
        y = (savedY !== null) ? Number(savedY) : y;
        this.setSizeAndPosition(width, height, x, y);
    }
    setX(x) {
        this.x = x;
    }
    setY(y) {
        this.y = y;
    }
    store() {
        localStorage.setItem(this.getStorageKey("width"), String(this.width));
        localStorage.setItem(this.getStorageKey("height"), String(this.height));
        localStorage.setItem(this.getStorageKey("x"), String(this.x));
        localStorage.setItem(this.getStorageKey("y"), String(this.y));
    }
    setSizeAndPosition(width, height, x, y) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.xEnd = this.x + this.width;
        this.yEnd = this.y + this.height;
        this.store();
    }
    getStorageKey(key) {
        return ["imagePannerZoomerImage", this.src, key].join(ImagePannerZoomer.SEPARATOR);
    }
}
