
class Matrix extends Array {

	constructor(rows = 0, cols = 0) {

		super(rows * cols).fill(0);

		this.rows = rows;
		this.cols = cols;
	}


	toString() { return `[ Matrix rows,cols: ${this.rows} x ${this.cols} ]` }

	clear() { return super.fill(0) }


	get(i, j) { return this[ i * this.cols + j ] }

	set(i, j, value) { this[ i * this.cols + j ] = value }


	setRow(i, ...args) {

		if (args.length > this.cols)
			Report.warn("excess values", `len=${args.length} cols=${this.cols}`);

		for (let j = 0, cnt = Math.min(args.length, this.cols); j < cnt; j++)
			this.set(i, j, args[j]);
	}


	clone() {

		var matrix = new Matrix(this.cols, this.rows);

		this.forEach( (el, i) => matrix[i] = el );

		return matrix;
	}


	print() {

		for (let i = 0; i < this.rows; i++) {

			let str = '';

			for (let j = 0; j < this.cols; j++)
				str += this.get(i, j) + '  ';

			console.log(str);
		}
	}


	swapRows(i1, i2) {

		if (i1 === i2)
			return;

		for (let j = 0; j < this.cols; j++) {

			let tmp = this.get(i1, j);
			this.set(i1, j, this.get(i2, j));
			this.set(i2, j, tmp);
		}
	}


	forwardEliminate() { // -> to upper triangular (row echelon) form

		var EPSILON = 0;//1e-14;

		var processPivot = j => {

			// I. Swap rows ("Partial Pivoting")

			var	maxAbsVal = 0, maxValRow = j;

			for (let i = j; i < this.rows; i++) {

				let val = Math.abs( this.get(i, j) );

				if (val > maxAbsVal) {
					maxAbsVal = val;
					maxValRow = i;
				}
			}

			if (maxAbsVal <= EPSILON)
				return;

			this.swapRows(j, maxValRow);

			// II. Forward elimination

			var	pivot = this.get(j, j); // console.assert(Math.abs(pivot) === maxAbsVal);

			for (let i = j + 1; i < this.rows; i++) {

				let f = this.get(i, j) / pivot;

				this.set(i, j, 0);

				for (let k = j + 1; k < this.cols; k++)
					this.set( i, k, this.get(i, k) - f * this.get(j, k) );
			}

			return true;
		};
 

		for (let i = 0; i < this.rows - 1; i++)
			if ( !processPivot(i) )
				return;

		return true;
	}


	backSubstitute(result = Matrix._backSubstitute_result) {

		if (result.length > this.rows)
			result.length = this.rows;
			
		for (let i = this.rows - 1; i >= 0; i--) {

			let x = this.get(i, this.cols - 1);

			for (let j = i + 1; j < this.cols - 1; j++)
				x -= this.get(i, j) * result[j];

			result[i] = x / this.get(i, i);
		}

		return result;
	}


	gaussianEliminate(result) {

		if ( !(this.rows + 1 === this.cols) )
			return Report.warn("wrong dimensions", `${this}`);

		if (this[0] instanceof ComplexNumber)
			return this.gaussianEliminateComplex(result);

		if ( !this.forwardEliminate() )
			return;

		return this.backSubstitute(result);
	}


	gaussianEliminateComplex(result) {

		console.error(`not impl.`);
	}

}



Object.assign( Matrix, {

	_backSubstitute_result: [],
});



export { Matrix }

