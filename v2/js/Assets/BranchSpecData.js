
import { BranchSpec } from './BranchSpec.js';


BranchSpec.PositionData = {

	get(treeSpecName, id) {

		var data = this[treeSpecName].find(el => el.id === id);
		if (!data)
			Report.throw("no PositionData", `treeSpecName=${treeSpecName} id=${id}`);

		if (!Number.isFinite(data.h) || !Number.isFinite(data.a))
			Report.throw("bad PositionData", `h=${data.h} a=${data.a}`);

		return data;
	},
};


BranchSpec.LeafPolyhedron = {
};

BranchSpec.ListGreenLeaves = [ "leaf1", "leaf2" ];


BranchSpec.LeafBendFactor = {

	"leaf1-d": 0.08, // *** Default dried (BranchSpec) ***
	"leaf2-d": 0.08,
};


//
// Angle is in degrees
//
BranchSpec.PositionData.aspen1 = [

	{ id: 3, h: 1, a: -130 },
	{ id: 4, h: 1.33, a: 5 },
	{ id: 5, h: 1.66, a: 145 },
	{ id: 6, h: 2, a: -75 },
	{ id: 7, h: 2.33, a: 60 },
	{ id: 8, h: 2.66, a: -164 },
	{ id: 9, h: 3, a: -27 },
	{ id: 10, h: 3.33, a: 110 },
	{ id: 11, h: 3.66, a: -113 },
	{ id: 12, h: 4, a: 24 },
	{ id: 13, h: 4.33, a: 160 },
	{ id: 14, h: 4.66, a: -62 },
	{ id: 15, h: 5, a: 75 },
	{ id: 16, h: 5.33, a: -140 },
	{ id: 17, h: 5.66, a: -10 },
	{ id: 18, h: 6, a: 126 },
	{ id: 19, h: 6.33, a: -97 },
];


BranchSpec.PositionData.aspen2 = [

	{ id: 4, h: 1.4, a: 105 }, // below hole (-180; 1.65..2)
	{ id: "4a", h: 1.55, a: 47 },
	{ id: 5, h: 1.75, a: -97 },

	{ id: 6, h: 2.12, a: 170 },
	{ id: 7, h: 2.4, a: -60 },
	{ id: 8, h: 2.6, a: 85 },
	//{ id: "8a", h: 3.08, a: 95 },
	{ id: "8a", h: 2.9, a: 120 },
	{ id: "8b", h: 2.85, a: 147 },
	{ id: 9, h: 3.1, a: -145 },
	{ id: "9a", h: 3.22, a: -75 },

	{ id: 10, h: 3.4, a: -5 },
	{ id: "10a", h: 3.5, a: 162 },
	{ id: 11, h: 3.77, a: 130 },
	{ id: 12, h: 4.15, a: -90 },
	{ id: 13, h: 4.5, a: 45 },

	{ id: 14, h: 4.7, a: 175 },
	{ id: 15, h: 5, a: 55 },
	{ id: 16, h: 5.4, a: -100 },

	{ id: 17, h: 5.7, a: 140 },
	{ id: 18, h: 6.3, a: 0 },
	{ id: 19, h: 6.45, a: 125 },
	{ id: 20, h: 6.55, a: -115 },
];

BranchSpec.PositionData.aspen21 = BranchSpec.PositionData.aspen2;

BranchSpec.PositionData.aspen22 = BranchSpec.PositionData.aspen2;


BranchSpec.PositionData.aspen3 = [

	{ id: 6, h: 1.95, a: -177 },
	{ id: 7, h: 2.18, a: -57 },
	{ id: 8, h: 2.4, a: 65 },

	{ id: 9, h: 2.7, a: -145 },
	{ id: 10, h: 3.05, a: -5 }, // 31h5

	{ id: 11, h: 3.35, a: 130 },
	{ id: 12, h: 3.65, a: -90 },
	{ id: 13, h: 4.0, a: 45 },
	{ id: "13a", h: 4.25, a: -125 },
	{ id: 14, h: 4.47, a: 130 },
	{ id: "14a", h: 4.57, a: -55 },
	{ id: 15, h: 4.84, a: -15 },
	{ id: 16, h: 5.2, a: -150 }, // 31h7

	{ id: 17, h: 5.5, a: 70 },
	{ id: 18, h: 5.75, a: -70 },
	{ id: 19, h: 6.08, a: 160 },
	{ id: 20, h: 6.47, a: 20 }, // 31h9
];

BranchSpec.PositionData.aspen31 = BranchSpec.PositionData.aspen3;


BranchSpec.PositionData.aspen4 = [

	{ id: 5, h: 1.75, a: -145 },
	{ id: 6, h: 2.05, a: 87 },
	{ id: "6a", h: 2.17, a: -10 },
	{ id: 7, h: 2.3, a: -109 },
	{ id: 8, h: 2.5, a: 179 },

	{ id: 9, h: 2.9, a: 30 },
	{ id: 10, h: 3.15, a: -125 },
	{ id: 11, h: 3.4, a: 130 },

	{ id: 12, h: 3.6, a: 10 },
	{ id: 13, h: 4.0, a: -140 },
	{ id: 14, h: 4.35, a: 80 },

	{ id: 15, h: 4.65, a: 120 },
	{ id: 16, h: 5.0, a: -15 },
	{ id: 17, h: 5.4, a: -150 },

	{ id: 18, h: 5.7, a: 70 },
	{ id: 19, h: 6.1, a: -70 },
	{ id: 20, h: 6.45, a: 160 },
];


// =========================================================================
//
// BranchSpec.byName.aspen["1h5"].getPolyhedron().auxData.bBData.forEach((bBD,i) => console.log(i,(bBD.radius * 2).toFixed(3)))
// for (let i=0; i < 20; i++) { console.log(i, (i*0.4).toFixed(1), (i*137 % 360)-180) }
//
BranchSpec.Data = {};

BranchSpec.Data.aspen = {

	default: {
		leavesAll: { replace: "leaf2" },
//		leavesAll: { replace: "leaf1-d" },
	},

		//leavesAll: { replace: "leaf2-d" },
		//leaves: [
		//	{},
		//	{ replace: "" },
		//],

	"b71-t": {
	},

	"b71-1": {
	},

	"b71-1-d1": {
		objName: "b71-1",
		bendFactor: 0.3,
		leavesAll: { replace: "leaf1-d" },
	},

	"b71-1-d4": {
		bendFactor: 0.15,
	},

	"b71-2": {
		leaves: [ {}, {}, { replace: "leaf1-d" } ],
	},

	"b71-d1": {
		objName: "b71-2",
		bendFactor: 0.3,
		leavesAll: { replace: "leaf1-d" },
	},



	"b72-t": {
	},

	"b72-t-d1": {
		objName: "b72-t",
		bendFactor: 0.2,
		leavesAll: { replace: "leaf1-d" },
	},

	"b72-1": {
	},

	"b72-1-d1": {
		objName: "b72-1",
		bendFactor: 0.2,
		leavesAll: { replace: "leaf1-d" },
	},

	"b72-2": {
	},

	"b72-d2": {
		bendFactor: 0.2,
		leavesAll: { replace: "leaf1-d" },
	},



	"b52-t": {
	},

	"b52-1": {
	},

	"b52-l": {
	},

	"b52-d1": {
		objName: "b52-l",
		leaves: [ { replace: "leaf1-d" } ],
	},

	"b52-d2": {
		bendFactor: 0.2,
		leavesAll: { replace: "leaf1-d" },
	},



	"b31-t": {
		leavesAll: { scale: 0.9 },
	},

	"b31-1": {
		leavesAll: { scale: 0.9 },
	},

	"b31-2": {
		leavesAll: { scale: 0.9 },
	},

	"b31-d1": {
		objName: "b31-2",
		bendFactor: 0.3,
		leaves: [ { replace: "leaf1-d" }, { scale: 0.9 } ],
	},

	"b31-d2": {
		objName: "b31-2",
		bendFactor: 0.15,
		leavesAll: { replace: "leaf1-d" },
	},

	"b31-d3": {
		bendFactor: 0,
		leavesAll: { replace: "leaf1-d" },
	},

	"b31-d4": {
		bendFactor: 0,
	},

	"b31-d5": {
		bendFactor: 0,
	},



	"1h8-d3": {
		objName: "1h8",
		leavesAll: { scale: 1.1, replace: "leaf1-d" },
		bendStartDistance: 6.3,
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
		bendFactor: 0.15,
	},
	"1h8-d2": {
		objName: "1h8",
		leavesAll: { scale: 1.1 },
		leaves: [ { replace: "leaf1-d" }, { replace: "leaf1-d" }, {}, {}, { replace: "leaf1-d" } ],
		bendStartDistance: 6.3,
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
		bendFactor: 0.3,
	},
	"1h8-d1": {
		objName: "1h8",
		leavesAll: { scale: 1.1 },
		leaves: [ { replace: "leaf1-d" }, { replace: "leaf1-d" } ],
		bendStartDistance: 6.3,
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
	},
	"1h8": {
		leavesAll: { scale: 1.1 },
		leaves: [ {}, { replace: "leaf1-d" } ],
		bendStartDistance: 6.3,
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
	},
	"1h7": {
		leavesAll: { scale: 1.1 },
		bendStartDistance: 6.3, // from (0,0,0)
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
	},
	"1h6": {
		leavesAll: { scale: 1.1 },
		bendStartDistance: 5.3,
		split: {
			logs: { count: 4 },
			cutProps: [ { sides: 9 }, { sides: 9 } ],
		},
	},
	"1h5": {
		bendStartDistance: 4.3,
		split: {
			logs: { count: 3 },
			cutProps: [ { sides: 9 }, { sides: 9 } ],
		},
	},
	"1h4": {
		bendStartDistance: 3,
		split: { logs: { count: 2 } },
	},
	"1h3": {
		bendStartDistance: 2,
		split: { logs: { count: 1 } },
	},
	"1h2": {
		leavesAll: { scale: 0.85 },
		leaves: [ { scale: 0.6 }, { scale: 0.65 } ],
		bendStartDistance: 0.5,
		split: { cutProps: [ { sides: 4 } ] }, // choppable
	},
	"1h1": {
		leavesAll: { scale: 0.6 },
		bendStartDistance: 0.5,
		split: { cutProps: [ { sides: 4 } ] },
	},

// ================================================


	"b2-81-t": {
		leavesAll: { scale: 1.2, replace: "leaf1" },
	},
	"b2-81-t-d": {
		objName: "b2-81-t",
		leavesAll: { scale: 1.2, replace: "leaf1-d" },
		bendFactor: 0.2,
	},
	"b2-81-t-d2": {
		leavesAll: { scale: 1.2, replace: "leaf1-d" },
		bendFactor: 0.15,
	},

	"b2-81-1": { //*
		leavesAll: { scale: 1.1, replace: "leaf1" },
	},
	"b2-81-1-d": {
		objName: "b2-81-1",
		leavesAll: { scale: 1.1, replace: "leaf1-d" },
		bendFactor: 0.2,
	},
	"b2-81-1-d2": {
		leavesAll: { scale: 1.1, replace: "leaf1-d" },
		bendFactor: 0.2,
	},


	"b2-61-t": {
		objName: "b2-81-t",
		leavesAll: { replace: "leaf1" },
	},

	"b2-61-1": {
		objName: "b2-81-1",
		leavesAll: { replace: "leaf1" },
	},

	"b2-61-2": { //*
		leavesAll: { replace: "leaf1" },
	},
	"b2-61-2-d05": { //*
		objName: "b2-61-2",
		leavesAll: { replace: "leaf1" },
		leaves: [ { replace: "leaf1-d" }, {}, { replace: "leaf1-d" } ],
		bendFactor: 0.3,
	},
	"b2-61-2-d": { //*
		objName: "b2-61-2",
		leavesAll: { replace: "leaf1-d" },
		bendFactor: 0.2,
	},

	"b2-61-2s": {
		leavesAll: { scale: 0.9, replace: "leaf1" },
	},


	"b2-41-t": {
		leavesAll: { replace: "leaf1" },
	},
	"b2-41-t-d": {
		objName: "b2-41-t",
		leavesAll: { replace: "leaf1-d" },
		bendFactor: 0.2,
	},

	"b2-41-2": { //*
		leavesAll: { replace: "leaf1" },
	},
	"b2-41-d1": {
		leavesAll: { replace: "leaf1-d" },
		bendFactor: 0.2,
	},
	"b2-41-d2": {
		leavesAll: { replace: "leaf1-d" },
		bendFactor: 0.15,
	},

	"b2-ts": {
		leavesAll: { scale: 0.9, replace: "leaf1" },
	},
	"b2-ts-d": {
		objName: "b2-ts",
		leavesAll: { scale: 0.9, replace: "leaf1-d" },
		bendFactor: 0.15,
	},
	"b2-ts-d4": {
		bendFactor: 0.1,
	},
	"b2-ts-d5": {
		bendFactor: 0,
	},
	"b2-ts2": {
		leavesAll: { scale: 0.9, replace: "leaf1" },
	},


	"2h8-d2": {
		objName: "2h8",
		leavesAll: { scale: 1.2, replace: "leaf1-d" },
		bendStartDistance: 6.3,
		bendFactor: 0,
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
		bendFactor: 0.15,
	},
	"2h8-d1": {
		objName: "2h8",
		leavesAll: { scale: 1.2, replace: "leaf1" },
		leaves: [ {}, {}, { replace: "leaf1-d" }, { replace: "leaf1-d" } ],
		bendStartDistance: 6.3,
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
		bendFactor: 0.3,
	},
	"2h8": {
		leavesAll: { scale: 1.2, replace: "leaf1" },
		leaves: [ {}, {}, { replace: "leaf1-d" }, {}, { replace: "leaf2" } ],
		bendStartDistance: 6.3,
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
	},
	"2h6": {
		leavesAll: { scale: 1.1, replace: "leaf1" },
		bendStartDistance: 4.3,
		split: {
			logs: { count: 3 },
			cutProps: [ { sides: 9 }, { sides: 9 } ],
		},
	},
	"2h4": {
		leavesAll: { replace: "leaf1" },
		bendStartDistance: 2.2,
		split: { logs: { count: 1 } },
	},
	"2h2": {
		leavesAll: { scale: 0.85, replace: "leaf1" },
		leaves: [ { scale: 0.67 } ],
		bendStartDistance: 0.5,
		split: {},
		bendFactor: 1, // 2-split bending length
	},
	"2h1": {
		leavesAll: { replace: "leaf1" },
		leaves: [ { scale: 0.6 }, { scale: 0.75 }, ],
		bendStartDistance: 0.5,
		split: {},
		bendFactor: 1,
	},



	"21h8-d2": {
		objName: "21h8",
		leavesAll: { scale: 1.1, replace: "leaf1-d" },
		bendStartDistance: 5.8,
		split: {
			logs: { count: 5 },
			cutProps: [
				{ sides: 9 },
				{ sides: 9, concaveCut: true },
				{ sides: 9, concaveCut: true },
				{ sides: 9 },
			],
		},
	},
	"21h8-d1": {
		objName: "21h8",
		leavesAll: { scale: 1.1, replace: "leaf1" },
		leaves: [ {}, { replace: "leaf1-d" }, { replace: "leaf1-d" }, {}, { replace: "leaf1-d" } ],
		bendStartDistance: 5.8,
		split: {
			logs: { count: 5 },
			cutProps: [
				{ sides: 9 },
				{ sides: 9, concaveCut: true },
				{ sides: 9, concaveCut: true },
				{ sides: 9 },
			],
		},
	},
	"21h8": {
		leavesAll: { scale: 1.1, replace: "leaf1" },
		leaves: [ {}, {}, { replace: "leaf1-d" } ],
		bendStartDistance: 5.8,
		split: {
			logs: { count: 5 },
			cutProps: [
				{ sides: 9 },
				{ sides: 9, concaveCut: true },
				{ sides: 9, concaveCut: true },
				{ sides: 9 },
			],
		},
	},
	"21h6": {
		leavesAll: { scale: 1.05, replace: "leaf1" },
		bendStartDistance: 4.2,
		split: {
			logs: { count: 3 },
			cutProps: [
				{ sides: 9 },
				{ sides: 9, concaveCut: true },
				{ concaveCut: true },
			],
		},
	},



	"22h8-d2": {
		objName: "22h8",
		leavesAll: { scale: 1.1, replace: "leaf1-d" },
		bendStartDistance: 5.8,
		bendFactor: 0,
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
		bendFactor: 0.15,
	},
	"22h8-d1": {
		objName: "22h8",
		leavesAll: { scale: 1.1, replace: "leaf1" },
		leaves: [ {}, { replace: "leaf1-d" }, { replace: "leaf1-d" } ],
		bendStartDistance: 5.8,
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
		bendFactor: 0.3,
	},
	"22h8": {
		leavesAll: { scale: 1.1, replace: "leaf1" },
		leaves: [ {}, {}, { replace: "leaf1-d" } ],
		bendStartDistance: 5.8,
		split: {
			logs: { count: 5 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
	},
	"22h6": {
		leavesAll: { scale: 1.05, replace: "leaf1" },
		bendStartDistance: 4.2,
		split: {
			logs: { count: 3 },
			cutProps: [ { sides: 9 }, { sides: 9 } ],
		},
	},
	"22h4": {
		leavesAll: { replace: "leaf1" },
		bendStartDistance: 2.2,
		split: { logs: { count: 1 } },
	},



// ================================================

	"b3-t": {
		leavesAll: { replace: "leaf1" },
	},
	"b3-t-d": {
		objName: "b3-t",
		leavesAll: { replace: "leaf1-d" },
		bendFactor: 0.2,
	},
	"b3-tb": {
		leavesAll: { scale: 1.05, replace: "leaf1" },
	},


	"3h9-d2": {
		objName: "3h9",
		leavesAll: { scale: 1.1, replace: "leaf1-d" },
		bendStartDistance: 6.5,
		split: {
			logs: { count: 6 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
		bendFactor: 0.15,
	},
	"3h9-d1": {
		objName: "3h9",
		leavesAll: { scale: 1.1, replace: "leaf1" },
		leaves: [ {}, { replace: "leaf1-d" }, {}, { replace: "leaf1-d" } ],
		bendStartDistance: 6.5,
		split: {
			logs: { count: 6 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
		bendFactor: 0.3,
	},
	"3h9": {
		leavesAll: { scale: 1.1, replace: "leaf1" },
		bendStartDistance: 6.5,
		split: {
			logs: { count: 6 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
	},
	"3h7": {
		leavesAll: { scale: 1.1, replace: "leaf1" },
		bendStartDistance: 4.5,
		split: {
			logs: { count: 4 },
			cutProps: [ { sides: 9 }, { sides: 9 } ],
		},
	},
	"3h5": {
		leavesAll: { replace: "leaf1" },
		bendStartDistance: 2.5,
		split: {
			logs: { count: 2 },
			cutProps: [ { concaveCut: true } ],
		},
	},
	"3h3": {
		leavesAll: { replace: "leaf1", scale: 0.85 },
		leaves: [ { scale: 0.65 }, { scale: 0.65 } ],
		bendStartDistance: 0.5,
		split: {},
	},
	"3h2": {
		leavesAll: { scale: 0.65, replace: "leaf1" },
		leaves: [ {}, {}, {}, { scale: 0.7 }, { scale: 0.8 } ],
		bendStartDistance: 0.5,
		split: {},
		bendFactor: 1,
	},
	"3h1": {
		leavesAll: { scale: 0.6, replace: "leaf1" },
		leaves: [ {}, {}, { scale: 0.75 }, ],
		bendStartDistance: 0.5,
		split: {},
		bendFactor: 1,
	},



	"31h9-d2": {
		objName: "31h9",
		leavesAll: { scale: 1.1, replace: "leaf1-d" },
		bendStartDistance: 6.5,
		split: {
			logs: { count: 6 },
			cutProps: [
				{ sides: 9, concaveCut: true },
				{ sides: 9, concaveCut: true },
				{ sides: 9 },
				{ sides: 9 },
			],
		},
		bendFactor: 0.15,
	},
	"31h9-d1": {
		objName: "31h9",
		leavesAll: { scale: 1.1, replace: "leaf1" },
		leaves: [ { replace: "leaf1-d" }, {}, {}, { replace: "leaf1-d" }, { replace: "leaf1-d" } ],
		bendStartDistance: 6.5,
		split: {
			logs: { count: 6 },
			cutProps: [
				{ sides: 9, concaveCut: true },
				{ sides: 9, concaveCut: true },
				{ sides: 9 },
				{ sides: 9 },
			],
		},
		bendFactor: 0.3,
	},
	"31h9": {
		leavesAll: { scale: 1.1, replace: "leaf1" },
		bendStartDistance: 6.5,
		split: {
			logs: { count: 6 },
			cutProps: [
				{ sides: 9, concaveCut: true },
				{ sides: 9, concaveCut: true },
				{ sides: 9 },
				{ sides: 9 },
			],
		},
	},
	"31h7": {
		leavesAll: { scale: 1.1, replace: "leaf1" },
		bendStartDistance: 5.22,
		split: {
			logs: { count: 4 },
			cutProps: [
				{ sides: 9, concaveCut: true },
				{ sides: 9, concaveCut: true },
			],
		},
	},
	"31h5": {
		leavesAll: { replace: "leaf1" },
		bendStartDistance: 3.1,
		split: {
			logs: { count: 2 },
			cutProps: [
				{ concaveCut: true },
				{ concaveCut: true },
			],
		},
		bendFactor: 1, // 2-segment bend
	},


// ================================================

	"b4-t": {
		leavesAll: { replace: "leaf1" },
	},
	"b4-t-d": {
		objName: "b4-t",
		leavesAll: { replace: "leaf1-d" },
		bendFactor: 0.2,
	},

	"b4-2": {
		leavesAll: { replace: "leaf1" },
	},
	"b4-2-d05": {
		objName: "b4-2",
		leaves: [ { replace: "leaf1-d" }, { replace: "leaf1-d" }, { replace: "leaf1" } ],
		bendFactor: 0.2,
	},
	"b4-2-d": {
		objName: "b4-2",
		leavesAll: { replace: "leaf1-d" },
		bendFactor: 0.2,
	},


	"4h9-d2": {
		objName: "4h9",
		leavesAll: { scale: 1.1, replace: "leaf1-d" },
		bendStartDistance: 6.4,
		split: {
			logs: { count: 6 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
		bendFactor: 0.15,
	},
	"4h9-d1": {
		objName: "4h9",
		leavesAll: { scale: 1.1, replace: "leaf1" },
		leaves: [ { replace: "leaf1-d" }, {}, { replace: "leaf1-d" }, { replace: "leaf1-d" } ],
		bendStartDistance: 6.4,
		split: {
			logs: { count: 6 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
		bendFactor: 0.35,
	},
	"4h9": {
		leavesAll: { scale: 1.1, replace: "leaf1" },
		leaves: [ {}, {}, { replace: "leaf1-d" }, ],
		bendStartDistance: 6.4,
		split: {
			logs: { count: 6 },
			cutProps: [ { sides: 9 }, { sides: 9 }, { sides: 9 }, { sides: 9 } ],
		},
	},
	"4h7": {
		leavesAll: { scale: 1.1, replace: "leaf1" },
		bendStartDistance: 4.4,
		split: {
			logs: { count: 4 },
			cutProps: [ { sides: 9 }, { sides: 9 } ],
		},
	},
	"4h5": {
		leavesAll: { replace: "leaf1" },
		bendStartDistance: 2.4,
		split: { logs: { count: 2 } },
	},
	"4h3": {
		leavesAll: { replace: "leaf1" },
		leaves: [ { scale: 0.7 }, { scale: 0.7 }, { scale: 0.75 } ],
		bendStartDistance: 1,
		split: {},
	},
	"4h1": {
		leavesAll: { scale: 0.6, replace: "leaf1" },
		leaves: [ {}, {}, {}, {}, {}, { scale: 0.8 } ],
		bendStartDistance: 0.5,
		split: {},
	},

};




