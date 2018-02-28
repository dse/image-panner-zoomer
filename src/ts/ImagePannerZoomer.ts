/**
 * preparation:
 *
 *     <div id="elementid"></div>
 *
 *     <style>
 *         #elementid {
 *             / * specify a width and height and/or positioning info * /
 *         }
 *     </style>
 *
 *     var images = [
 *         "foo.jpg",
 *         ...
 *     ];
 *     // --- or ---
 *     var images = [
 *         { label: "foo", src: "foo.jpg" },
 *         ...
 *     ];
 *
 *     var containerElement = document.getElementById("elementid");
 *
 * constructor:
 *
 *     var ipz = new ImagePannerZoomer(images, containerElement);
 *     // --- or ---
 *     var ipz = new ImagePannerZoomer({
 *         images: images,
 *         containerElement: containerElement
 *     });
 */

class ImagePannerZoomer {

    public static SEPARATOR = String.fromCharCode(28);

    // defaults
    public zoomIncrement: number = 0.5;
    public imageWidth: number = 128;
    public gridSpacing: number = 32;
    private images: ImagePannerZoomerImage[]|null;
    private containerElement: HTMLElement|null;

    // state variables
    private isMoving: boolean = false;
    private isMovingMap: boolean = false;
    private isMovingImage: boolean = false;
    private isMovingZoom: boolean = false;
    private imageBeingMoved: ImagePannerZoomerImage|null;
    private dragX: number|null;
    private dragY: number|null;
    private originalX: number|null;
    private originalY: number|null;
    private originalZoom: number|null;
    private spaceBarIsDown: boolean = false;
    private controlIsDown: boolean = false;

    private x: number = 0;
    private y: number = 0;
    private zoom: number = 0;

    constructor(/* arguments */) {

        // process arguments
        Array.from(arguments).forEach((argument) => {
            if (typeof argument === "object") {
                if (argument instanceof Array) {
                    this.images = argument;
                } else if (argument instanceof HTMLElement) {
                    this.containerElement = argument;
                } else {
                    Object.keys(argument).forEach((key) => {
                        this[key] = argument[key];
                    });
                }
            }
        });

        // sanity check
        if (!this.images) {
            throw new Error("No images array specified");
        } else if (!this.containerElement) {
            throw new Error("No containerElement specified or containerElement not found");
        }

        // normalize images to objects
        this.images = this.images.map((image) => {
            if (typeof image === "object") {
                if (image instanceof ImagePannerZoomerImage) {
                    return image;
                } else {
                    return new ImagePannerZoomerImage(image);
                }
            } else if (typeof image === "string") {
                return new ImagePannerZoomerImage({
                    src: image,
                });
            } else {
                throw new Error("ImagePannerZoomer: images must be " +
                                "ImagePannerZoomerImage objects, other objects, or strings");
            }
        });

        // add indexes to each image
        this.images.forEach((image, index) => {
            image.setOwnerImagePannerZoomer(this);
            image.setIndex(index);
        });
    }

    public run() {
        this.containerElement.innerHTML = "";
        let style = window.getComputedStyle(this.containerElement);
        const position = style.position;
        let width: number;
        let height: number;
        switch (position) {
        case "fixed":
        case "absolute":
            this.containerElement.style.left   = "0px";
            this.containerElement.style.right  = "0px";
            this.containerElement.style.top    = "0px";
            this.containerElement.style.bottom = "0px";
            break;
        case "relative":
            // do nothing
            break;
        case "static":
        case "":
        case undefined:
        case null:
            this.containerElement.style.position = "relative";
            this.containerElement.style.overflow = "hidden";
            width = Number(style.width.replace(/px$/i, ""));
            height = Number(style.height.replace(/px$/i, ""));
            if (!width || !height) {
                this.containerElement.style.backgroundColor = "green";
            }
            if (!width) {
                this.containerElement.style.width = "50vw";
            }
            if (!height) {
                this.containerElement.style.height = "50vh";
            }
            style = window.getComputedStyle(this.containerElement);
            break;
        case "sticky":
            throw new Error("ImagePannerZoomer does not support a 'sticky' positioned container element.");
        default:
            throw new Error("ImagePannerZoomer does not support a '" + position + "' positioned container element.");
        }

        let imageCountRemaining = this.images.length;
        this.images.forEach((image, index) => {
            this.containerElement.appendChild(image.getContainerElement(() => {
                imageCountRemaining -= 1;
                if (imageCountRemaining === 0) {
                    this.onAllImagesLoaded();
                }
            }));
        });

        document.addEventListener("keydown",   this.onKeyDown.bind(this),   false);
        document.addEventListener("keyup",     this.onKeyUp.bind(this),     false);
        document.addEventListener("keypress",  this.onKeyPress.bind(this),  false);
        document.addEventListener("mousedown", this.onMouseDown.bind(this), false);
        document.addEventListener("mouseup",   this.onMouseUp.bind(this),   false);
        document.addEventListener("mousemove", this.onMouseMove.bind(this), false);
        document.addEventListener("wheel",     this.onWheel.bind(this),     false);
        window.addEventListener("resize", this.onWindowResize.bind(this), false);
        window.addEventListener("blur",   this.onWindowBlur.bind(this),   false);
    }

    public getOffsetWidth() {
        return this.containerElement.offsetWidth;
    }

    public getOffsetHeight() {
        return this.containerElement.offsetHeight;
    }

    public getX() {
        return this.x;
    }

    public getY() {
        return this.y;
    }

    public getZoom() {
        return this.zoom;
    }

    private onAllImagesLoaded() {
        this.images.forEach((image) => {
            image.showImage();
        });
        this.initializeSizesAndPositions();
        this.placeImages();
    }

    private placeImages() {
        this.images.forEach((image, index) => {
            image.place();
        });
    }

    private initializeSizesAndPositions() {
        let x = 0;
        const y = 0;
        this.images.forEach((image, index) => {
            const width = this.imageWidth;
            const height = Math.round(width * image.getNaturalHeight() / image.getNaturalWidth());
            image.initializeSizeAndPosition(width, height, x, y);
            x += Math.round((this.imageWidth + this.gridSpacing) / this.gridSpacing) * this.gridSpacing;
        });
        const xMin = Math.min.apply(Math, this.images.map((image) => image.getX()));
        const yMin = Math.min.apply(Math, this.images.map((image) => image.getY()));
        const xMax = Math.max.apply(Math, this.images.map((image) => image.getXEnd()));
        const yMax = Math.max.apply(Math, this.images.map((image) => image.getYEnd()));
        const savedX    = localStorage.getItem(this.getStorageKey("x"));
        const savedY    = localStorage.getItem(this.getStorageKey("y"));
        const savedZoom = localStorage.getItem(this.getStorageKey("zoom"));
        this.x    = (savedX !== null)    ? Number(savedX)    : Math.round((xMin + xMax) / 2);
        this.y    = (savedY !== null)    ? Number(savedY)    : Math.round((yMin + yMax) / 2);
        this.zoom = (savedZoom !== null) ? Number(savedZoom) : 0;
    }

    private onWindowBlur(event) {
        // If someone clicks Ctrl+Tab or something in this window, we need
        // to turn off the modifier states.
        this.spaceBarIsDown = false;
        this.controlIsDown = false;
        if (this.isMovingMap) {
            this.stopMoving();
        } else if (this.isMovingImage) {
            this.stopMoving();
        } else if (this.isMovingZoom) {
            this.stopMoving();
        }
    }

    // excludes browser shortcuts
    private onKeyPress(event) {
        if (event.key === "x") {
            if (confirm("Do you wish to clear the cache?")) {
                this.clearStorage();
                this.initializeSizesAndPositions();
                this.placeImages();
            }
            return;
        } else if (event.key === "0") {
            this.setZoom(0);
            this.placeImages();
            this.store();
        } else if (event.key === "-") {
            this.decrementZoom(this.zoomIncrement);
            this.placeImages();
            this.store();
        } else if (event.key === "+" || event.key === "=") {
            this.incrementZoom(this.zoomIncrement);
            this.placeImages();
            this.store();
        }
    }

    // includes browser shortcuts
    private onKeyDown(event) {
        if (event.key === " ") {
            this.spaceBarIsDown = true;
            event.preventDefault();
            return false;
        } else if (event.key === "Control") {
            this.controlIsDown = true;
            event.preventDefault();
            return false;
        }
    }

    private onKeyUp(event) {
        if (event.key === " ") {
            this.spaceBarIsDown = false;
            event.preventDefault();
            return false;
        } else if (event.key === "Control") {
            this.controlIsDown = false;
            event.preventDefault();
            return false;
        }
    }

    private onMouseDown(event) {
        if (this.spaceBarIsDown) {
            this.startMovingMap();
        } else if (this.controlIsDown) {
            this.startMovingZoom();
        } else if (event.target === this.containerElement) {
            this.startMovingMap();
        } else {
            const images = this.images.filter((image) => {
                return image.imageElementIs(event.target);
            });
            if (images.length === 1) {
                this.startMovingImage(images[0]);
            }
        }
        event.preventDefault();
        return false;
    }

    private onMouseUp(event) {
        if (this.isMovingMap) {
            this.stopMoving();
        } else if (this.isMovingImage) {
            this.stopMoving();
        } else if (this.isMovingZoom) {
            this.stopMoving();
        }
        event.preventDefault();
        return false;
    }

    private onMouseMove(event) {
        const movementX = event.movementX;
        const movementY = event.movementY;
        const zoomRatio = Math.pow(2, this.zoom);
        if (this.isMovingMap) {
            this.dragX -= movementX;
            this.dragY -= movementY;
            this.x = this.originalX + this.dragX / zoomRatio;
            this.y = this.originalY + this.dragY / zoomRatio;
            this.placeImages();
            this.store();
            event.preventDefault();
            return false;
        } else if (this.isMovingImage) {
            this.dragX += movementX;
            this.dragY += movementY;
            this.imageBeingMoved.setX(Math.round((this.originalX + this.dragX / zoomRatio) / this.gridSpacing)
                                      * this.gridSpacing);
            this.imageBeingMoved.setY(Math.round((this.originalY + this.dragY / zoomRatio) / this.gridSpacing)
                                      * this.gridSpacing);
            this.imageBeingMoved.place();
            this.imageBeingMoved.store();
            event.preventDefault();
            return false;
        } else if (this.isMovingZoom) {
            this.dragX += movementX;
            this.dragY += movementY;
            this.setZoom(this.originalZoom + this.dragX / 100);
            this.placeImages();
            this.store();
            event.preventDefault();
            return false;
        }
    }

    private onWindowResize(event) {
        this.placeImages();
    }

    private onWheel(event) {
        if (this.isMoving) {
            event.preventDefault();
            return false;
        } else if (event.deltaY < 0) {
            this.incrementZoom(this.zoomIncrement);
            this.placeImages();
            this.store();
            event.preventDefault();
            return false;
        } else if (event.deltaY > 0) {
            this.decrementZoom(this.zoomIncrement);
            this.placeImages();
            this.store();
            event.preventDefault();
            return false;
        }
    }

    private incrementZoom(increment) {
        this.setZoom(this.zoom + increment);
    }

    private decrementZoom(decrement) {
        this.setZoom(this.zoom - decrement);
    }

    private setZoom(zoom) {
        if (zoom > 4) {
            zoom = 4;
        } else if (zoom < -4) {
            zoom = -4;
        }
        this.zoom = zoom;
    }

    private store() {
        localStorage.setItem(this.getStorageKey("x"),    String(this.x));
        localStorage.setItem(this.getStorageKey("y"),    String(this.y));
        localStorage.setItem(this.getStorageKey("zoom"), String(this.zoom));
    }

    private startMovingMap() {
        this.dragX = 0;
        this.dragY = 0;
        this.originalX = this.x;
        this.originalY = this.y;
        this.originalZoom = null;
        this.isMoving = true;
        this.isMovingMap = true;
        this.isMovingImage = false;
        this.isMovingZoom = false;
        this.imageBeingMoved = null;
    }

    private stopMoving() {
        this.dragX = null;
        this.dragY = null;
        this.originalX = null;
        this.originalY = null;
        this.originalZoom = null;
        this.isMoving = false;
        this.isMovingMap = false;
        this.isMovingImage = false;
        this.isMovingZoom = false;
        this.imageBeingMoved = null;
    }

    private startMovingImage(image) {
        this.dragX = 0;
        this.dragY = 0;
        this.originalX = image.getX();
        this.originalY = image.getY();
        this.originalZoom = null;
        this.isMoving = true;
        this.isMovingMap = false;
        this.isMovingImage = true;
        this.isMovingZoom = false;
        this.imageBeingMoved = image;
    }

    private startMovingZoom() {
        this.dragX = 0;
        this.dragY = 0;
        this.originalX = null;
        this.originalY = null;
        this.originalZoom = this.zoom;
        this.isMoving = true;
        this.isMovingMap = false;
        this.isMovingImage = false;
        this.isMovingZoom = true;
        this.imageBeingMoved = null;
    }

    private getStorageKey(key) {
        return ["imagePannerZoomer", key].join(ImagePannerZoomer.SEPARATOR);
    }

    private clearStorage() {
        localStorage.removeItem(this.getStorageKey("x"));
        localStorage.removeItem(this.getStorageKey("y"));
        this.images.forEach((image) => {
            image.clearStorage();
        });
    }

    private export() {
        return {
            zoomIncrement: this.zoomIncrement,
            imageWidth:    this.imageWidth,
            gridSpacing:   this.gridSpacing,
            images:        this.images.map((image) => image.export()),
            zoom:          this.zoom,
            x:             this.x,
            y:             this.y,
        };
    }

}
