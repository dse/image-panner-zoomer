class ImagePannerZoomerImage {

    private width: number|null;
    private height: number|null;
    private x: number|null;
    private y: number|null;
    private xEnd: number|null;
    private yEnd: number|null;
    private src: string|null;
    private imageElement: HTMLImageElement|null;
    private containerElement: HTMLElement|null;
    private ownerImagePannerZoomer: ImagePannerZoomer|null;
    private label: string|null;
    private labelElement: HTMLElement|null;
    private index: number|null;

    /*jshint -W003 */
    constructor(object) {
        Object.keys(object).forEach((key) => {
            this[key] = object[key];
        });
    }
    /*jshint +W003 */

    public setOwnerImagePannerZoomer(ipz: ImagePannerZoomer) {
        this.ownerImagePannerZoomer = ipz;
    }

    public setIndex(index: number) {
        this.index = index;
    }

    public hideImage() {
        this.imageElement.style.display = "none";
    }

    public showImage() {
        this.imageElement.style.display = "inline";
    }

    public place() {
        const ownerWidth  = this.ownerImagePannerZoomer.getOffsetWidth();
        const ownerHeight = this.ownerImagePannerZoomer.getOffsetHeight();
        const ownerX      = this.ownerImagePannerZoomer.getX();
        const ownerY      = this.ownerImagePannerZoomer.getY();
        const ownerZoom   = this.ownerImagePannerZoomer.getZoom();

        const zoomRatio = Math.pow(2, ownerZoom);

        const x = ownerWidth  / 2 - ownerX * zoomRatio + this.x * zoomRatio;
        const y = ownerHeight / 2 - ownerY * zoomRatio + this.y * zoomRatio;
        const width  = this.width  * zoomRatio;
        const height = this.height * zoomRatio;

        this.containerElement.style.position = "absolute";
        this.containerElement.style.left     = x + "px";
        this.containerElement.style.top      = y + "px";
        this.containerElement.style.width    = width + "px";
        this.containerElement.style.height   = height + "px";
        this.imageElement.style.width        = width + "px";
        this.imageElement.style.height       = height + "px";
    }

    public getNaturalWidth() {
        return this.imageElement.naturalWidth;
    }

    public getNaturalHeight() {
        return this.imageElement.naturalHeight;
    }

    public getX() {
        return this.x;
    }

    public getY() {
        return this.y;
    }

    public getXEnd() {
        return this.xEnd;
    }

    public getYEnd() {
        return this.yEnd;
    }

    public getContainerElement(callback) {
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

    public imageElementIs(element: HTMLElement) {
        return this.imageElement === element;
    }

    public clearStorage() {
        localStorage.removeItem(this.getStorageKey("width"));
        localStorage.removeItem(this.getStorageKey("height"));
        localStorage.removeItem(this.getStorageKey("x"));
        localStorage.removeItem(this.getStorageKey("y"));
    }

    public export() {
        return {
            src:    this.src,
            width:  this.width,
            height: this.height,
            x:      this.x,
            y:      this.y,
        };
    }

    public initializeSizeAndPosition(width: number, height: number, x: number, y: number) {
        const savedWidth  = localStorage.getItem(this.getStorageKey("width"));
        const savedHeight = localStorage.getItem(this.getStorageKey("height"));
        const savedX      = localStorage.getItem(this.getStorageKey("x"));
        const savedY      = localStorage.getItem(this.getStorageKey("y"));
        width  = (savedWidth  !== null) ? Number(savedWidth)  : width;
        height = (savedHeight !== null) ? Number(savedHeight) : height;
        x      = (savedX      !== null) ? Number(savedX)      : x;
        y      = (savedY      !== null) ? Number(savedY)      : y;
        this.setSizeAndPosition(width, height, x, y);
    }

    public setX(x: number) {
        this.x = x;
    }

    public setY(y: number) {
        this.y = y;
    }

    public store() {
        localStorage.setItem(this.getStorageKey("width"),  String(this.width));
        localStorage.setItem(this.getStorageKey("height"), String(this.height));
        localStorage.setItem(this.getStorageKey("x"),      String(this.x));
        localStorage.setItem(this.getStorageKey("y"),      String(this.y));
    }

    private setSizeAndPosition(width: number, height: number, x: number, y: number) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.xEnd = this.x + this.width;
        this.yEnd = this.y + this.height;
        this.store();
    }

    private getStorageKey(key) {
        return ["imagePannerZoomerImage", this.src, key].join(ImagePannerZoomer.SEPARATOR);
    }

}
