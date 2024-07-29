
class BellPolynomial extends Array {

	constructor(...args) {

		super(...args);

		this.partitionByFactors = new Map;

		args && args.forEach( (part, i) =>
			this.partitionByFactors.set( this.getPartitionFactorsDescr(part), i )
		);
	}


	toString() {

		var mults = this.reduce( (accum, part) => accum += (part.length - 1) / 2, 0 );

		return `[BellPolynomial terms=${this.length} mults=${mults}`
			+ (this.length < 5 ? ' |' + this.termsToStr() + ' ' : '')
			+ ']';
	}


	getPartitionFactorsDescr(part, j) {

		var str = '', addedJ;

		for (let i = 1, len = part.length; i < len; i += 2) {

			if (j && !addedJ) {

				if (part[i] === j) {
					str += `x${part[i]}^${part[i + 1] + 1}_`;
					addedJ = true;
					continue;
				}

				if (part[i] > j) {
					str += `x${j}^1_`;
					addedJ = true;
					i -= 2;
					continue;
				}
			}

			str += `x${part[i]}^${part[i + 1]}_`;
		}

		if (j && !addedJ)
			str += `x${j}^1_`;

		return str;
	}


	evaluate(array) {

		var sum = 0;

		this.forEach( part => {

			var partProduct = 1;

			for (let i = 1; i < part.length; i += 2)
				partProduct *= array[ part[i] ] ** part[i + 1];

			sum += part[0] * partProduct;
		});

		return sum;
	}


	termsToStr() {

		var str = '';

		this.forEach( (part, i) => {

			str += (i ? ' +' : '') + (part[0] > 1 ? ` ${part[0]}` : '');

			for (let i = 1; i < part.length; i += 2)
				str += ` x${part[i]}` + (part[i + 1] === 1 ? '' : `^${part[i + 1]}`);
		});

		return str;
	}


	static completeToStr(n) {

		var sum = new Array(n);

		for (let k = 1; k <= n; k++) {

			let B = this.get(n, k);

			B.forEach( part => {

				var exp = 0;

				for (let i = 1; i < part.length; i += 2)
					exp += part[i + 1];

				sum[exp] = (sum[exp] || 0) + part[0];
			});
		}

		return sum;
	}
}



Object.assign( BellPolynomial, {

	B: [
		0, // B_{0,0} = 1 (unused?)
		[ 0, new BellPolynomial([ 1, 1, 1 ]) ], // B_{1,1} = 1 x1^1
	],


	getNumTermsInRow(n) {
		return this.B[n].reduce( (accum, B) => accum += B.length, 0 );
	},


	get(n, k) {

		if ( !(n > 0 && k > 0 && k <= n) )
			return Report.warn("bad args", `n=${n} k=${k}`);

		if (!this.B[n])
			this.generate_n(n);

		return this.B[n][k];
	},


	generate_n(n) {

		if (!this.B[n - 1])
			this.generate_n(n - 1);

		var row = this.B[n] = [ 0, new BellPolynomial([ 1, n, 1 ]) ];

		for (let k = 2; k < n; k++)
			this.generate_n_k(n, k, row);

		row.push( new BellPolynomial([ 1, 1, n ]) );
	},


	generate_n_k(n, k, row) {

		var B = row[k] = new BellPolynomial;

		var multiplyXj = (part, j) => {

			for (let i = 1; i < part.length; i += 2) {

				if (part[i] === j) {
					part[i + 1] ++;
					return;
				}

				if (part[i] > j) {

					part.push(0, 0);
					part.copyWithin(i + 2, i);
					part[i] = j;
					part[i + 1] = 1;
					return;
				}
			}

			part.push(j, 1);
		};


		var addPartition = (part, bC, j) => { // multiplied by bC * x_j

			let descr = B.getPartitionFactorsDescr(part, j);
			let i = B.partitionByFactors.get(descr);

			if (i !== undefined) {

				B[i][0] += bC * part[0];
				return;
			}

			part = Array.from(part);
			multiplyXj(part, j);
			part[0] *= bC;

			i = B.push(part) - 1;
			B.partitionByFactors.set(descr, i);
		};


		for (let j = 1; j <= n - k + 1; j++) {

			let B1 = this.get(n - j, k - 1);

			let bC = Polynomial.binomial(n - 1, j - 1);

			B1.forEach( part => addPartition(part, bC, j) );
		}


		B.forEach( (part, i) => {

			var cntExp = 0, cntIndex = 0;

			for (let j = 1, len = part.length; j < len; j += 2) {

				cntExp += part[j + 1];
				cntIndex += part[j] * part[j + 1];

				if (j < len - 2 && part[j] >= part[j + 2])
					console.error("BellPolynomial 1", `n=${n},k=${k} partition#${i}`);
			}

			if (cntExp !== k || cntIndex !== n)
				console.error("BellPolynomial 2", `n=${n},k=${k} partition#${i}`
					+ ` cntExp=${cntExp} cntIndex=${cntIndex}`);

			// length: https://oeis.org/A008284
			// length = n/2(n-1)+k row in https://oeis.org/A008284/b008284.txt
		});
	},

});




export { BellPolynomial }

