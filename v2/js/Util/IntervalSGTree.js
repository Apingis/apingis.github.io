
class IntervalSGTree { // "Augmented Interval Tree"

	constructor(alpha = 0.7) {

		this.root = null;
		this.size = 0; // number of data items (incl. duplicates)
		// number of intervals w/ unique .min (all duplicates count as 1 interval)
		this.numNodes = 0;
		this.numNodesMax = 0;

		var alphaClamped = Math.max(0.55, Math.min(0.9, alpha)) || 0.7;
		if (alphaClamped != alpha)
			Report.warn("bad alpha", `${alpha}, set to ${alphaClamped}`);

		this.alpha = alphaClamped;
		this.factorAlpha = 1 / Math.log(1 / alphaClamped);

		this.scapegoat = {

			exists: false,
			node: null,
			parent: null,

			clear() {
				this.exists = false;
				this.node = null;
				this.parent = null;
			}
		};
	}


/*
	all() {
		var result = [];
		var node = this.root;
		var stack = IntervalSGTree._stack;

		while (1) {

			while (node !== null) {
				stack.push(node);
				node = node.left;
			}

			if (stack.length === 0)
				return result;

			node = stack.pop();

			if (node.isDupContainer())
				Array.prototype.push.apply(result, node.data);
			else
				result.push(node);

			node = node.right;
		}
	}
*/

	clear() {

		this.root = null;
		this.size = 0;
		this.numNodes = 0;
		this.numNodesMax = 0;
		this.scapegoat.clear();

		return this;
	}


	all() { return this.search(-Infinity, Infinity); }


	search(min, max) {

		var result = [];
		this.traverse(min, max, data => result.push(data));
		return result;
	}


	filter(fn) {

		var result = [];
		this.forEach(data => fn(data) && result.push(data));
		return result;
	}


	//
	// Executes callback on objects sorted by min value.
	// If 2 min values are equal then order is not defined.
	//
	forEach(fn, node = this.root) {

		if (!node)
			return;

		if (node.left)
			this.forEach(fn, node.left);

		if (node.isDupContainer()) {
			for (let i = 0; i < node.data.length; i++)
				fn(node.data[i].data);
		} else
			fn(node.data);

		if (node.right)
			this.forEach(fn, node.right);
	}


	traverse(min, max, fn, skipData, ifEvery, node = this.root) {

		if (!node || node.treeMax < min)
			return true;

		if (node.left) {
			let result = this.traverse(min, max, fn, skipData, ifEvery, node.left);
			if (ifEvery === true && result === false)
				return false;
		}

		if (node.min <= max && node.max >= min) {

			if (node.isDupContainer()) {

				for (let i = 0; i < node.data.length; i++) {

					let subNode = node.data[i];

					//if (subNode.min <= max // all are equal
					if (subNode.max >= min && subNode.data !== skipData) {

						let result = fn(subNode.data);
						if (ifEvery === true && !result)
							return false;
					}
				}

			} else if (node.data !== skipData) {

				let result = fn(node.data);
				if (ifEvery === true && !result)
					return false;
			}
		}

		if (node.right && max > node.min) { // strict ineq: node.right.min > node.min

			let result = this.traverse(min, max, fn, skipData, ifEvery, node.right);
			if (ifEvery === true && result === false)
				return false;
		}

		return true;
	}


	insert(min, max, data) {
		this.insertNode( new IntervalSGTree.Node(min, max, data) );
	}


	insertNode(nodeToAdd) {

		if (!this.root) {
			this._insertRoot(nodeToAdd);
			return;
		}

		this.size ++; // insert is always successful. numNodes updated only if not a dup.
		this._insertNode(this.root, nodeToAdd, 0, null);

		if (!this.scapegoat.exists)
			return;

		if (this.scapegoat.node) {

			this._rebuild(this.scapegoat.node, this.scapegoat.parent);

		} else {
			Report.warn("no scapegoat", `numNodes=${this.numNodes}`
				+ ` alpha=${Math.log(this.numNodes) * this.factorAlpha + 1}`);
		}

		this.scapegoat.clear();
	}


	_insertRoot(nodeToAdd) {
		this.root = nodeToAdd;
		this.size = 1;
		this.numNodes = 1;
		this.numNodesMax = 1;
	}


	_insertNode(node, nodeToAdd, depth, parent) {

		depth ++; // now 1 level below node

		if (nodeToAdd.max > node.treeMax)
			node.treeMax = nodeToAdd.max;

		var target, sibling;
		var subtreeSize;

		var cmp = nodeToAdd.min - node.min;
		if (cmp < 0) {

			target = node.left;
			sibling = node.right;

			if (node.left === null)
				node.left = nodeToAdd;

		} else if (cmp > 0) {

			target = node.right;
			sibling = node.left;

			if (node.right === null)
				node.right = nodeToAdd;

		} else {
			this._insertDuplicate(node, nodeToAdd, parent);
			return true;
		}

		if (target)
			subtreeSize = this._insertNode(target, nodeToAdd, depth, node);
		else
			subtreeSize = this._insertionAccountAndCheckBalance(depth) ? true : 1;

		if (subtreeSize === true) // Skip balance checks
			return true;

		// TODO consider:
		// - additionally (or primarily) check alpha-height

		var nodeSize = depth === 1 ? this.size // don't call subtreeSize on root
			: 1 + subtreeSize + this._subtreeSize(sibling);

		if (subtreeSize > this.alpha * nodeSize) { // alpha-weight-balance not met

			this.scapegoat.node = node;

		} else if (this.scapegoat.node) {

			this.scapegoat.parent = node;
			return true; // stop further balance checks
		}

		return nodeSize;
	}

	// Set vars reflecting insertion and alpha-height-balance.
	// Return true if balance is met, false otherwise.
	_insertionAccountAndCheckBalance(depth) {

		this.numNodes ++;
		this.numNodesMax = Math.max(this.numNodesMax, this.numNodes);

		if (depth > Math.log(this.numNodes) * this.factorAlpha + 1) {

			this.scapegoat.exists = true;
			return false;
		}

		return true;
	}


	_subtreeSize(node) {

		if (!node)
			return 0;

		var size = 1;

		if (node.left)
			size += this._subtreeSize(node.left);
		if (node.right)
			size += this._subtreeSize(node.right);

		return size;
	}


	forceRebuild() { this._rebuild(this.root, null); }


	_rebuild(subtreeRoot, parent) {

		var array = IntervalSGTree._rebuildArray;

		this._toArray(subtreeRoot, array, 0);

		var newSubtreeRoot = this._buildFromArray(array, 0, array.length);
		array.length = 0;

		this._reParent(parent, subtreeRoot, newSubtreeRoot);

		if (!parent)
			this.numNodesMax = this.numNodes;
	}


	_toArray(node, array, i) {

		if (node.left)
			i = this._toArray(node.left, array, i);

		array[i++] = node;

		if (node.right)
			i = this._toArray(node.right, array, i);

		return i;
	}


	_buildFromArray(array, i, count) {

		var cntLeft = Math.floor(count / 2),
			cntRight = count - cntLeft - 1;

		// Now array[i + cntLeft] becomes the root
		// of the new subtree array[i],...,array[i + count - 1]
		var node = array[i + cntLeft];
		var treeMax = node.max;

		if (cntLeft > 0) {
			node.left = this._buildFromArray(array, i, cntLeft);
			treeMax = Math.max(treeMax, node.left.treeMax);
		} else
			node.left = null;

		if (cntRight > 0) {
			node.right = this._buildFromArray(array, i + cntLeft + 1, cntRight);
			treeMax = Math.max(treeMax, node.right.treeMax);
		} else
			node.right = null;

		node.treeMax = treeMax;
		return node;
	}


	has(min, data) {

		var node = this.root;

		while (node !== null) {

			let cmp = min - node.min;

			if (cmp < 0)
				node = node.left;
			else if (cmp > 0)
				node = node.right;
			else
				return this._hasEqualData(node, data);
		}

		return false;
	}


	_hasEqualData(node, data) {

		return node.isDupContainer()
			? node.data.some(node => node.data === data)
			: node.data === data;
	}


	// For duplicates separate Node is created, duplicate nodes stored in .data[].
	// Node's .max is set to max(...dups).
	_insertDuplicate(node, nodeToAdd, parent) {

		var dupContainer = node.isDupContainer()
				? node : this._createDupContainer(node, parent);

		dupContainer.data.push(nodeToAdd);
		dupContainer.max = Math.max(node.max, nodeToAdd.max); //.treeMax already set by the caller
	}


	// occupy 1 node's location in the tree for all duplicate nodes.
	_createDupContainer(node, parent) {

		var data = [ node ];
		data.isIntervalSGTree_DupContainer = true;

		var dupContainer = new IntervalSGTree.Node(node.min, node.max, data);

		dupContainer.copyTreeConnections(node);
		node.resetTreeConnections();

		this._reParent(parent, node, dupContainer);

		return dupContainer;
	}


	// Alternatively .has() is performed 1st, IntervalSGTree.Node object obtained
	// for argument to .removeNode() (support for this can be added if required)
	remove(min, data) {

		var node = IntervalSGTree._tmpRemoveNode
			|| (IntervalSGTree._tmpRemoveNode = new IntervalSGTree.Node);

		node.min = min;
		node.data = data;

		var removedNode = this.removeNode(node);
		node.data = null; // cleanup ref.

		return !!removedNode;
	}


	//
	// Return removed node on success or undefined if it does not exist.
	//
	// * nodeToRemove is uniquely identified by .min and .data.
	//
	// * Tree may contain several object with same .min and .data,
	// in such case order of removal is not defined.
	//
	// * Returned is exactly the object that was removed from the tree.
	//
	removeNode(nodeToRemove) {

		var removedNode = this._removeNode(this.root, nodeToRemove, null);

		if (removedNode)
			this.size --; // numNodes gets updated where it's removed from tree

		return removedNode;
	}


	_removeNode(node, nodeToRemove, parent) {

		if (!node)
			return;

		var target;
		var cmp = nodeToRemove.min - node.min;

		if (cmp < 0)
			target = node.left;
		else if (cmp > 0)
			target = node.right;
		else
			return this._doRemoveNode(node, nodeToRemove, parent);

		var removedNode = this._removeNode(target, nodeToRemove, node);

		if (removedNode && node.treeMax === removedNode.max)
			node.updateTreeMax();

		return removedNode;
	}


	_doRemoveNode(node, nodeToRemove, parent) {

		if (node.isDupContainer())
			return this._removeDuplicate(node, nodeToRemove, parent);

		if (node.data !== nodeToRemove.data)
			return;

		// Operating on the node in the tree,
		// which is the same or equal to given nodeToRemove.
		this._removeFromTree(node, parent);

		this._deletionAccountAndPossibleRestructure();

		return node;
	}


	_deletionAccountAndPossibleRestructure() {

		this.numNodes --;

		// A reasonable condition
		var conditionNumNodes = 0.5 * this.numNodesMax;

		if (this.numNodes < conditionNumNodes && this.numNodes > 5) {
			this._rebuild(this.root, null);
		}
	}


	// Remove given node from the tree.
	// Replacement node (if not null) has .treeMax updated.
	_removeFromTree(node, parent) {

		var replacement;

		if (node.left === null) {
			replacement = node.right;

		} else if (node.right === null) {
			replacement = node.left;

		// Node has both left and right. Replacing node w/ in-order predecessor
		// (incl. the case where the predecessor is a dupContainer).
		} else if (node.left.right === null) {

			replacement = node.left;
			replacement.right = node.right;
			replacement.treeMax = Math.max(replacement.treeMax, node.right.treeMax);

		// In-order predecessor is not directly connected.
		} else {
			replacement = this._removeRightmostFromTree(node.left, null);
			replacement.copyTreeConnections(node);
			replacement.updateTreeMax();
		}

		node.resetTreeConnections();

		this._reParent(parent, node, replacement);
	}


	_removeRightmostFromTree(node, parent) {

		var rightmostNode;

		if (node.right) {
			rightmostNode = this._removeRightmostFromTree(node.right, node);

		} else {
			console.assert(parent);
			parent.right = node.left;
			return node;
		}

		if (node.treeMax === rightmostNode.max)
			node.updateTreeMax();

		return rightmostNode;
	}


	_reParent(parent, prevNode, replacement) {

		if (!parent) {
			this.root = replacement;

		} else if (prevNode === parent.left) {
			parent.left = replacement;

		} else {
			console.assert(prevNode === parent.right);
			parent.right = replacement;
		}
	}


	// Return removed duplicate node if found. Update .treeMax
	_removeDuplicate(dupContainer, nodeToRemove, parent) {

		console.assert(dupContainer.min === nodeToRemove.min);
		console.assert(dupContainer.data.length >= 2);

		var removedNode;

		for (let i = 0; i < dupContainer.data.length; i++)

			if (dupContainer.data[i].data === nodeToRemove.data) {
				removedNode = dupContainer.data[i];
				dupContainer.data.splice(i, 1);
				break;
			}

		if (removedNode) {
			this._updateDupContainerMaxOnRemove(dupContainer, removedNode);

			if (dupContainer.data.length === 1)
				this._removeDupContainer(dupContainer, parent);
		}

		return removedNode;
	}


	_updateDupContainerMaxOnRemove(dupContainer, removedNode) {

		if (dupContainer.max === removedNode.max) {

			dupContainer.max = dupContainer.data
					.reduce((max, node) => Math.max(max, node.max), -Infinity);
			dupContainer.updateTreeMax();
		}
	}


	_removeDupContainer(dupContainer, parent) {

		var node = dupContainer.data[0];

		node.copyTreeConnections(dupContainer);
		dupContainer.resetTreeConnections();

		this._reParent(parent, dupContainer, node);
	}


	// =======================
	//
	//   DEBUG
	//
	// =======================

	_checkIT(node = this.root, min = -Infinity, max = Infinity, depth = 0,
			result = { depth: -1, avgDepth: 0, totalNodes: 0,
				minValue: Infinity, maxValue: -Infinity,
				mins: Object.create(null) }
			) {

		if (node === null)
			return result;

		if (node.min < min || node.min > max) {

			console.error(`fail 1 depth=${depth} node:`, node);
			return false;
		}

		if ( !('data' in node) ) {
			console.error(`fail 1a depth=${depth} node:`, node);
			return false;
		}

		if (node.isDupContainer()) {
		}

		if (node.min > node.max || node.max > node.treeMax) {

			console.error(`fail 2 depth=${depth} node:`, node);
			return false;
		}

		if (node.left && node.treeMax < node.left.treeMax
				|| node.right && node.treeMax < node.right.treeMax) {

			console.error(`fail 3 depth=${depth} node:`, node);
			return false;
		}

		if ( !(node.treeMax === Math.max(node.max,
				(node.left && node.left.treeMax) || -Infinity,
				(node.right && node.right.treeMax) || -Infinity)) ) {

			console.error(`fail 4 depth=${depth} node:`, node);
			return false;
		}

		result.depth = Math.max(result.depth, depth);
		result.avgDepth += depth;
		result.totalNodes ++;
		result.minValue = Math.min(result.minValue, node.min);
		result.maxValue = Math.max(result.maxValue, node.min);

		if (!node.left && node.left !== null || !node.right && node.right !== null) {

			console.error(`fail 5 depth=${depth} node:`, node);
			return false;
		}
/*
		if (result.mins[node.min]) {
			console.error(`fail 6 duplicate in tree min=${node.min} node:`, node);
			return false;
		}
		result.mins[node.min] = true;
*/

		let resultOK = this._checkIT(node.left, min, node.min, depth + 1, result)
			&& this._checkIT(node.right, node.min, max, depth + 1, result);

		if (resultOK === false)
			return false;

		if (depth === 0)
			result.avgDepth = (result.avgDepth / result.totalNodes).toFixed(1);

		return result;
	}

}


Object.assign(IntervalSGTree, {

	_tmpRemoveNode: null,
	_rebuildArray: [],
});



IntervalSGTree.Node = function(min, max, data) {

	if (typeof this == "function")
		Report.throw("call to constructor w/o 'new'");

	this.left = null;
	this.right = null;
	this.min = min;
	this.max = max;
	this.treeMax = max;
	this.data = data;
}


Object.assign(IntervalSGTree.Node.prototype, {

	//isIntervalSGTree_Node: true,

	isDupContainer() {

		//if (Array.isArray(this.data) && this.data[0]
		//		&& ("isIntervalSGTree_Node" in this.data[0].constructor.prototype) )

		if (this.data !== null && typeof this.data == "object"
				&& ("isIntervalSGTree_DupContainer" in this.data) )
			return true;
	},


	toString() {
		var dupStr = this.isDupContainer() ? ` DUP(${this.data.length})` : "";
		return `[IntervalSGTree.Node${dupStr} ${Util.toStr(this.min)}...${Util.toStr(this.max)}`
			+ ` data=${this.data}]`;
	},


	resetTreeConnections() {

		this.left = null;
		this.right = null;
		this.treeMax = this.max;
		return this;
	},


	copyTreeConnections(node) {

		this.left = node.left;
		this.right = node.right;
		this.treeMax = node.treeMax;
		return this;
	},


	updateTreeMax() {

		this.treeMax = Math.max(this.max,
			(this.left ? this.left.treeMax : -Infinity),
			(this.right ? this.right.treeMax : -Infinity)
		);
	},

});


//
//   A wrapper around Interval Tree implementation.
//
// - Stored in the tree are objects (primitives also OK)
// - min, max interval values are derived from objects with functions.
//
IntervalSGTree.Wrapper = function(minFn, maxFn) {

	if (typeof this == "function")
		Report.throw("call to constructor w/o 'new'");

	if ( !(typeof minFn == "function" && typeof maxFn == "function"))
		Report.throw("bad usage");

	this.minFn = minFn;
	this.maxFn = maxFn;
	this.iTree = new IntervalSGTree;
}


Object.assign(IntervalSGTree.Wrapper.prototype, {

	clear() { this.iTree.clear(); },

	getSize() { return this.iTree.size; },


	insert(obj) {

		var min = this.minFn(obj);

		if (this.iTree.has(min, obj))
			return Report.warn("duplicate insert attempt", `obj=${obj}`);

		this.iTree.insert(min, this.maxFn(obj), obj);
	},


	remove(obj) {

		var result = this.iTree.remove(this.minFn(obj), obj);
		if (!result)
			return Report.warn("remove: no obj", `obj=${obj}`);

		return result;
	},


	has(obj) { return this.iTree.has(this.minFn(obj), obj); },

	all() { return this.search(-Infinity, Infinity); },

	forEach(fn) { this.iTree.traverse(-Infinity, Infinity, fn) },


	search(min, max, skipObj) {

		var result = [];
		this.iTree.traverse(min, max, obj => { result.push(obj); }, skipObj);
		return result;
	},


	searchRange(range, skipObj) {

		var result = [];
		this.iTree.traverse(range.start, range.end, obj => { result.push(obj) }, skipObj);
		return result;
	},


	searchOverlapping(obj) {
		return this.search(this.minFn(obj), this.maxFn(obj), obj);
	},

	forEachOverlapping(obj, fn) {
		return this.iTree.traverse(this.minFn(obj), this.maxFn(obj), fn, obj);
	},

	traverse(min, max, fn, skipObj) {
		return this.iTree.traverse(min, max, fn, skipObj);
	},

	every(min, max, fn, skipObj) {
		return this.iTree.traverse(min, max, fn, skipObj, true);
	},

	everyOverlapping(obj, fn) {
		return this.iTree.traverse(this.minFn(obj), this.maxFn(obj), fn, obj, true);
	},

});




export { IntervalSGTree };

