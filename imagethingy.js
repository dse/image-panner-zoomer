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

var ImagePannerZoomer = function (/* arguments */) {

    // defaults
    this.zoomIncrement = 0.5;
    this.imageWidth = 128;
    this.gridSpacing = 32;

    // process arguments
    Array.from(arguments).forEach(function (argument) {
        if (typeof argument === "object") {
            if (argument instanceof Array) {
                this.images = argument;
            } else if (argument instanceof HTMLElement) {
                this.containerElement = argument;
            } else {
                Object.keys(argument).forEach(function (key) {
                    this[key] = argument[key];
                }, this);
            }
        }
    }, this);

    // sanity check
    if (!this.images) {
        throw new Exception("No images array specified");
    } else if (!this.containerElement) {
        throw new Exception("No containerElement specified or containerElement not found");
    }

    // normalize images to objects
    this.images = this.images.map(function (image) {
        if (typeof image === "object") {
            if (image instanceof ImagePannerZoomerImage) {
                return image;
            } else {
                return new ImagePannerZoomerImage(image);
            }
        } else if (typeof image === "string") {
            return new ImagePannerZoomerImage({
                src: image
            });
        } else {
            throw new Exception("ImagePannerZoomer: images must be ImagePannerZoomerImage objects, other objects, or strings");
        }
    }, this);

    // add indexes to each image
    this.images.forEach(function (image, index) {
        image.ownerImagePannerZoomer = this;
        image.index = index;
    }, this);

    // set some state variables
    this.isMoving = false;
    this.isMovingMap = false;
    this.isMovingImage = false;
    this.isMovingZoom = false;
    this.imageBeingMoved = null;
    this.dragX = null;
    this.dragY = null;
    this.originalX = null;
    this.originalY = null;
    this.originalZoom = null;
    this.spaceBarIsDown = false;
    this.controlIsDown = false;
};

ImagePannerZoomer.SEPARATOR = String.fromCharCode(28);

ImagePannerZoomer.prototype.onImageLoad = function (index) {
    var image = this.images[index];
};

ImagePannerZoomer.prototype.onAllImagesLoaded = function () {
    this.images.forEach(function (image) {
        image.imageElement.style.display = "inline"; // ready to show
    });
    this.initializeSizesAndPositions();
    this.placeImages();
};

ImagePannerZoomer.prototype.placeImages = function () {
    this.images.forEach(function (image, index) {
        image.place();
    }, this);
};

ImagePannerZoomer.prototype.initializeSizesAndPositions = function (index) {
    var x = 0;
    var y = 0;
    this.images.forEach(function (image, index) {
        var width = this.imageWidth;
        var height = Math.round(width * image.imageElement.naturalHeight / image.imageElement.naturalWidth);
        image.initializeSizeAndPosition(width, height, x, y);
        x += Math.round((this.imageWidth + this.gridSpacing) / this.gridSpacing) * this.gridSpacing;
    }, this);
    var xMin = Math.min.apply(Math, this.images.map(function (image) { return image.x; }));
    var yMin = Math.min.apply(Math, this.images.map(function (image) { return image.y; }));
    var xMax = Math.max.apply(Math, this.images.map(function (image) { return image.xEnd; }));
    var yMax = Math.max.apply(Math, this.images.map(function (image) { return image.yEnd; }));
    var savedX    = localStorage.getItem(this.getStorageKey("x"));
    var savedY    = localStorage.getItem(this.getStorageKey("y"));
    var savedZoom = localStorage.getItem(this.getStorageKey("zoom"));
    this.x    = (savedX !== null)    ? Number(savedX)    : Math.round((xMin + xMax) / 2);
    this.y    = (savedY !== null)    ? Number(savedY)    : Math.round((yMin + yMax) / 2);
    this.zoom = (savedZoom !== null) ? Number(savedZoom) : 0;
};

ImagePannerZoomer.prototype.run = function () {
    var that = this;
    this.containerElement.innerHTML = "";
    var style = window.getComputedStyle(this.containerElement);
    var position = style.position;
    var width, height;
    switch (position) {
    case "fixed":
    case "absolute":
        this.containerElement.style.left = 0;
        this.containerElement.style.right = 0;
        this.containerElement.style.top = 0;
        this.containerElement.style.bottom = 0;
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
        throw new Exception("ImagePannerZoomer does not support a 'sticky' positioned container element.");
    default:
        throw new Exception("ImagePannerZoomer does not support a '" + position + "' positioned container element.");
    }
    var imageCountRemaining = this.images.length;
    this.images.forEach(function (image, index) {
        image.containerElement = document.createElement("div");
        image.containerElement.style.position = "relative";
        image.imageElement = new Image();
        image.imageElement.style.display = "none"; // just while loading
        image.imageElement.addEventListener("load", function () {
            imageCountRemaining -= 1;
            that.onImageLoad(index);
            if (imageCountRemaining === 0) {
                that.onAllImagesLoaded();
            }
        }, false);
        image.imageElement.src = image.src;
        this.containerElement.appendChild(image.containerElement);
        image.containerElement.appendChild(image.imageElement);
        if (image.label) {
            image.labelElement = document.createElement("span");
            image.labelElement.style.position = "absolute";
            image.labelElement.style.top = 0;
            image.labelElement.style.left = 0;
            image.labelElement.style.transform = "translateY(-100%)";
            image.labelElement.appendChild(document.createTextNode(image.label));
            image.containerElement.appendChild(image.labelElement);
        }
    }, this);
    document.addEventListener("keydown",   this.onKeyDown.bind(this),   false);
    document.addEventListener("keyup",     this.onKeyUp.bind(this),     false);
    document.addEventListener("keypress",  this.onKeyPress.bind(this),  false);
    document.addEventListener("mousedown", this.onMouseDown.bind(this), false);
    document.addEventListener("mouseup",   this.onMouseUp.bind(this),   false);
    document.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    document.addEventListener("wheel",     this.onWheel.bind(this),     false);
    window.addEventListener("resize", this.onResize.bind(this),      false);
    window.addEventListener("blur",   this.onWindowBlur.bind(this),  false);
};

ImagePannerZoomer.prototype.onWindowBlur = function (event) {
    // If someone clicks Ctrl+Tab or something in this window, we need
    // to turn off the modifier states.
    this.spaceBarIsDown = false;
    this.controlIsDown = false;
    if (this.isMovingMap) {
        this.stopMovingMap();
    } else if (this.isMovingImage) {
        this.stopMovingImage();
    } else if (this.isMovingZoom) {
        this.stopMovingZoom();
    }
};

// excludes browser shortcuts
ImagePannerZoomer.prototype.onKeyPress = function (event) {
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
};

// includes browser shortcuts
ImagePannerZoomer.prototype.onKeyDown = function (event) {
    if (event.key === " ") {
        this.spaceBarIsDown = true;
        event.preventDefault();
        return false;
    } else if (event.key === "Control") {
        this.controlIsDown = true;
        event.preventDefault();
        return false;
    }
};

ImagePannerZoomer.prototype.onKeyUp = function (event) {
    if (event.key === " ") {
        this.spaceBarIsDown = false;
        event.preventDefault();
        return false;
    } else if (event.key === "Control") {
        this.controlIsDown = false;
        event.preventDefault();
        return false;
    }
};

ImagePannerZoomer.prototype.onMouseDown = function (event) {
    if (this.spaceBarIsDown) {
        this.startMovingMap();
    } else if (this.controlIsDown) {
        this.startMovingZoom();
    } else if (event.target === this.containerElement) {
        this.startMovingMap();
    } else {
        var images = this.images.filter(function (image) {
            return image.imageElement === event.target;
        }, this);
        if (images.length === 1) {
            this.startMovingImage(images[0]);
        }
    }
    event.preventDefault();
    return false;
};

ImagePannerZoomer.prototype.onMouseUp = function (event) {
    if (this.isMovingMap) {
        this.stopMovingMap();
    } else if (this.isMovingImage) {
        this.stopMovingImage();
    } else if (this.isMovingZoom) {
        this.stopMovingZoom();
    }
    event.preventDefault();
    return false;
};

ImagePannerZoomer.prototype.onMouseMove = function (event) {
    var movementX = event.movementX;
    var movementY = event.movementY;
    var zoomRatio = Math.pow(2, this.zoom);
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
        this.imageBeingMoved.x = Math.round((this.originalX + this.dragX / zoomRatio) / this.gridSpacing) * this.gridSpacing;
        this.imageBeingMoved.y = Math.round((this.originalY + this.dragY / zoomRatio) / this.gridSpacing) * this.gridSpacing;
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
};

ImagePannerZoomer.prototype.onResize = function (event) {
    this.placeImages();
};

ImagePannerZoomer.prototype.onWheel = function (event) {
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
};

ImagePannerZoomer.prototype.incrementZoom = function (increment) {
    this.setZoom(this.zoom + increment);
};

ImagePannerZoomer.prototype.decrementZoom = function (decrement) {
    this.setZoom(this.zoom - decrement);
};

ImagePannerZoomer.prototype.setZoom = function (zoom) {
    if (zoom > 4) {
        zoom = 4;
    } else if (zoom < -4) {
        zoom = -4;
    }
    this.zoom = zoom;
};

ImagePannerZoomer.prototype.store = function () {
    localStorage.setItem(this.getStorageKey("x"),    this.x);
    localStorage.setItem(this.getStorageKey("y"),    this.y);
    localStorage.setItem(this.getStorageKey("zoom"), this.zoom);
};

ImagePannerZoomer.prototype.startMovingMap = function () {
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
};

ImagePannerZoomer.prototype.stopMovingMap = function () {
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
};

ImagePannerZoomer.prototype.startMovingImage = function (image) {
    this.dragX = 0;
    this.dragY = 0;
    this.originalX = image.x;
    this.originalY = image.y;
    this.originalZoom = null;
    this.isMoving = true;
    this.isMovingMap = false;
    this.isMovingImage = true;
    this.isMovingZoom = false;
    this.imageBeingMoved = image;
};

ImagePannerZoomer.prototype.stopMovingImage = function () {
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
};

ImagePannerZoomer.prototype.startMovingZoom = function () {
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
};

ImagePannerZoomer.prototype.stopMovingZoom = function () {
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
};

ImagePannerZoomer.prototype.getStorageKey = function (key) {
    return ["imagePannerZoomer", key].join(ImagePannerZoomer.SEPARATOR);
};

ImagePannerZoomer.prototype.clearStorage = function () {
    localStorage.removeItem(this.getStorageKey("x"));
    localStorage.removeItem(this.getStorageKey("y"));
    this.images.forEach(function (image) {
        image.clearStorage();
    }, this);
};

ImagePannerZoomer.prototype.export = function () {
    return {
        zoomIncrement: this.zoomIncrement,
        imageWidth:    this.imageWidth,
        gridSpacing:   this.gridSpacing,
        images:        this.images.map(function (image) { return image.export(); }),
        zoom:          this.zoom,
        x:             this.x,
        y:             this.y
    };
};

/* ========================================================================= */

var ImagePannerZoomerImage = function (object) {
    Object.keys(object).forEach(function (key) {
        this[key] = object[key];
    }, this);
};

ImagePannerZoomerImage.prototype.initializeSizeAndPosition = function (width, height, x, y) {
    var savedWidth  = localStorage.getItem(this.getStorageKey("width"));
    var savedHeight = localStorage.getItem(this.getStorageKey("height"));
    var savedX      = localStorage.getItem(this.getStorageKey("x"));
    var savedY      = localStorage.getItem(this.getStorageKey("y"));
    width  = (savedWidth  !== null) ? Number(savedWidth)  : width;
    height = (savedHeight !== null) ? Number(savedHeight) : height;
    x      = (savedX      !== null) ? Number(savedX)      : x;
    y      = (savedY      !== null) ? Number(savedY)      : y;
    this.setSizeAndPosition(width, height, x, y);
};

ImagePannerZoomerImage.prototype.setSizeAndPosition = function (width, height, x, y) {
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    this.xEnd = this.x + this.width;
    this.yEnd = this.y + this.height;
    this.store();
};

ImagePannerZoomerImage.prototype.store = function () {
    localStorage.setItem(this.getStorageKey("width"),  this.width);
    localStorage.setItem(this.getStorageKey("height"), this.height);
    localStorage.setItem(this.getStorageKey("x"),      this.x);
    localStorage.setItem(this.getStorageKey("y"),      this.y);
};

ImagePannerZoomerImage.prototype.place = function () {
    var ownerWidth  = this.ownerImagePannerZoomer.containerElement.offsetWidth;
    var ownerHeight = this.ownerImagePannerZoomer.containerElement.offsetHeight;
    var ownerX      = this.ownerImagePannerZoomer.x;
    var ownerY      = this.ownerImagePannerZoomer.y;
    var ownerZoom   = this.ownerImagePannerZoomer.zoom;

    var zoomRatio = Math.pow(2, ownerZoom);

    var x = ownerWidth  / 2 - ownerX * zoomRatio + this.x * zoomRatio;
    var y = ownerHeight / 2 - ownerY * zoomRatio + this.y * zoomRatio;
    var width  = this.width  * zoomRatio;
    var height = this.height * zoomRatio;

    this.containerElement.style.position = "absolute";
    this.containerElement.style.left     = x + "px";
    this.containerElement.style.top      = y + "px";
    this.containerElement.style.width    = width + "px";
    this.containerElement.style.height   = height + "px";
    this.imageElement.style.width        = width + "px";
    this.imageElement.style.height       = height + "px";
};

ImagePannerZoomerImage.prototype.getStorageKey = function (key) {
    return ["imagePannerZoomerImage", this.src, key].join(ImagePannerZoomer.SEPARATOR);
};

ImagePannerZoomerImage.prototype.clearStorage = function () {
    localStorage.removeItem(this.getStorageKey("width"));
    localStorage.removeItem(this.getStorageKey("height"));
    localStorage.removeItem(this.getStorageKey("x"));
    localStorage.removeItem(this.getStorageKey("y"));
};

ImagePannerZoomerImage.prototype.export = function () {
    return {
        src:    this.src,
        width:  this.width,
        height: this.height,
        x:      this.x,
        y:      this.y
    };
};
