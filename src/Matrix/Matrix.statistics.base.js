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

/** @class Matrix */

(function (Matrix, Matrix_prototype) {
    "use strict";

    var min = function (data, s, d, N) {
        for (var i = s + d, e = s + N, m = data[s]; i < e; i += d) {
            if (data[i] < m) {
                m = data[i];
            }
        }
        return m;
    };

    var amin = function (data, s, d, N) {
        for (var i = s + d, e = s + N, m = data[s], im = s; i < e; i += d) {
            if (data[i] < m) {
                m = data[i];
                im = i;
            }
        }
        return im;
    };

    var max = function (data, s, d, N) {
        for (var i = s + d, e = s + N, m = data[s]; i < e; i += d) {
            if (data[i] > m) {
                m = data[i];
            }
        }
        return m;
    };

    var amax = function (data, s, d, N) {
        for (var i = s + d, e = s + N, m = data[s], im = s; i < e; i += d) {
            if (data[i] > m) {
                m = data[i];
                im = i;
            }
        }
        return im;
    };

    var sum = function (data, s, d, N) {
        for (var i = s, e = s + N, m = 0; i < e; i += d) {
            m += data[i];
        }
        return m;
    };

    var mean = function (data, s, d, N) {
        for (var i = s, e = s + N, m = 0; i < e; i += d) {
            m += data[i];
        }
        return m * d / N;
    };

    var prod = function (data, s, d, N) {
        for (var i = s, e = s + N, m = 1; i < e; i += d) {
            m *= data[i];
        }
        return m;
    };

    var variance = function (data, s, d, N) {
        var mu = mean(data, s, d, N);
         for (var i = s, e = s + N, m = 0; i < e; i += d) {
            var tmp = data[i] - mu;
            m += tmp * tmp;
        }
        return m * d / (N - 1);
    };

    var varianceBiased = function (data, s, d, N) {
         return variance(data, s, d, N) * (N - 1) / N;
    };

    var cumsum = function (data, s, d, N) {
        for (var i = s + d, e = s + N; i < e; i += d) {
            data[i] += data[i - d];
        }
    };

    var cumprod = function (data, s, d, N) {
        for (var i = s + d, e = s + N; i < e; i += d) {
            data[i] *= data[i - d];
        }
    };

    var getPermutation = function (view, dim) {
        var ndims = view.ndims(), order = [dim];
        for (var i = 0; i < ndims; i++) {
            if (i !== dim) {
                order.push(i);
            }
        }
        return order;
    };

    var applyDim = function (mat, fun, dim, inplace, output) {

        // Do the function fun return a number or act in place ?
        inplace = inplace || false;

        // Check parameter dim
        if (!Tools.isSet(dim)) {
            if (inplace) {
                fun(mat.getData(), 0, 1, mat.numel());
                return mat;
            }
            var v = fun(mat.getCopy().getData(), 0, 1, mat.numel());
            return Matrix.toMatrix(v);
        }

        if (!Tools.isInteger(dim, 0)) {
            throw new Error('Matrix.applyDim: Invalid dimension.');
        }

        var view = mat.getView(), order = getPermutation(view, dim);
        view.permute(order);

        // Input Matrix and data
        var id = mat.getData(), iterator = view.getIterator(1);
        var it = iterator.iterator, b = iterator.begin, e = iterator.isEnd;
        var d = view.getStep(0), l = view.getEnd(0);
        var i, io;
        if (!inplace) {
            // Output size and data
            var sizeOut = mat.getSize();
            sizeOut[dim] = 1;
            var om = new Matrix(sizeOut, output), od = new om.getData();
            for (i = b(), io = 0; !e(); i = it(), io++) {
                od[io] = fun(id, i, d, l);
            }
            return om;
        }
        if (output !== undefined) {
            mat = output;
            output = output.getData();
        }
        for (i = b(); !e(); i = it()) {
            fun(id, i, d, l, output);
        }
        return mat;
    };

    /** Return the argmin of a matrix.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the global argmin.
     * @return {Matrix}
     */
    Matrix_prototype.amin = function (dim) {
        var mat = this.isreal() ? this : Matrix.abs(this);
        return applyDim(mat, amin, dim, undefined, 'uint32');
    };
    /** Return the minimum of a matrix.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the global minimum.
     * @return {Matrix}
     */
    Matrix_prototype.min = function (dim) {
        if (this.isreal()) {
            return applyDim(this, min, dim);
        }
        return this.get(this.amin(dim));
    };
    /** Return the argmax of a matrix.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the global argmax.
     * @return {Matrix}
     */
    Matrix_prototype.amax = function (dim) {
        var mat = this.isreal() ? this : Matrix.abs(this);
        return applyDim(mat, amax, dim, undefined, 'uint32');
    };
    /** Return the maximum of a matrix.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the global maximum.
     * @return {Matrix}
     */
    Matrix_prototype.max = function (dim) {
        if (this.isreal()) {
            return applyDim(this, max, dim);
        }
        return this.get(this.amax(dim));
    };
    /** Return the sum of the matrix elements.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the global sum.
     * @return {Matrix}
     */
    Matrix_prototype.sum = function (dim) {
        if (this.isreal()) {
            return applyDim(this, sum, dim);
        }
        var size = this.getSize();
        return Matrix.complex(
            applyDim(new Matrix(size, this.getRealData()), sum, dim),
            applyDim(new Matrix(size, this.getImagData()), sum, dim)
        );
    };
    /** Return the product of the matrix elements.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the product of all the matrix elements.
     * @return {Matrix}
     */
    Matrix_prototype.prod = function (dim) {
        if (this.isreal) {
            return applyDim(this, prod, dim);
        }
        throw new Error("Matrix.prod: Is not yet implement for complex values.");
    };
    /** Return the average value of the matrix elements.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the average value of all the elements.
     * @return {Matrix}
     */
    Matrix_prototype.mean = function (dim) {
        if (this.isreal()) {
            return applyDim(this, mean, dim);
        }
        var size = this.getSize();
        return Matrix.complex(
            applyDim(new Matrix(size, this.getRealData()), mean, dim),
            applyDim(new Matrix(size, this.getImagData()), mean, dim)
        );
    };
    /** Return the variance of the matrix elements.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the variance of all the elements.
     * @param {Number} [norm=false]
     *  If false, use the non biased variance estimator (N - 1), and the
     *  biased one otherwise.
     * @return {Matrix}
     */
    Matrix_prototype.variance = function (dim, norm) {
        switch (typeof norm) {
        case 'undefined':
            norm = -1;
            break;
        case 'boolean':
            norm = (norm === false) ? -1 : 0;
            break;
        case 'number':
            if (norm === 0) {
                norm = -1;
            } else if (norm === 1) {
                norm = 0;
            } else {
                throw new Error('Matrix.variance: Invalid argument.');
            }
            break;
        default:
            throw new Error('Matrix.variance: Invalid argument.');
        }
        if (!this.isreal()) {
            throw new Error("Matrix.variance: Is not yet implement for complex values.");
        }

        if (norm === -1) {
            return applyDim(this, variance, dim);
        }
        return applyDim(this, varianceBiased, dim);
    };
    /** Return the standard deviation of the matrix elements.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the standard deviation of all the elements.
     * @param {Number} [norm=false]
     *  If false, use the non biased standard deviation estimator (N - 1),
     * and the biased one otherwise.
     * @return {Matrix}
     */
    Matrix_prototype.std = function (norm, dim) {
        if (!this.isreal()) {
            throw new Error("Matrix.std: Is not yet implement for complex values.");
        }
        var v = this.variance(norm, dim);
        if (typeof v === 'number') {
            return Math.sqrt(v);
        }
        return v.arrayfun(Math.sqrt);
    };
    /** Return the cumulative sum of the matrix elements.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the cumulative sum of all the elements.
     * @return {Matrix}
     */
    Matrix_prototype.cumsum = function (dim) {
        var fun = cumsum;
        if (this.isreal()) {
            return applyDim(this, fun, dim, true);
        }
        var size = this.getSize();
        return Matrix.complex(
            applyDim(new Matrix(size, this.getRealData()), fun, dim, true),
            applyDim(new Matrix(size, this.getImagData()), fun, dim, true)
        );
    };
    /** Return the cumulative product of the matrix elements.
     * @param {Number} [dim=undefined]
     *  Dimension on which the computation must be performed. If undefined,
     *  return the cumulative product of all the elements.
     * @return {Matrix}
     */
    Matrix_prototype.cumprod = function (dim) {
        if (!this.isreal()) {
            throw new Error("Matrix.cumprod: Is not yet implemented for complex values.");
        }
        return applyDim(this, cumprod, dim, true);
    };

    (function () {
        // Tempplate function
        var template = function (dataIn1, sI1, dI1, NI1, dataIn2, sI2, dI2, NI2, dataOut, sO, dO, NO) {
            for (var i1 = sI1 + dI1, e = sI1 + NI1, i2 = sI2 + dI2, o = sO; i1 < e; i1 += dI1, i2 += dI2, o += dO) {
                dataOut[o] = dataIn1[i1] - dataIn2[i2];
            }
        };
        var cov = function (dataIn1, sI1, dI1, NI1, mu1, dataIn2, sI2, dI2, NI2, mu2) {
            for (var i1 = sI1, e = sI1 + NI1, i2 = sI2, m = 0; i1 < e; i1 += dI1, i2 += dI2) {
                m += (dataIn1[i1] - mu1) * (dataIn2[i2] - mu2);
            }
            return m * dI1 / (NI1 - 1);
        };
        var corrcoef = function (dataIn1, sI1, dI1, NI1, mu1, sig1, dataIn2, sI2, dI2, NI2, mu2, sig2) {
            for (var i1 = sI1, e = sI1 + NI1, i2 = sI2, m = 0; i1 < e; i1 += dI1, i2 += dI2) {
                m += (dataIn1[i1] - mu1) * (dataIn2[i2] - mu2);
            }
            return m * dI1 / ((NI1 - 1) * sig1 * sig2);
        };
        /** Compute the covariance matrix.
         *
         * @param {Matrix} B
         *  Compute covariance between this matrix and B.
         *
         * @todo This function should be able to deal with complex
         * @matlike
         * @method cov
         */
        Matrix_prototype.cov = function (B) {
            if (!this.isreal()) {
                throw new Error("Matrix.cov: Is not yet implement for complex values.");
            }
            var d1 = this.getData(),
                mu1 = this.mean(0).getData(),
                d2, mu2;
            if (B === undefined) {
                d2 = d1;
                mu2 = mu1;
            } else if (B instanceof Matrix) {
                if (!Tools.checkSizeEquals(this.size(), B.size())) {
                    throw new Error("Matrix.cov: Input sizes must match.");
                }
                d2 = B.getData();
                mu2 = B.mean(0).getData();
            } else {
                throw new Error("Matrix.cov: Inputs must be instance of Matrix.");
            }
            if (!this.ismatrix()) {
                throw new Error("Matrix.cov: Inputs must be a 2D matrices.");
            }

            var ny = this.size(0),
                nx = this.size(1);
            var om = Matrix.zeros(nx),
                od = om.getData();
            if (B === undefined) {
                for (var x1 = 0, j = 0, jj = 0; j < nx; x1 += ny, j++, jj += nx + 1) {
                    od[jj] = cov(d1, x1, 1, ny, mu1[j], d2, x1, 1, ny, mu2[j]);
                    for (var x2 = x1 + ny, j2 = j + 1, ij = j + j2 * nx, ji = j2 + j * nx; j2 < nx; x2 += ny, ij += nx, j2++, ji++) {
                        od[ij] = cov(d1, x1, 1, ny, mu1[j], d2, x2, 1, ny, mu2[j2]);
                        od[ji] = od[ij];
                    }
                }
            } else if (B instanceof Matrix) {
                for (var x1 = 0, j = 0; j < nx; x1 += ny, j++) {
                    for (var x2 = 0, j2 = 0, ij = j + j2 * nx; j2 < nx; x2 += ny, ij += nx, j2++) {
                        od[ij] = cov(d1, x1, 1, ny, mu1[j], d2, x2, 1, ny, mu2[j2]);
                    }
                }
            }
            return om;
        };
        Matrix.cov = function (A, B) {
            return Matrix.toMatrix(A).cov(B);
        };
        /** Compute the correlation coefficients.
         *
         * @param {Matrix} B
         *  Compute correlation coefficients between this matrix and B.
         *
         * @todo This function should be able to deal with complex
         * @matlike
         * @method cov
         */
        Matrix_prototype.corrcoef = function (B) {
            var d1 = this.getData(),
                mu1 = this.mean(0).getData(),
                sig1 = this.std(0).getData(),
                d2, mu2, sig2;
            if (B === undefined) {
                d2 = d1;
                mu2 = mu1;
                sig2 = sig1;
            } else if (B instanceof Matrix) {
                if (!Tools.checkSizeEquals(this.size(), B.size())) {
                    throw new Error("Matrix.corrcoef: Input sizes must match.");
                }
                d2 = B.getData();
                mu2 = B.mean(0).getData();
                sig2 = B.std(0).getData();
            } else {
                throw new Error("Matrix.corrcoef: Inputs must be instance of Matrix.");
            }
            if (!this.ismatrix()) {
                throw new Error("Matrix.corrcoef: Inputs must be a 2D matrices.");
            }

            var ny = this.size(0),
                nx = this.size(1);
            var om = Matrix.zeros(nx),
                od = om.getData();
            if (B === undefined) {
                for (var x1 = 0, j = 0, jj = 0; j < nx; x1 += ny, j++, jj += nx + 1) {
                    od[jj] = corrcoef(d1, x1, 1, ny, mu1[j], sig1[j], d2, x1, 1, ny, mu2[j], sig2[j]);
                    for (var x2 = x1 + ny, j2 = j + 1, ij = j + j2 * nx, ji = j2 + j * nx; j2 < nx; x2 += ny, ij += nx, j2++, ji++) {
                        od[ij] = corrcoef(d1, x1, 1, ny, mu1[j], sig1[j], d2, x2, 1, ny, mu2[j2], sig2[j2]);
                        od[ji] = od[ij];
                    }
                }
            } else if (B instanceof Matrix) {
                for (var x1 = 0, j = 0; j < nx; x1 += ny, j++) {
                    for (var x2 = 0, j2 = 0, ij = j + j2 * nx; j2 < nx; x2 += ny, ij += nx, j2++) {
                        od[ij] = corrcoef(d1, x1, 1, ny, mu1[j], sig1[j], d2, x2, 1, ny, mu2[j2], sig2[j2]);
                    }
                }
            }
            return om;
        };
        Matrix.corrcoef = function (A, B) {
            return Matrix.toMatrix(A).corrcoef(B);
        };

        var diff = function (dataIn, sI, dI, NI, dataOut, sO, dO) {
            for (var i = sI + dI, e = sI + NI, m = 0, o = sO; i < e; i += dI, o += dO) {
                dataOut[o] = dataIn[i] - dataIn[i - 1];
            }
        };
        // Matrix_prototype.diff = function (n) {
        // };
        // Matrix.diff = function (A, n) {
        //    return A.diff(n);
        // };
    })();
    (function () {
        var poissrnd_lambda = function (data, lambda) {
            var L = Math.exp(-lambda), random = Math.random;
            for (var i = 0, ie = data.length; i < ie; i++) {
                var p = 1, k = 0;
                do {
                    k++;
                    p *= random();
                } while (p > L);
                data[i] = k - 1;
            }
        };

        var poissrnd_lambdas = function (lambda) {
            var exp = Math.exp, random = Math.random;
            for (var i = 0, ie = lambda.length; i < ie; i++) {
                var p = 1, k = 0, L = exp(-lambda[i]);
                do {
                    k++;
                    p *= random();
                } while (p > L);
                lambda[i] = k - 1;
            }
        };

        var exprnd = function (data, mu) {
            mu = -mu;
            var random = Math.random, log = Math.log;
            for (var i = 0, ie = data.length; i < ie; ++i) {
                data[i] = mu * log(random());
            }
        };

        /** Generate Poisson random numbers.
         *
         * The `lambda` parameter can a number as well as a Matrix.
         * - If it is a number then the function returns an array of
         * dimension `size`.
         * - If `lambda` is a Matrix then the function will return
         * a Matrix of the same size.
         *
         * Note that to avoid copy, you can use the syntax `mat.poissrnd()`.
         *
         * @param {Number} lambda
         * @param {Number} [size]
         * @return {Matrix}
         * @matlike
         */
        Matrix.poissrnd = function () {
            var lambda = Array.prototype.shift.apply(arguments);
            if (typeof(lambda) === "number") {
                var size = Tools.checkSize(arguments, 'square');
                var mat = new Matrix(size), data = mat.getData();
                poissrnd_lambda(data, lambda);
                return mat;
            }
            if (lambda instanceof Matrix) {
                return lambda.getCopy().poissrnd();
            }
        };
        Matrix_prototype.poissrnd = function() {
            poissrnd_lambdas(this.getData());
            return this;
        };
        /** Generate exponentially distributed random numbers.
         * @param {Number} mu
         * @param {Number} size
         * @return {Matrix}
         * @matlike
         */
        Matrix.exprnd = function () {
            var mu = Array.prototype.shift.apply(arguments);
            var size = Tools.checkSize(arguments, 'square');

            var mat = new Matrix(size), data = mat.getData();
            exprnd(data, mu);
            return mat;
        };

        /** Generate random permutations of integers from 0 to n - 1.
         * @param {n} n
         *  Output size
         * @param {k} k
         *  return only k unique integer between 0 and n - 1;
         * @return {Matrix}
         */
        Matrix.randperm = function (n, k) {
            var out = Matrix.zeros(n, 1, "uint32"), od = out.getData();
            for (var i = 0; i < n; i++) {
                od[i] = i;
            }
            var random = Math.random, round = Math.round;
            for (var i = 0; i < n - 1; i++) {
                var j = round(random() * (n - i - 1));
                var tmp = od[i + j];
                od[i + j] = od[i];
                od[i] = tmp;
            }
            if (k !== undefined) {
                return out.get([0, k - 1]);
            }
            return out;
        };
    })();

    (function () {
        var tab, itab, fun;
        var asortAscend = function (a, b) {
            return tab[a] - tab[b];
        };
        var asortDescend = function (a, b) {
            return tab[b] - tab[a];
        };
        var sortAscend = function (a, b) {
            return a - b;
        };
        var sortDescend = function (a, b) {
            return b - a;
        };

        var sort = function (data, s, d, N) {
            var i, io, e;
            if (d === 1) {
                Array.prototype.sort.call(data.subarray(s, s + N), fun);
                return;
            }
            for (i = s, io = 0, e = s + N; i < e; i += d, io++) {
                tab[io] = data[i];
            }
            Array.prototype.sort.call(tab, fun);
            for (i = s, io = 0, e = s + N; i < e; i += d, io++) {
                data[i] = tab[io];
            }
        };
        var asort = function (data, s, d, N, out) {
            var i, io, e;
            for (i = s, io = 0, e = s + N; i < e; i += d, io++) {
                tab[io] = data[i];
                itab[io] = io;
            }
            Array.prototype.sort.call(itab, fun);
            for (i = s, io = 0, e = s + N; i < e; i += d, io++) {
                out[i] = itab[io] * d + s;
            }
        };
        var median = function (data, s, d, N) {
            var i, io, e, tab2;
            if (d === 1) {
                tab2 = data.subarray(s, s + N);
            } else {
                for (i = s, io = 0, e = s + N; i < e; i += d, io++) {
                    tab[io] = data[i];
                }
                tab2 = tab;
            }
            Array.prototype.sort.call(tab2, fun);
            var indice = Math.floor(tab.length / 2);
            return tab2.length % 2 === 0 ? 0.5 * (tab2[indice] + tab2[indice - 1]) : tab2[indice];
        };

        /** Sort the elements of the matrix.
         * @param {Number} [dim=undefined]
         *  Dimension on which the computation must be performed. If undefined,
         *  return all the elements sorted.
         * @param {String} [mode="ascend"]
         *  Sorting by increasing values ("ascend") or decreasing values ("descend")
         * @chainable
         */
        Matrix_prototype.sort = function (dim, mode) {
            var size = typeof dim === "number" ? this.getSize(dim) : this.numel();
            tab = new Float64Array(size);
            if (mode === "ascend") {
                fun = sortAscend;
            } else if (mode === "descend") {
                fun = sortDescend;
            } else {
                throw new Error("Matrix.sort: Wrong mode selection");
            }
            return applyDim(this, sort, dim, true);
        };

        Matrix.sort = function (m, dim, mode) {
            return m.getCopy().sort(dim, mode);
        };

        /** Compute the argsort of the elements of the matrix.
         * @param {Number} [dim=undefined]
         *  Dimension on which the computation must be performed. If undefined,
         *  return the global argsort.
         * @param {String} [mode="ascend"]
         *  Sorting by increasing values ("ascend") or decreasing values ("descend")
         * @return {Matrix}
         */
        Matrix_prototype.asort = function (dim, mode) {
            var size = typeof dim === "number" ? this.getSize(dim) : this.numel();
            tab = new Float64Array(size);
            itab = new Uint32Array(size);
            if (mode === "ascend") {
                fun = asortAscend;
            } else if (mode === "descend") {
                fun = asortDescend;
            } else {
                throw new Error("Matrix.sort: Wrong mode selection");
            }
            var out = new Matrix(this.getSize(), "uint32");
            return applyDim(this, asort, dim, true, out);
       };

        Matrix.asort = function (m, dim, mode) {
            return m.getCopy().asort(dim, mode);
        };

        /** Return the median value.
         * @param {Number} [dim=undefined]
         *  Dimension on which the computation must be performed. If undefined,
         *  return all the elements sorted.
         * @chainable
         */
        Matrix_prototype.med = function (dim) {
            var size = typeof dim === "number" ? this.getSize(dim) : this.numel();
            tab = new Float64Array(size);
            fun = sortAscend;
            return applyDim(this, median, dim);
        };

        Matrix.med = function (m, dim, mode) {
            return m.getCopy().med(dim);
        };
    })();

    /** Return unique values in a matrix.
     * @return {Matrix}
     */
    Matrix_prototype.unique = function () {
        var sorted = this.getCopy().reshape().sort(0, "ascend"), sd = sorted.getData();
        var od = new Matrix.dataType(sd.length);
        od[0] = sd[0];
        for (var i = 1, ie = sd.length, j = 1; i < ie; i++) {
            if (sd[i - 1] < sd[i]) {
                od[j++] = sd[i];
            }
        }
        return new Matrix.toMatrix(od.subarray(0, j));
    };
    Matrix.unique = function(A) {
        return A.unique();
    }

    /** Return unique values in the union of two matrices.
     * @param {Matrix} A
     * @param {Matrix} B
     * @return {Matrix}
     */
    Matrix.union = function (A, B) {
        return Matrix.cat(0, A.unique(), B.unique()).unique();
    };
    Matrix_prototype.union = function (B) {
        return Matrix.union(this, B);
    };

    /** Accumate values in an array
     * @param {Array} subs
     *  Array of integers indicating subscript positions
     * @param {Array} val
     *  Values to be accumulated.
     * @param {Array} [size]
     *  Size of the output Array. Default is subs.max() + 1
     * @return {Matrix}
     */
    Matrix.accumarray = function (subs, val, size) {

        subs = Matrix.toMatrix(subs);
        if (!subs.isreal()) {
            throw new Error("Matrix.accumarray: Is not yet implement for complex values.");
        }
        // Check subs for array of positive integers
        if (!Tools.isArrayOfIntegers(subs.getData(), 0)) {
            throw new Error('Matrix.accumarray: Subs should be an array of positive integers.');
        }

        var max = subs.max(0).getData();
        var k, ek, steps = [1];
        if (Tools.isSet(size)) {
            for (k = 0, ek = max.length; k < ek; k++) {
                if (size[k] < max[k] + 1) {
                    throw new Error('Matrix.accumarray: Size and Subs values are unconsistent.');
                }
            }
        } else {
            size = [];
            for (k = 0, ek = max.length; k < ek; k++) {
                size[k] = max[k] + 1;
            }
        }
        for (k = 0, ek = size.length - 1; k < ek; k++) {
            steps[k + 1] = steps[k] * size[k];
        }

        if (subs.ndims() > 2) {
            throw new Error("Matrix.accumarray: Subs must be a 2D Array.");
        }

        // Scaning the from the second dimension (dim = 1)
        var sd = subs.getData(), N = subs.numel(), ni = subs.getSize(0);
        var i, j, _j, ij, s;

        var ind = new Uint32Array(ni);
        for (j = 0, _j = 0; _j < N; j++, _j += ni) {
            for (i = 0, ij = _j, s = steps[j]; i < ni; i++, ij++) {
                ind[i] += sd[ij] * s;
            }
        }

        if (val instanceof Matrix) {
            val = val.getData();
        }
        var out = new Matrix(size), od = out.getData();
        if (Tools.isArrayLike(val) && val.length === ind.length) {
            for (k = 0, ek = ind.length; k < ek; k++) {
                od[ind[k]] += val[k];
            }
        } else if (typeof val === "number") {
            for (k = 0, ek = ind.length; k < ek; k++) {
                od[ind[k]] += val;
            }
        } else {
            throw new Error("Matrix.accumarray: Wrong val argument.");
        }
        return out;
    };

})(Matrix, Matrix.prototype);
