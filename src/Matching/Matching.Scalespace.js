/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @author Baptiste Mazin     <baptiste.mazin@telecom-paristech.fr>
 * @author Guillaume Tartavel <guillaume.tartavel@telecom-paristech.fr>
 */

var root = typeof window === 'undefined' ? module.exports : window;

///////////////////////////////////////////////////////////////////////////
//                           Scalespace Class                            //
///////////////////////////////////////////////////////////////////////////


(function (global) {

    /**
     * @class Matching.Scalespace
     * @constructor
     */
    function ScaleSpace(image, nScale, sigmaInit, scaleRatio) {
        if (image instanceof Matrix !== true) {
            throw new Error("ScaleSpace: Image must be provided.");
        }
        this.image = image.im2single();

        if (nScale !== undefined) {
            this.nScale = nScale;
        }
        if (sigmaInit !== undefined) {
            this.sigmaInit = sigmaInit;
        }
        if (scaleRatio !== undefined) {
            this.scaleRatio = scaleRatio;
        }
        this.scale = [];
    }

    ScaleSpace.prototype = {
        nScale: 9,
        sigmaInit: 0.63,
        scaleRatio: 1.26,
        lapThresh: 4e-3,
        harrisThresh: 1e4,
        /** Function to use for exporting the keypoint list
         * @return {String}
         */
        keypointsToString: function () {
            var i, ei, k = this.keypoints;
            var out = "";
            for (i = 0, ei = k.length; i < ei; i++) {
                out += k[i].toString() + "\n";
            }
            return out;
        },
        /** Function to use for exporting the list of descriptors
         * @return {String}
         */
        descriptorsToString: function (name) {
            var i, ei, k = this.keypoints;
            var out = "";
            for (i = 0, ei = k.length; i < ei; i++) {
                out += k[i].descriptorsData[name].toString();
            }
            return out;
        },
        /** Function to use to get an image of the scalespace at a given
         * scale and with gradient computed. It is useful for display
         * purpose.
         * @return {String}
         */
        getImage: function (scale, img, norm, gradient) {
            if (img === undefined) {
                img = this.image;
                return norm === true ? img : Matrix.rdivide(img, img.max());
            }
            var scale = this.scale[scale];
            if (img === "blur" || img === "gray") {
                img = scale[img];
            } else if (img === "phase-norm") {

            } else {
                img = scale.gradient[img];
            }
            return norm === true ? Matrix.rdivide(img, img.max()) : img;
        },
        /** This function computes the scalespace.
         * @param {Number} nScale
         *  The Number of scale used.
         * @param {Number} sigmaInit
         *  The blur factor of the first scale.
         * @param {Number} scaleRation
         *  The factor to appy to go to the next scale.
         * @return {Object}
         *  An image.
         */
        computeScaleSpace: function (nScale, sigmaInit, scaleRatio) {
            this.nScale = nScale || this.nScale;
            this.sigmaInit = sigmaInit || this.sigmaInit;
            this.scaleRatio = scaleRatio || this.scaleRatio;

            nScale = this.nScale;
            sigmaInit = this.sigmaInit;
            scaleRatio = this.scaleRatio;
            var image = this.image;
            var i;
            for (i = 0; i < nScale; i++) {
                var s = {};
                s.sigma = sigmaInit * Math.pow(scaleRatio, i);
                //s.blur = image.fastBlur(s.sigma);
                s.blur = image.gaussian(s.sigma);
                s.gray = s.blur.rgb2gray();
                s.gradient = s.gray.gradient(1, 1, 1, 1, 1);

                // Laplacian normalization
                var normFactor = Math.pow(s.sigma, 2);
                s.gradient.laplacian.abs().times(normFactor);
                this.scale[i] = s;
            }
            return this;
        },
        /** Function used to precompute the laplacian pyramid.
         * @chainable
         */
        precomputeMaxLaplacian: function () {
            var s = this.scale;

            s.maxLap = [];
            var sTmp =  [0, 0, 0];
            var view = this.image.getView();
            var dx = view.getStep(1), lx = view.getEnd(1);
            var ly = view.getEnd(0);

            var maxLocal;
            var k, ke, x, nx, y, ny, n, l, le, m, me, i, j;
            for (k = 1, ke = s.length - 1; k < ke; k++) {

                sTmp[0] = s[k - 1].gradient.laplacian.getData();
                sTmp[1] = s[k].gradient.laplacian.getData();
                sTmp[2] = s[k + 1].gradient.laplacian.getData();

                for (x = dx, nx = lx - dx, i = 1; x < nx; x += dx, i++) {
                    for (y = x + 1, ny = x + ly - 1, j = 1; y < ny; y++, j++) {
                        var p = sTmp[1][y];
                        // Recherche si le point (i, j, k) est bien maximum local
                        for (maxLocal = true, n = 0; n < 3; n++) {
                            var scale = sTmp[n];
                            for (l = y - dx, le = y + 2 * dx; l < le; l += dx) {
                                for (m = l - 1, me = l + 2; m < me; m++) {
                                    if (p < scale[m]) {
                                        maxLocal = false;
                                        l = le;
                                        n = 3;
                                        break;
                                    }
                                }
                            }
                        }

                        if (maxLocal) {
                            var key = new global.Keypoint(i, j, s[k].sigma, p);
                            key.nScale = k;
                            s.maxLap.push(key);
                        }
                    }
                }
            }
            return this;
        },
        /** Function used to precompute the Harris pyramid.
         * @chainable
         */
        precomputeHarris: function () {
            var s = this.scale;
            var w = this.image.size(1);
            var h = this.image.size(0);

            // Calcul des pyramides de gradient
            var k, ke, j;
            for (k = 1, ke = this.nScale - 1; k < ke; k++) {
                var gradient = s[k].gradient;
                gradient.xy = new Matrix([h, w], "single");
                var xyD = gradient.xy.getData();
                var xD = gradient.x.getData();
                var yD = gradient.y.getData();
                for (j = h * w; j--; j) {
                    xyD[j] = xD[j] * yD[j];
                    xD[j] *= xD[j];
                    yD[j] *= yD[j];
                }
                var std = s[k].sigma * 1.4;
                // gradient.xy = gradient.xy.fastBlur(std);
                // gradient.x  = gradient.x.fastBlur(std);
                // gradient.y  = gradient.y.fastBlur(std);
                gradient.xy = gradient.xy.gaussian(std);
                gradient.x  = gradient.x.gaussian(std);
                gradient.y  = gradient.y.gaussian(std);
            }
            return this;
        },
        /** Apply a threshold on the laplacian pyramid.
         * @param {Number} threshold
         * @chainable
         */
        laplacianThreshold: function (threshold) {
            this.lapThresh = threshold || this.lapThresh;
            threshold = this.lapThresh;

            var s = this.scale, h = this.image.size(0);

            var i, ie, siftKeyPoints = [];
            for (i = 0, ie = s.maxLap.length; i < ie; i++) {
                var key = s.maxLap[i];
                var data = s[key.nScale].gradient.laplacian.getData();
                var p = data[key.x * h + key.y];
                if (p > threshold) {
                    siftKeyPoints.push(key);
                }
            }

            this.keypoints = siftKeyPoints;

            return this;
        },
        /** Apply a threshold on the Harris pyramid.
         * @param {Number} threshold
         * @chainable
         */
        harrisThreshold: function (threshold) {
            this.harrisThresh = threshold || this.harrisThresh;
            threshold = this.harrisThresh;

            function harrisCriterion(x, y, xy, s, t) {
                return 4228250625.0 *
                    (x * y - xy * xy - 0.04 * (x + y) * (x + y)) - 0.2 * t / (s * s * s * s);
            }

            var s = this;
            var h = this.image.getSize(0);

            var i, ie, siftKeyPoints = [];
            for (i = 0, ie = s.keypoints.length; i < ie; i++) {
                var key = s.keypoints[i];
                var scale = s.scale[key.nScale];
                var x  = scale.gradient.x.getData()[key.x * h + key.y];
                var y  = scale.gradient.y.getData()[key.x * h + key.y];
                var xy = scale.gradient.xy.getData()[key.x * h + key.y];

                if (harrisCriterion(x, y, xy, scale.sigma, threshold) > 0) {
                    siftKeyPoints.push(key);
                }
            }

            this.keypoints = siftKeyPoints;

            return this;
        },
        getViewOnImagePatch: function (key, space, type, normalize) {
            var sigma = key.sigma;
            // Looking for closer blured image
            var i, ei, sMin = 0, abs = Math.abs, d, dMin = Infinity;
            for (i = 0, ei = this.nScale; i < ei; i++) {
                d = this.scale[i].sigma - sigma;
                if (abs(d) < dMin && d <= 0) {
                    dMin = abs(d);
                    sMin = i;
                }
            }
            var scale = this.scale[sMin],
                image = scale["gray"],
                grad = scale.gradient,
                channel = [];

            // Get RGB patch
            var x = key.x, y = key.y, s = Math.round(key.factorSize * sigma);
            var round = Math.round;
            var xMin = round(x - s), xMax = round(x + s);
            var yMin = round(y - s), yMax = round(y + s);

            if (xMin < 0 || yMin < 0) {
                return null;
            } else if (xMax > image.getSize(1) - 1) {
                return null;
            } else if (yMax > image.getSize(0) - 1) {
                return null;
            }
            var view = image.getView().select([yMin, yMax], [xMin, xMax]);

            if (space instanceof Object) {
                var name = space.name;
                if (scale[name] === undefined) {
                    scale[name] = {
                        image: Matrix.applycform(
                            scale["blur"], "RGB to " + name
                        )
                    };
                }
                image = scale[name].image;
                if (type === "GRADIENT") {
                    if (scale[name].gradient === undefined) {
                        scale[name].gradient = image.gradient(0, 0, 1, 1);
                        scale[name].gradientView = scale[name].gradient.norm.getView();
                    }
                    grad = scale[name].gradient;
                    view = scale[name].gradientView.restore().select(
                        [yMin, yMax], [xMin, xMax], space.channels
                    );
                } else if (type === "WEIGHTED-HISTOGRAMS") {
                    if (scale[name].colorChannels === undefined) {
                        scale[name].colorChannels = {
                            norm: image.get([], [], space.weightChannel),
                            phase: image.get([], [], space.phaseChannel)
                        };
                        scale[name].colorChannelsView = scale[name].colorChannels.norm.getView();
                    }
                    grad = scale[name].colorChannels;
                    view = scale[name].colorChannelsView.restore().select(
                        [yMin, yMax], [xMin, xMax], 0
                    );
                } else {
                    view = image.getView().select(
                        [yMin, yMax], [xMin, xMax], space.channels
                    );
                }
            }
            if (normalize === true) {
                // patch = this.normalizeColor(patch);
            }

            return {
                norm: grad.norm,
                phase: grad.phase,
                image: image,
                view: view,
            };
        },
        /** Extract the main direction(s) of all keypoint detected in
         * the scalespace.
         * @param {String} algorithm
         *  Algorithm to use.
         * @chainable
         */
        extractMainOrientations: function (algorithm) {
            this.algorithm = algorithm || this.algorithm;
            if (!this.keypoints) {
                throw new Error("ScaleSpace: Keypoints have to be computed.");
            }
            var keypoints = this.keypoints;
            var i, ei, newKeypoints = [], o, eo;
            for (i = 0, ei = keypoints.length; i < ei; i++) {
                var key = keypoints[i];
                var patch = this.getViewOnImagePatch(key, "gray");
                if (patch !== null) {
                    var orientations = key.extractMainOrientation(patch, this.algorithm);
                    for (o = 0, eo = orientations.length; o < eo; o++) {
                        var k = key.getCopy();
                        k.orientation = orientations[o];
                        newKeypoints.push(k);
                    }
                }
            }
            this.keypoints = newKeypoints;
            return this;
        },
        extractDescriptors: function (descriptors) {
            descriptors = descriptors || global.Keypoint.prototype.descriptors;

            // Descriptors memory allocation for n keypoints
            var getData = function (d, n) {
                var length =  d.nBin * d.nSector;
                var data = new Float32Array(n * length);
                var i, tab = [];
                for (i = 0; i < n; i++) {
                    tab.push(data.subarray(i * length, (i + 1) * length));
                }
                tab.data = data;
                return tab;
            };

            if (!this.keypoints) {
                throw new Error("ScaleSpace: Keypoints have to be computed.");
            }
            var keypoints = this.keypoints;
            var i, k, ek, descriptorsData = {}, name;

            for (i = 0; i < descriptors.length; i++) {
                name = descriptors[i].name;
                descriptorsData[name] = getData(descriptors[i], keypoints.length);
            }

            this.descriptorsData = descriptorsData;
            for (k = 0, ek = keypoints.length; k < ek; k++) {
                keypoints[k].descriptorsData = keypoints[k].descriptorsData || {};
            }
            for (i = 0; i < descriptors.length; i++) {
                var desc = descriptors[i],
                    name = desc.name,
                    mem = descriptorsData[name],
                    space = desc.colorspace,
                    type = desc.type;
                for (k = 0, ek = keypoints.length; k < ek; k++) {
                    var key = keypoints[k],
                        patch = this.getViewOnImagePatch(key, space, type);
                    key.descriptorsData[name] =
                        desc.extractFromPatch(
                            key.orientation, patch, mem[k]
                        );
                }
            }

            return this;
        }
    };
    global.ScaleSpace = ScaleSpace;
})(Matching);
