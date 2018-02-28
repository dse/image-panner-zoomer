default:
	tsc --project src/ts

diff: default
	perl -0777 -p -i \
		-e 's:}\s+else\b:} else:g;' \
		-e 's:\b(let|const)\b:var:g;' \
		src/ts/ImagePannerZoomer.js \
		src/ts/ImagePannerZoomerImage.js
	cat src/ts/{ImagePannerZoomer,ImagePannerZoomerImage}.js | \
		diff -ubwB src/js/ImagePannerZoomer.js -
